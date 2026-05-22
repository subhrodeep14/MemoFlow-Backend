const multer =
  require("multer");

/*
MEMORY STORAGE
*/

const storage =
  multer.memoryStorage();

/*
UPLOAD
*/

const upload =
  multer({
    storage,

    limits: {
      fileSize:
        25 *
        1024 *
        1024,
    },
  });

module.exports =
  upload;