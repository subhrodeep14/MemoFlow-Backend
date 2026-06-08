"use strict";

const XLSX =
  require("xlsx");

const prisma =
  require("../config/prisma");

const importRegister =
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error:
            "Excel file required",
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
        return res.status(400).json({
          error:
            "No active company selected",
        });
      }

      /*
      SENDER
      */

      const sender =
        await prisma.company.findUnique(
          {
            where: {
              id:
                senderCompanyId,
            },
          }
        );

      if (!sender) {
        return res.status(404).json({
          error:
            "Sender company not found",
        });
      }

      /*
      LEGACY COMPANY
      */

      let legacyCompany =
        await prisma.company.findFirst(
          {
            where: {
              code:
                "LEGACY",
            },
          }
        );

      if (!legacyCompany) {
        legacyCompany =
          await prisma.company.create(
            {
              data: {
                name:
                  "LEGACY IMPORT",

                code:
                  "LEGACY",

                adminCode:
                  "LEGACY_ADMIN",

                employeeCode:
                  "LEGACY_EMP",

                isSystemCompany:
                  true,
              },
            }
          );
      }

      /*
      LEGACY PURPOSE
      */

      let legacyPurpose =
        await prisma.purpose.findFirst(
          {
            where: {
              code:
                "LEG",
            },
          }
        );

      if (!legacyPurpose) {
        legacyPurpose =
          await prisma.purpose.create(
            {
              data: {
                name:
                  "LEGACY IMPORT",

                code:
                  "LEG",
              },
            }
          );
      }

      /*
      READ EXCEL
      */

      const workbook =
        XLSX.read(
          req.file.buffer,
          {
            type:
              "buffer",
          }
        );

      const worksheet =
        workbook.Sheets[
          workbook.SheetNames[0]
        ];

      const rows =
        XLSX.utils.sheet_to_json(
          worksheet,
          {
            raw: true,
          }
        );

      let imported = 0;
      let duplicates = 0;
      let failed = 0;

      /*
      LOOP
      */

      for (const row of rows) {
        try {
          const slNo =
            Number(
              row["Sl No."] ||
              row["SL No."] ||
              row["SL.NO"] ||
              row["SL NO"] ||
              row["Sl No"]
            );

          const memoNumber =
            String(
              row["Memo No."] ||
              row["Memo No"] ||
              row["Memo Number"] ||
              ""
            ).trim();

          const description =
            row["Issue Details"] ||
            row["Issue Detail"] ||
            row["Description"] ||
            "";

          const rawDate =
            row["Date"];

          /*
          REQUIRED
          */

          if (
            !slNo ||
            !memoNumber
          ) {
            failed++;
            continue;
          }

         /*
DATE
*/

let date = null;

if (
  typeof rawDate ===
  "number"
) {
  const parsed =
    XLSX.SSF.parse_date_code(
      rawDate
    );

  if (parsed) {
    date =
      new Date(
        Date.UTC(
          parsed.y,
          parsed.m - 1,
          parsed.d
        )
      );
  }
}
else if (
  rawDate
) {
  date =
    new Date(
      rawDate
    );
}

/*
INVALID DATE
*/

if (
  rawDate &&
  (
    !date ||
    isNaN(
      date.getTime()
    )
  )
) {
  console.log(
    "BAD DATE:",
    rawDate,
    memoNumber
  );

  failed++;
  continue;
}

          /*
          YEAR
          */

          const year =
  date
    ? date.getUTCFullYear()
    : null;

          /*
          DUPLICATE
          */

          const exists =
            await prisma.entry.findFirst(
              {
                where: {
                  year,

                  slNo,

                  senderCompanyId:
                    sender.id,
                },
              }
            );

          if (exists) {
            duplicates++;
            continue;
          }

          console.log({
  rawDate,
  parsedDate: date,
  year,
});

          /*
          CREATE
          */

          await prisma.entry.create({
            data: {
              year,

              slNo,

              memoNumber,

              senderCompanyId:
                sender.id,

              receiverCompanyId:
                legacyCompany.id,

              purposeId:
                legacyPurpose.id,

              sendCount: 1,

              memoSuffix:
                null,

              description,

              date,

              isLegacy:
                true,
            },
          });

          imported++;
        } catch (err) {
  console.log(
    "================================="
  );

  console.log(
    "SL:",
    slNo
  );

  console.log(
    "MEMO:",
    memoNumber
  );

  console.log(
    "DATE:",
    rawDate
  );

  console.log(
    "ERROR:",
    err.message
  );

  console.log(
    "================================="
  );

  failed++;
}
      }

      return res.json({
        success: true,

        totalRows:
          rows.length,

        imported,

        duplicates,

        failed,
      });
    } catch (err) {
      console.error(
        "IMPORT ERROR:",
        err
      );

      return res.status(500).json({
        error:
          "Failed to import register",
      });
    }
  };

module.exports = {
  importRegister,
};