
const jwt =
  require("jsonwebtoken");
const prisma =
  require(
    "../config/prisma"
  );

/*
──────────────────────────────────────
AUTHENTICATE
──────────────────────────────────────
*/

const authenticate =
  async (
    req,
    res,
    next
  ) => {
    try {
      /*
      TOKEN
      */

      const token =
        req.cookies
          ?.authToken ||
        req.headers.authorization?.replace(
          "Bearer ",
          ""
        );

      /*
      NO TOKEN
      */

      if (!token) {
        return res
          .status(401)
          .json({
            error:
              "Authentication required",
          });
      }

      /*
      VERIFY
      */

      const decoded =
        jwt.verify(
          token,
          process.env
            .JWT_SECRET
        );

      /*
      SUPER ADMIN
      FROM ENV
      */

      if (
        decoded.userId ===
        "SUPER_ADMIN"
      ) {
        /*
        ACTIVE COMPANY
        */

     const firstCompany =
  await prisma.company.findFirst({
    orderBy: {
      name: "asc",
    },
  });

let activeCompany =
  firstCompany || null;

let activeCompanyId =
  firstCompany?.id || null;
        /*
        SWITCHED COMPANY
        */

        const switchedCompanyId =
          req.headers[
            "x-company-id"
          ];

        if (
          switchedCompanyId
        ) {
          activeCompany =
            await prisma.company.findUnique(
              {
                where: {
                  id:
                    switchedCompanyId,
                },

                select: {
                  id: true,

                  name: true,

                  code: true,

                  adminCode: true,

                  employeeCode: true,
                },
              }
            );

          if (
            activeCompany
          ) {
            activeCompanyId =
              activeCompany.id;
          }
        }

        /*
        REQUEST USER
        */

        req.user = {
          id:
            "SUPER_ADMIN",

          email:
            process.env
              .SUPER_ADMIN_EMAIL,

          role:
            "SUPER_ADMIN",

          companyId:
            null,

          company:
            null,

          activeCompanyId,

          activeCompany,
        };

        return next();
      }

      /*
      NORMAL USER
      */

      const user =
        await prisma.user.findUnique(
          {
            where: {
              id:
                decoded.userId,
            },

            include: {
              company: {
                select: {
                  id: true,

                  name: true,

                  code: true,

                  adminCode: true,

                  employeeCode: true,
                },
              },
            },
          }
        );

      /*
      USER NOT FOUND
      */

      if (!user) {
        return res
          .status(401)
          .json({
            error:
              "User not found",
          });
      }

      /*
      DEFAULT ACTIVE COMPANY
      */

      const firstCompany =
  await prisma.company.findFirst({
    orderBy: {
      name: "asc",
    },
  });

let activeCompanyId =
  firstCompany?.id;

let activeCompany =
  firstCompany;

      /*
      ADMIN CAN SWITCH
      */

    if (user.role === "ADMIN") {

  const firstCompany =
    await prisma.company.findFirst({
      orderBy: {
        name: "asc",
      },
    });

  activeCompanyId =
    firstCompany?.id ||
    user.companyId;

  activeCompany =
    firstCompany ||
    user.company;

  const switchedCompanyId =
    req.headers["x-company-id"];

  if (switchedCompanyId) {

    const switchedCompany =
      await prisma.company.findUnique({
        where: {
          id: switchedCompanyId,
        },
        select: {
          id: true,
          name: true,
          code: true,
        },
      });

    if (switchedCompany) {
      activeCompanyId =
        switchedCompany.id;

      activeCompany =
        switchedCompany;
    }
  }
}

      /*
      REQUEST USER
      */

      req.user = {
        id: user.id,

        email:
          user.email,

        role:
          user.role,

        name:
          user.name,

        /*
        ORIGINAL COMPANY
        */

        companyId:
          user.companyId,

        company:
          user.company,

        /*
        ACTIVE COMPANY
        */

        activeCompanyId,

        activeCompany,
      };

      next();
    } catch (err) {
      /*
      TOKEN EXPIRED
      */

      if (
        err.name ===
        "TokenExpiredError"
      ) {
        return res
          .status(401)
          .json({
            error:
              "Session expired",
          });
      }

      /*
      INVALID TOKEN
      */

      if (
        err.name ===
        "JsonWebTokenError"
      ) {
        return res
          .status(401)
          .json({
            error:
              "Invalid token",
          });
      }

      console.error(
        "AUTH ERROR:",
        err
      );

      next(err);
    }
  };

/*
──────────────────────────────────────
ROLE CHECK
──────────────────────────────────────
*/

const allowRoles =
  (...roles) => {
    return (
      req,
      res,
      next
    ) => {
      /*
      NO USER
      */

      if (
        !req.user
      ) {
        return res
          .status(401)
          .json({
            error:
              "Unauthorized",
          });
      }

      /*
      INVALID ROLE
      */

      if (
        !roles.includes(
          req.user.role
        )
      ) {
        return res
          .status(403)
          .json({
            error:
              "Access denied",
          });
      }

      next();
    };
  };

module.exports = {
  authenticate,

  allowRoles,
};

