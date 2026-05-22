
const crypto =
  require("crypto");

const prisma =
  require(
    "../config/prisma"
  );

/*
──────────────────────────────────────
STOP WORDS
──────────────────────────────────────
*/

const STOP_WORDS = [
  "OF",
  "PVT",
  "PRIVATE",
  "LTD",
  "LIMITED",
  "AND",
  "THE",
  "BRANCH",
];

/*
──────────────────────────────────────
GENERATE COMPANY CODE
──────────────────────────────────────
*/

function generateCompanyCode(
  name
) {
  if (!name)
    return "";

  const words = name
    .toUpperCase()
    .replace(
      /[^A-Z0-9\s]/g,
      ""
    )
    .split(" ")
    .filter(Boolean)
    .filter(
      (w) =>
        !STOP_WORDS.includes(
          w
        )
    );

  /*
  SBI
  PNBK
  */

  let code =
    words
      .map(
        (w) => w[0]
      )
      .join("")
      .slice(0, 6);

  /*
  SHORT NAME
  */

  if (
    code.length < 3
  ) {
    code =
      name
        .replace(
          /[^A-Z0-9]/gi,
          ""
        )
        .toUpperCase()
        .slice(0, 4);
  }

  return code;
}

/*
──────────────────────────────────────
GENERATE ACCESS CODE
──────────────────────────────────────
*/

function generateCode() {
  return crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase();
}

/*
──────────────────────────────────────
CREATE COMPANY
SUPER ADMIN ONLY
──────────────────────────────────────
*/

const createCompany =
  async (
    req,
    res,
    next
  ) => {
    try {
      /*
      ONLY SUPER ADMIN
      */

      if (
        req.user
          .role !==
        "SUPER_ADMIN"
      ) {
        return res
          .status(403)
          .json({
            error:
              "Only super admin can create companies",
          });
      }

      const {
        name,
      } = req.body;

      /*
      VALIDATION
      */

      if (!name) {
        return res
          .status(400)
          .json({
            error:
              "Company name required",
          });
      }

      /*
      EXISTING
      */

      const existing =
        await prisma.company.findFirst(
          {
            where: {
              name: {
                equals:
                  name,
                mode:
                  "insensitive",
              },
            },
          }
        );

      if (
        existing
      ) {
        return res
          .status(409)
          .json({
            error:
              "Company already exists",
          });
      }

      /*
      BASE CODE
      */

      const baseCode =
        generateCompanyCode(
          name
        );

      /*
      SIMILAR
      */

      const similar =
        await prisma.company.findMany(
          {
            where: {
              code: {
                startsWith:
                  baseCode,
              },
            },

            select: {
              code: true,
            },
          }
        );

      /*
      FINAL CODE
      */

      let finalCode =
        baseCode;

      if (
        similar.length >
        0
      ) {
        finalCode = `${baseCode}${similar.length + 1}`;
      }

      /*
      ADMIN CODE
      */

      let adminCode =
        `ADM-${generateCode()}`;

      while (
        await prisma.company.findFirst(
          {
            where: {
              adminCode,
            },
          }
        )
      ) {
        adminCode =
          `ADM-${generateCode()}`;
      }

      /*
      EMPLOYEE CODE
      */

      let employeeCode =
        `EMP-${generateCode()}`;

      while (
        await prisma.company.findFirst(
          {
            where: {
              employeeCode,
            },
          }
        )
      ) {
        employeeCode =
          `EMP-${generateCode()}`;
      }

      /*
      CREATE
      */

      const company =
        await prisma.company.create(
          {
            data: {
              name,

              code:
                finalCode,

              adminCode,

              employeeCode,

              isSystemCompany: true,
            },
          }
        );

      return res.json({
        success: true,

        company,
      });
    } catch (err) {
      console.error(
        err
      );

      next(err);
    }
  };

/*
──────────────────────────────────────
GET ALL
──────────────────────────────────────
*/

const getAllCompanies =
  async (
    req,
    res,
    next
  ) => {
    try {
     const companies =
  await prisma.company.findMany({
    where: {
      isSystemCompany: true,
    },

    orderBy: {
      createdAt: "desc",
    },

    include: {
      _count: {
        select: {
          users: true,

          sentEntries: true,
        },
      },
    },
  });

      return res.json({
        companies,
      });
    } catch (err) {
      next(err);
    }
  };

/*
──────────────────────────────────────
SEARCH
──────────────────────────────────────
*/

const searchCompanies =
  async (
    req,
    res,
    next
  ) => {
    try {
      const search =
        req.query.q ||
        "";

      const companies =
        await prisma.company.findMany(
          {
            where: {
              OR: [
                {
                  name: {
                    contains:
                      search,

                    mode:
                      "insensitive",
                  },
                },

                {
                  code: {
                    contains:
                      search,

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
          }
        );

      return res.json({
        companies,
      });
    } catch (err) {
      next(err);
    }
  };

/*
──────────────────────────────────────
REGENERATE ADMIN CODE
SUPER ADMIN ONLY
──────────────────────────────────────
*/

const regenerateAdminCode =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        companyId,
      } = req.params;

      let adminCode =
        `ADM-${generateCode()}`;

      while (
        await prisma.company.findFirst(
          {
            where: {
              adminCode,
            },
          }
        )
      ) {
        adminCode =
          `ADM-${generateCode()}`;
      }

      const company =
        await prisma.company.update(
          {
            where: {
              id: companyId,
            },

            data: {
              adminCode,
            },
          }
        );

      return res.json({
        success: true,

        company,
      });
    } catch (err) {
      next(err);
    }
  };

/*
──────────────────────────────────────
REGENERATE EMPLOYEE CODE
ADMIN + SUPER ADMIN
──────────────────────────────────────
*/

const regenerateEmployeeCode =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        companyId,
      } = req.params;

      let employeeCode =
        `EMP-${generateCode()}`;

      while (
        await prisma.company.findFirst(
          {
            where: {
              employeeCode,
            },
          }
        )
      ) {
        employeeCode =
          `EMP-${generateCode()}`;
      }

      const company =
        await prisma.company.update(
          {
            where: {
              id: companyId,
            },

            data: {
              employeeCode,
            },
          }
        );

      return res.json({
        success: true,

        company,
      });
    } catch (err) {
      next(err);
    }
  };

module.exports = {
  createCompany,

  getAllCompanies,

  searchCompanies,

  regenerateAdminCode,

  regenerateEmployeeCode,
};

