const prisma =
  require(
    "../config/prisma"
  );

/*
──────────────────────────────────────
PREDEFINED PURPOSE CODES
──────────────────────────────────────
*/

const PURPOSE_MAP = {
  INVOICE: "INV",

  PAYMENT: "PAY",

  APPROVAL: "APR",

  TENDER: "TND",

  SALARY: "SAL",

  DOCUMENT: "DOC",

  SUBMISSION: "SUB",

  BID: "BID",

  TEST: "TES",

  WORK: "WRK",
};

/*
──────────────────────────────────────
SMART PURPOSE CODE
──────────────────────────────────────
*/

async function generatePurposeCode(
  purpose
) {
  try {
    if (!purpose)
      return "PUR";

    /*
    CLEAN
    */

    const clean =
      purpose
        .trim()
        .toUpperCase();

    /*
    PREDEFINED MAP
    */

    let baseCode = "";

    for (const key of Object.keys(
      PURPOSE_MAP
    )) {
      if (
        clean.includes(key)
      ) {
        baseCode =
          PURPOSE_MAP[key];

        break;
      }
    }

    /*
    DYNAMIC GENERATION
    */

    if (!baseCode) {
      const words =
        clean
          .replace(
            /[^A-Z0-9\s]/g,
            ""
          )
          .split(" ")
          .filter(Boolean);

      /*
      SINGLE WORD
      */

      if (
        words.length === 1
      ) {
        baseCode =
          words[0]
            .slice(0, 3)
            .padEnd(
              3,
              "X"
            );
      }

      /*
      MULTIPLE WORDS
      */

      else {
        baseCode =
          words
            .map(
              (w) => w[0]
            )
            .join("")
            .slice(0, 3);
      }
    }

    /*
    FALLBACK
    */

    if (!baseCode) {
      baseCode = "PUR";
    }

    /*
    UNIQUE CHECK
    */

    let finalCode =
      baseCode;

    let counter = 1;

    while (true) {
      const existing =
        await prisma.purpose.findFirst(
          {
            where: {
              code:
                finalCode,
            },
          }
        );

      /*
      UNIQUE
      */

      if (!existing) {
        break;
      }

      /*
      SAME PURPOSE?
      */

      if (
        existing.name
          .toUpperCase()
          .trim() === clean
      ) {
        return existing.code;
      }

      /*
      ADD NUMBER
      */

      finalCode =
        `${baseCode}${counter}`;

      counter++;
    }

    return finalCode;
  } catch (err) {
    console.error(
      "GENERATE PURPOSE CODE ERROR:",
      err
    );

    throw err;
  }
}

module.exports =
  generatePurposeCode;