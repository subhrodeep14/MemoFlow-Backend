const fs = require("fs");
const path = require("path");

const open = require("open");

const {
  google,
} = require("googleapis");

const TOKEN_PATH =
  path.join(
    __dirname,
    "../token.json"
  );

const oauth2Client =
  new google.auth.OAuth2(
    process.env
      .GOOGLE_CLIENT_ID,

    process.env
      .GOOGLE_CLIENT_SECRET,

    process.env
      .GOOGLE_REDIRECT_URI
  );

/*
──────────────────────────────────────
LOAD TOKEN
──────────────────────────────────────
*/

if (
  fs.existsSync(
    TOKEN_PATH
  )
) {
  const token =
    JSON.parse(
      fs.readFileSync(
        TOKEN_PATH
      )
    );

  oauth2Client.setCredentials(
    token
  );
}

/*
──────────────────────────────────────
GET AUTH URL
──────────────────────────────────────
*/

async function generateAuthUrl() {

  const url =
    oauth2Client.generateAuthUrl({
      access_type:
        "offline",

      scope: [
        "https://www.googleapis.com/auth/drive",
      ],
    });

  console.log(
    "\nOPEN THIS URL:\n"
  );

  console.log(url);

  await open(url);
}

/*
──────────────────────────────────────
SAVE TOKEN
──────────────────────────────────────
*/

async function saveToken(
  code
) {

  const {
    tokens,
  } =
    await oauth2Client.getToken(
      code
    );

  oauth2Client.setCredentials(
    tokens
  );

  fs.writeFileSync(
    TOKEN_PATH,
    JSON.stringify(tokens)
  );

  console.log(
    "TOKEN SAVED"
  );
}

const drive =
  google.drive({
    version: "v3",
    auth:
      oauth2Client,
  });

module.exports = {
  drive,
  generateAuthUrl,
  saveToken,
};