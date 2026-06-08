const prisma =
  require(
    "../config/prisma"
  );

const {
  generateCompanyCode,
} = require("../utils/generateCompanyCode");

const generatePurposeCode =
  require("../utils/generatePurposeCode");
const multer = require("multer");

const {
  CloudinaryStorage,
} = require("multer-storage-cloudinary");

const cloudinary =
  require("cloudinary").v2;

cloudinary.config({
  cloud_name:
    process.env
      .CLOUDINARY_CLOUD_NAME,

  api_key:
    process.env
      .CLOUDINARY_API_KEY,

  api_secret:
    process.env
      .CLOUDINARY_API_SECRET,
});

const storage =
  new CloudinaryStorage({
    cloudinary,

    params: async (
      req,
      file
    ) => {

      const isPdf =
        file.mimetype ===
        "application/pdf";

      return {
        folder:
          "entry-files",

        /*
        IMPORTANT FIX
        */

        resource_type:
          isPdf
            ? "raw"
            : "image",

        public_id:
          `entry-${Date.now()}`,
      };
    },
  });
const upload = multer({
  storage,

  limits: {
    fileSize:
      10 *
      1024 *
      1024,
  },

  fileFilter: (
    req,
    file,
    cb
  ) => {
    const allowed =
      [
        "application/pdf",

        "image/jpeg",

        "image/png",

        "image/webp",
      ];

    if (
      !allowed.includes(
        file.mimetype
      )
    ) {
      return cb(
        new Error(
          "Invalid file type"
        ),
        false
      );
    }

    cb(null, true);
  },
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
  memoSuffix,
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

const safeDate =
  new Date(date);

if (
  isNaN(
    safeDate.getTime()
  )
) {
  return res
    .status(400)
    .json({
      error:
        "Invalid date",
    });
}

const entryYear =
  safeDate.getFullYear();
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

const senderCompanyId =
  req.user.role ===
  "EMPLOYEE"
    ? req.user.companyId
    : req.user.activeCompanyId;

if (
  !senderCompanyId
) {
  return res
    .status(400)
    .json({
      error:
        "No company selected",
    });
}

/*
SENDER COMPANY
*/

const sender =
  await prisma.company.findUnique({
    where: {
      id:
        senderCompanyId,
    },
  });
     

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
  year: entryYear,
  slNo: Number(slNo),
  senderCompanyId: sender.id,
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
  await prisma.entry.count({
    where: {
      year: entryYear,

      senderCompanyId:
        sender.id,

      receiverCompanyId:
        receiver.id,
    },
  });

      const sendCount =
        existingCount + 1;

      /*
      MEMO NUMBER

      EXAMPLE:
      03/DHPE/PNBR/TES/04
      */

     const suffix =
   memoSuffix?.trim()
    ?.toUpperCase();

const memoNumber =
  suffix
    ? `${String(slNo).padStart(3,"0")}/${sender.code}/${receiver.code}/${purposeData.code}/${suffix}/${String(sendCount).padStart(2,"0")}`
    : `${String(slNo).padStart(3,"0")}/${sender.code}/${receiver.code}/${purposeData.code}/${String(sendCount).padStart(2,"0")}`;

      /*
      SAFE DATE
      */


      /*
      CREATE ENTRY
      */

      const entry =
        await prisma.entry.create(
          {
            data: {
              year: entryYear,
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
              memoSuffix: suffix || null,

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

      const selectedYear =
        Number(
          req.query.year
        ) ||
        new Date().getFullYear();

      let where = {
        year: selectedYear,
      };
      /*
      EMPLOYEE
      */

     if (
  req.user.role ===
  "EMPLOYEE"
) {
  where = {
    ...where,

    senderCompanyId:
      req.user
        .companyId,
  };
}

else if (
  req.user
    .activeCompanyId
) {
  where = {
    ...where,

    senderCompanyId:
      req.user
        .activeCompanyId,
  };
}

      const entries =
        await prisma.entry.findMany(
          {
            where,

            orderBy: [
  {
    year: "desc",
  },
  {
    slNo: "asc",
  },
],
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
            name: {
              contains: q,
              mode: "insensitive",
            },
          },

          take: 10,
        });

     return res.json({
  companies,
});

    } catch (err) {

      console.log(err);

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

    const selectedYear =
  Number(req.query.year) ||
  new Date().getFullYear();

let where = {
  year: selectedYear,
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

      const entries =
        await prisma.entry.findMany(
          {
            where,

            take: limit,

            orderBy: [
  {
    year: "desc",
  },
  {
    slNo: "asc",
  },
],

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
      const companyId =
  req.user.role ===
  "EMPLOYEE"
    ? req.user.companyId
    : req.user.activeCompanyId;

      const selectedYear =
        Number(req.query.year) ||
        new Date().getFullYear();

      const entries =
        await prisma.entry.findMany({
          where: {
            year: selectedYear,

            senderCompanyId:
              companyId,
          },

          select: {
            slNo: true,
          },
        });

      return res.json({
        used: entries.map(
          (e) => e.slNo
        ),
      });
    } catch (err) {
      console.error(err);

      return res.status(500).json({
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
  year,
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

      /*
      FILE CHECK
      */

      if (!req.file) {
        return res
          .status(400)
          .json({
            error:
              "No file uploaded",
          });
      }

      /*
      ENTRY CHECK
      */

      const existingEntry =
        await prisma.entry.findUnique(
          {
            where: {
              id,
            },
          }
        );

      if (!existingEntry) {
        return res
          .status(404)
          .json({
            error:
              "Entry not found",
          });
      }

      /*
      PDF VIEW FIX
      */

    const fileUrl =
  req.file.path;
      

      /*
      UPDATE ENTRY
      */

      const entry =
        await prisma.entry.update(
          {
            where: {
              id,
            },

            data: {
              fileUrl:
                fileUrl,

              fileName:
                req.file
                  .originalname,

              fileMime:
                req.file
                  .mimetype,
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
            "Failed to upload file",
        });
    }
  };
/*
──────────────────────────────────────
DELETE FILE
──────────────────────────────────────
*/

const updateEntry =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const {
        slNo,
        memoNumber,
        date,
        description,
        receiverCompanyId,
        purposeId,
          memoSuffix,
      } = req.body;

      const entry =
        await prisma.entry.findUnique({
          where: { id },
        });

      if (!entry) {
        return res.status(404).json({
          error: "Entry not found",
        });
      }

      let safeDate;

      if (date) {
        safeDate =
          new Date(date);

        if (
          isNaN(
            safeDate.getTime()
          )
        ) {
          return res.status(400).json({
            error:
              "Invalid date",
          });
        }
      }

      const updated =
        await prisma.entry.update({
          where: {
            id,
          },

          data: {
            slNo:
              slNo !== undefined
                ? Number(slNo)
                : undefined,

            memoNumber:
              memoNumber ||
              undefined,

            description,

            receiverCompanyId:
              receiverCompanyId ||
              undefined,

            purposeId:
              purposeId ||
              undefined,

              memoSuffix:
              memoSuffix !== undefined
                ? memoSuffix.trim().toUpperCase() || null
                : undefined,

            date: safeDate,
          },

          include: {
            senderCompany: true,
            receiverCompany: true,
            purpose: true,
          },
        });

      return res.json({
        success: true,
        entry: updated,
      });
    } catch (err) {
      console.error(
        "UPDATE ENTRY ERROR:",
        err
      );

      return res.status(500).json({
        error:
          err.message ||
          "Failed to update entry",
      });
    }
  };


const deleteEntryFile =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const entry =
        await prisma.entry.findUnique(
          {
            where: { id },
          }
        );

      if (!entry) {
        return res
          .status(404)
          .json({
            error:
              "Entry not found",
          });
      }

      /*
      DELETE FROM CLOUDINARY
      */

      if (
        entry.fileUrl
      ) {
        try {
          const parts =
            entry.fileUrl.split(
              "/"
            );

          const fileName =
            parts[
              parts.length -
                1
            ].split(".")[0];

          await cloudinary.uploader.destroy(
            `entry-files/${fileName}`,
            {
             resource_type:
  entry.fileMime ===
  "application/pdf"
    ? "raw"
    : "image",
            }
          );
        } catch (cloudErr) {
          console.log(
            "Cloudinary delete error:",
            cloudErr
          );
        }
      }

      /*
      REMOVE FILE DATA
      */

      const updatedEntry =
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

        entry:
          updatedEntry,
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
/*
──────────────────────────────────────
GET REGISTER SETTINGS
──────────────────────────────────────
*/

const getRegisterSettings =
  async (req, res) => {
    try {
      const selectedYear =
        Number(req.query.year) ||
        new Date().getFullYear();

      let settings =
        await prisma.registerSettings.findUnique({
          where: {
            year: selectedYear,
          },
        });

      /*
      AUTO CREATE
      */

      if (!settings) {
        settings =
          await prisma.registerSettings.create({
            data: {
              year: selectedYear,
              totalRows: 100,
            },
          });
      }

      return res.json({
        year: settings.year,
        totalRows:
          settings.totalRows,
      });
    } catch (err) {
      console.error(
        "GET REGISTER SETTINGS ERROR:",
        err
      );

      return res
        .status(500)
        .json({
          error:
            "Failed to fetch register settings",
        });
    }
  };

  


  /*
──────────────────────────────────────
INCREASE REGISTER ROWS
──────────────────────────────────────
*/

const increaseRegisterRows =
  async (req, res) => {
    try {
      const selectedYear =
        Number(req.body.year);

      if (!selectedYear) {
        return res
          .status(400)
          .json({
            error:
              "Year is required",
          });
      }

      let settings =
        await prisma.registerSettings.findUnique({
          where: {
            year: selectedYear,
          },
        });

      /*
      CREATE IF NOT EXISTS
      */

      if (!settings) {
        settings =
          await prisma.registerSettings.create({
            data: {
              year: selectedYear,
              totalRows: 120,
            },
          });

        return res.json({
          success: true,
          totalRows:
            settings.totalRows,
        });
      }

      /*
      ADD 20 ROWS
      */

      settings =
        await prisma.registerSettings.update({
          where: {
            year: selectedYear,
          },

          data: {
            totalRows: {
              increment: 20,
            },
          },
        });

      return res.json({
        success: true,

        totalRows:
          settings.totalRows,
      });
    } catch (err) {
      console.error(
        "INCREASE REGISTER ROWS ERROR:",
        err
      );

      return res
        .status(500)
        .json({
          error:
            "Failed to increase rows",
        });
    }
  };

module.exports = {
  upload,

  createEntry,

  getEntries,

  getEntriesByDate,

  getAvailableSlNumbers,

  searchCompanies,

  searchEntries,
  updateEntry,
  uploadEntryFile,

  deleteEntryFile,

  getRegisterSettings,

  increaseRegisterRows,
};