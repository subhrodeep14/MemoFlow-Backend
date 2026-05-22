const express =
  require("express");

const router =
  express.Router();

const {
  generateAuthUrl,
  saveToken,
} = require(
  "../config/googleDrive"
);

/*
AUTH START
*/

router.get(
  "/google",
  async (
    req,
    res
  ) => {

    await generateAuthUrl();

    res.send(
      "Google auth started. Check browser."
    );
  }
);

/*
CALLBACK
*/

router.get(
  "/google/callback",
  async (
    req,
    res
  ) => {

    try {

      const {
        code,
      } = req.query;

      await saveToken(
        code
      );

      res.send(
        "Google Drive connected successfully"
      );

    } catch (err) {

      console.log(err);

      res.status(500).send(
        "Auth failed"
      );
    }
  }
);

module.exports =
  router;