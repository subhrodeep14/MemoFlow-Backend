const prisma =
  require(
    "../config/prisma"
  );
const stream =
  require("stream");
const {
  generateCompanyCode,
} = require("../utils/generateCompanyCode");

const generatePurposeCode =
  require("../utils/generatePurposeCode");

const { google } =
  require("googleapis");
const auth =
  new google.auth.GoogleAuth({
    keyFile:
      "memoflow-497013-13f10cbb8a61.json",

    scopes: [
      "https://www.googleapis.com/auth/drive",
    ],
  });

const drive =
  google.drive({
    version: "v3",
    auth,
  });

/*
──────────────────────────────────────
HELPERS
──────────────────────────────────────
*/

/*
GET OR CREATE COMPANY
*/

async function getOrCreateCompany(
  companyName
) {
  try {
    const cleanName =
      companyName.trim();

    /*
    EXISTING
    */

    let company =
      await prisma.company.findFirst(
        {
          where: {
            name: {
              equals:
                cleanName,

              mode:
                "insensitive",
            },
          },
        }
      );

    if (company) {
      return company;
    }

    /*
    GENERATE CODE
    */

    const code =
      await generateCompanyCode(
        cleanName
      );

    /*
    RANDOM ADMIN/EMP CODES
    */

    const random =
      Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

    /*
    CREATE
    */

    company =
      await prisma.company.create(
        {
          data: {
            name:
              cleanName,

            code,

            adminCode:
              `ADM-${random}`,

            employeeCode:
              `EMP-${random}`,

            isSystemCompany: false,
          },
        }
      );

    return company;
  } catch (err) {
    console.error(
      "GET OR CREATE COMPANY ERROR:",
      err
    );

    throw err;
  }
}

/*
GET OR CREATE PURPOSE
*/

async function getOrCreatePurpose(
  purposeName
) {
  try {
    const cleanName =
      purposeName.trim();

    /*
    EXISTING
    */

    let purpose =
      await prisma.purpose.findFirst(
        {
          where: {
            name: {
              equals:
                cleanName,

              mode:
                "insensitive",
            },
          },
        }
      );

    if (purpose) {
      return purpose;
    }

    /*
    GENERATE CODE
    */

    const code =
      await generatePurposeCode(
        cleanName
      );

    /*
    CREATE
    */

    purpose =
      await prisma.purpose.create(
        {
          data: {
            name:
              cleanName,

            code,
          },
        }
      );

    return purpose;
  } catch (err) {
    console.error(
      "GET OR CREATE PURPOSE ERROR:",
      err
    );

    throw err;
  }
}

/*
──────────────────────────────────────
CREATE ENTRY
──────────────────────────────────────
*/

const createEntry =
  async (req, res) => {
    try {
      const {
        slNo,
        receiverCompany,
        purpose,
        description,
        date,
      } = req.body;

      /*
      VALIDATION
      */

      if (
        !slNo ||
        !receiverCompany ||
        !purpose ||
        !date
      ) {
        return res
          .status(400)
          .json({
            error:
              "Missing required fields",
          });
      }

      /*
      ACTIVE COMPANY
      */

      const activeCompanyId =
        req.user
          .activeCompanyId;

      if (
        !activeCompanyId
      ) {
        return res
          .status(400)
          .json({
            error:
              "No active company selected",
          });
      }

      /*
      SENDER COMPANY
      */

      const sender =
        await prisma.company.findUnique(
          {
            where: {
              id:
                activeCompanyId,
            },
          }
        );

      if (!sender) {
        return res
          .status(404)
          .json({
            error:
              "Sender company not found",
          });
      }

      /*
      SL EXISTS
      */

      const existingSl =
        await prisma.entry.findFirst(
          {
            where: {
              slNo:
                Number(slNo),

              senderCompanyId:
                sender.id,
            },
          }
        );

      if (existingSl) {
        return res
          .status(409)
          .json({
            error:
              "SL Number already exists",
          });
      }

      /*
      RECEIVER COMPANY
      */

      const receiver =
        await getOrCreateCompany(
          receiverCompany
        );

      /*
      PURPOSE
      */

      const purposeData =
        await getOrCreatePurpose(
          purpose
        );

      /*
      SEND COUNT
      HOW MANY TIMES
      SENDER SENT TO RECEIVER
      */

      const existingCount =
        await prisma.entry.count(
          {
            where: {
              senderCompanyId:
                sender.id,

              receiverCompanyId:
                receiver.id,
            },
          }
        );

      const sendCount =
        existingCount + 1;

      /*
      MEMO NUMBER

      EXAMPLE:
      03/DHPE/PNBR/TES/04
      */

      const memoNumber =
        `${String(slNo).padStart(2, "0")}/` +
        `${sender.code}/` +
        `${receiver.code}/` +
        `${purposeData.code}/` +
        `${String(sendCount).padStart(2, "0")}`;

      /*
      SAFE DATE
      */

      const [
        year,
        month,
        day,
      ] = date
        .split("-")
        .map(Number);

      const safeDate =
        new Date(
          Date.UTC(
            year,
            month - 1,
            day
          )
        );

      /*
      CREATE ENTRY
      */

      const entry =
        await prisma.entry.create(
          {
            data: {
              slNo:
                Number(slNo),

              memoNumber,

              senderCompanyId:
                sender.id,

              receiverCompanyId:
                receiver.id,

              purposeId:
                purposeData.id,

              sendCount,

              description,

              date:
                safeDate,
            },

            include: {
              senderCompany: true,

              receiverCompany: true,

              purpose: true,
            },
          }
        );

      return res.json({
        success: true,

        message:
          "Entry created successfully",

        entry,
      });
    } catch (err) {
      console.error(
        "CREATE ENTRY ERROR:",
        err
      );

      return res
        .status(500)
        .json({
          success: false,

          error:
            err.message ||
            "Failed to create entry",
        });
    }
  };

/*
──────────────────────────────────────
GET ENTRIES
──────────────────────────────────────
*/

const getEntries =
  async (req, res) => {
    try {
      let where = {};

      /*
      EMPLOYEE
      */

      if (
        req.user.role ===
        "EMPLOYEE"
      ) {
        where = {
          senderCompanyId:
            req.user
              .companyId,
        };
      }

      /*
      ADMIN / SUPER ADMIN
      */

      else if (
        req.user
          .activeCompanyId
      ) {
        where = {
          senderCompanyId:
            req.user
              .activeCompanyId,
        };
      }

      const entries =
        await prisma.entry.findMany(
          {
            where,

            orderBy: {
              createdAt:
                "desc",
            },

            include: {
              senderCompany: true,

              receiverCompany: true,

              purpose: true,
            },
          }
        );

      return res.json({
        entries,
      });
    } catch (err) {
      console.error(err);

      return res
        .status(500)
        .json({
          error:
            "Failed to fetch entries",
        });
    }
  };

/*
──────────────────────────────────────
SEARCH COMPANY
──────────────────────────────────────
*/

const searchCompanies =
  async (req, res) => {
    try {
      const q =
        req.query.q || "";

      const companies =
  await prisma.company.findMany({
    where: {
      isSystemCompany: true,

      OR: [
        {
          name: {
            contains: search,

            mode:
              "insensitive",
          },
        },

        {
          code: {
            contains: search,

            mode:
              "insensitive",
          },
        },
      ],
    },

    take: 10,

    orderBy: {
      name: "asc",
    },
  });

      return res.json({
        companies,
      });
    } catch (err) {
      console.error(err);

      return res
        .status(500)
        .json({
          error:
            "Failed to search companies",
        });
    }
  };

  /*
──────────────────────────────────────
SEARCH ENTRIES
──────────────────────────────────────
*/

const searchEntries =
  async (req, res) => {
    try {
      const limit =
        Number(
          req.query.limit
        ) || 500;

      let where = {};

      /*
      EMPLOYEE
      */

      if (
        req.user.role ===
        "EMPLOYEE"
      ) {
        where.senderCompanyId =
          req.user.companyId;
      }

      /*
      ADMIN / SUPER ADMIN
      */

      else if (
        req.user
          .activeCompanyId
      ) {
        where.senderCompanyId =
          req.user
            .activeCompanyId;
      }

      const entries =
        await prisma.entry.findMany(
          {
            where,

            take: limit,

            orderBy: {
              createdAt:
                "desc",
            },

            include: {
              senderCompany: true,

              receiverCompany: true,

              purpose: true,
            },
          }
        );

      return res.json({
        entries,
      });
    } catch (err) {
      console.error(
        "SEARCH ENTRIES ERROR:",
        err
      );

      return res
        .status(500)
        .json({
          error:
            "Failed to search entries",
        });
    }
  };

/*
──────────────────────────────────────
AVAILABLE SL
──────────────────────────────────────
*/

const getAvailableSlNumbers =
  async (req, res) => {
    try {
      const activeCompanyId =
        req.user
          .activeCompanyId;

      const entries =
        await prisma.entry.findMany(
          {
            where: {
              senderCompanyId:
                activeCompanyId,
            },

            select: {
              slNo: true,
            },
          }
        );

      return res.json({
        used:
          entries.map(
            (e) => e.slNo
          ),
      });
    } catch (err) {
      console.error(err);

      return res
        .status(500)
        .json({
          error:
            "Failed to fetch serials",
        });
    }
  };

  /*
──────────────────────────────────────
GET ENTRIES BY DATE
──────────────────────────────────────
*/

const getEntriesByDate =
  async (req, res) => {
    try {
      const { date } =
        req.query;

      if (!date) {
        return res
          .status(400)
          .json({
            error:
              "Date is required",
          });
      }

      /*
      DATE
      */

      const [
        year,
        month,
        day,
      ] = date
        .split("-")
        .map(Number);

      const targetDate =
        new Date(
          Date.UTC(
            year,
            month - 1,
            day
          )
        );

      let where = {
        date: targetDate,
      };

      /*
      EMPLOYEE
      */

      if (
        req.user.role ===
        "EMPLOYEE"
      ) {
        where.senderCompanyId =
          req.user.companyId;
      }

      /*
      ADMIN / SUPER ADMIN
      */

      else if (
        req.user
          .activeCompanyId
      ) {
        where.senderCompanyId =
          req.user
            .activeCompanyId;
      }

      /*
      FIND
      */

      const entries =
        await prisma.entry.findMany(
          {
            where,

            include: {
              senderCompany: true,

              receiverCompany: true,

              purpose: true,
            },

            orderBy: {
              slNo: "asc",
            },
          }
        );

      return res.json({
        entries,
      });
    } catch (err) {
      console.error(
        "GET ENTRIES BY DATE ERROR:",
        err
      );

      return res
        .status(500)
        .json({
          error:
            "Failed to fetch entries",
        });
    }
  };

/*
──────────────────────────────────────
UPLOAD FILE
──────────────────────────────────────
*/

const uploadEntryFile =
  async (req, res) => {
    try {

      const { id } =
        req.params;

      if (!req.file) {
        return res
          .status(400)
          .json({
            error:
              "No file uploaded",
          });
      }

      /*
      BUFFER STREAM
      */

      const bufferStream =
        new stream.PassThrough();

      bufferStream.end(
        req.file.buffer
      );

      /*
      GOOGLE DRIVE UPLOAD
      */

  const response =
  await drive.files.create({
    requestBody: {
      name:
        `${Date.now()}-${req.file.originalname}`,

      parents: [
        process.env.GOOGLE_DRIVE_FOLDER_ID,
      ],
    },

    media: {
      mimeType:
        req.file.mimetype,

      body:
        bufferStream,
    },

    supportsAllDrives: true,
  });

      /*
      FILE PUBLIC
      */

    await drive.permissions.create({
  fileId: response.data.id,

  requestBody: {
    role: "reader",
    type: "anyone",
  },
});

      /*
      PUBLIC URL
      */

      const fileUrl =
  `https://drive.google.com/file/d/${response.data.id}/view`;
      /*
      UPDATE ENTRY
      */

      const entry =
        await prisma.entry.update({
          where: { id },

          data: {
            fileUrl:
              fileUrl,

            fileName:
              req.file.originalname,

            fileMime:
              req.file.mimetype,
          },
        });

      return res.json({
        success: true,

        entry,
      });

    } catch (err) {

      console.error(err);

      return res
        .status(500)
        .json({
          error:
            "Failed to upload file",
        });
    }
  };
/*
──────────────────────────────────────
DELETE FILE
──────────────────────────────────────
*/

const deleteEntryFile =
  async (req, res) => {
    try {
      if (
        req.user.role !==
        "SUPER_ADMIN"
      ) {
        return res
          .status(403)
          .json({
            error:
              "Only super admin can delete files",
          });
      }

      const { id } =
        req.params;

      const entry =
        await prisma.entry.update(
          {
            where: { id },

            data: {
              fileUrl: null,

              fileName: null,

              fileMime: null,
            },
          }
        );

      return res.json({
        success: true,

        entry,
      });
    } catch (err) {
      console.error(err);

      return res
        .status(500)
        .json({
          error:
            "Failed to delete file",
        });
    }
  };

module.exports = {
  createEntry,

  getEntries,

  getEntriesByDate,

  getAvailableSlNumbers,

  searchCompanies,

  searchEntries,

  uploadEntryFile,

  deleteEntryFile,
};