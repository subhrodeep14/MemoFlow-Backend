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
  "LIMITED",
  "LTD",
  "THE",
  "AND",
  "BRANCH",
];

/*
──────────────────────────────────────
CLEAN WORDS
──────────────────────────────────────
*/

function cleanWords(name) {
  return name
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
}

/*
──────────────────────────────────────
COMPANY CODE
──────────────────────────────────────
EXAMPLES:

District Health Public Engineering
→ DHPE

South Bengal Irrigation
→ SBIR

Public Works Department
→ PWD

Test
→ TEST
──────────────────────────────────────
*/

async function generateCompanyCode(
  companyName
) {
  try {
    if (!companyName)
      return "";

    /*
    CLEAN WORDS
    */

    const words =
      cleanWords(
        companyName
      );

    if (
      words.length === 0
    ) {
      return "COMP";
    }

    /*
    BASE CODE
    */

    let baseCode = "";

    /*
    SINGLE WORD
    */

    if (
      words.length === 1
    ) {
      baseCode =
        words[0].slice(
          0,
          4
        );
    }

    /*
    MULTIPLE WORDS
    */

    else {
      baseCode = words
        .map((w) => w[0])
        .join("")
        .slice(0, 4);
    }

    /*
    FALLBACK
    */

    if (!baseCode) {
      baseCode = "COMP";
    }

    /*
    UNIQUE CHECK
    */

    let finalCode =
      baseCode;

    let counter = 0;

    while (true) {
      const existing =
        await prisma.company.findFirst(
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
      LAST WORD
      */

      const lastWord =
        words[
          words.length -
            1
        ] || "";

      /*
      EXTRA LETTER
      */

      const extraLetter =
        lastWord[
          counter + 1
        ];

      /*
      NO LETTER LEFT
      */

      if (
        !extraLetter
      ) {
        finalCode =
          `${baseCode}${counter + 1}`;
      }

      /*
      ADD LETTER
      */

      else {
        finalCode =
          `${baseCode}${extraLetter}`;
      }

      counter++;
    }

    return finalCode;
  } catch (err) {
    console.error(
      "GENERATE COMPANY CODE ERROR:",
      err
    );

    throw err;
  }
}

/*
──────────────────────────────────────
PURPOSE CODE
──────────────────────────────────────
EXAMPLES:

Bid
→ BID

Tender Evaluation
→ TE

Technical Evaluation System
→ TES
──────────────────────────────────────
*/

async function generatePurposeCode(
  purposeName
) {
  try {
    if (!purposeName)
      return "";

    /*
    CLEAN WORDS
    */

    const words =
      cleanWords(
        purposeName
      );

    if (
      words.length === 0
    ) {
      return "PUR";
    }

    /*
    BASE CODE
    */

    let baseCode = "";

    /*
    SINGLE WORD
    */

    if (
      words.length === 1
    ) {
      baseCode =
        words[0].slice(
          0,
          3
        );
    }

    /*
    MULTIPLE WORDS
    */

    else {
      baseCode = words
        .map((w) => w[0])
        .join("")
        .slice(0, 3);
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

    let counter = 0;

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
      LAST WORD
      */

      const lastWord =
        words[
          words.length -
            1
        ] || "";

      /*
      EXTRA LETTER
      */

      const extraLetter =
        lastWord[
          counter + 1
        ];

      /*
      NO LETTER LEFT
      */

      if (
        !extraLetter
      ) {
        finalCode =
          `${baseCode}${counter + 1}`;
      }

      /*
      ADD LETTER
      */

      else {
        finalCode =
          `${baseCode}${extraLetter}`;
      }

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

/*
──────────────────────────────────────
EXPORTS
──────────────────────────────────────
*/

module.exports = {
  generateCompanyCode,
  generatePurposeCode,
};