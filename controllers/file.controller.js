// controllers/file.controller.js

const multer = require("multer");

const {
  CloudinaryStorage,
} = require("multer-storage-cloudinary");

const cloudinary =
  require("cloudinary").v2;

const {
  isDateLocked,
} = require("../utils/dateUtils");

const prisma =
  require("../config/prisma");

/*
──────────────────────────────────────
CLOUDINARY CONFIG
──────────────────────────────────────
*/

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

/*
──────────────────────────────────────
CLOUDINARY STORAGE
IMPORTANT:
UPLOAD BOTH PDF + IMAGES
AS "image" RESOURCE TYPE
──────────────────────────────────────
*/

const storage =
  new CloudinaryStorage({
    cloudinary,

    params: async (
      req,
      file
    ) => {
      return {
        folder:
          "entry-files",

        /*
        IMPORTANT FIX
        EVERYTHING AS image
        */

        resource_type:
          "image",

        /*
        UNIQUE FILE NAME
        */

        public_id:
          `entry-${Date.now()}`,
      };
    },
  });

/*
──────────────────────────────────────
MULTER
──────────────────────────────────────
*/

const upload = multer({
  storage,

  limits: {
    fileSize:
      10 *
      1024 *
      1024,
  },

  /*
  FILE VALIDATION
  */

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
UPLOAD FILE
──────────────────────────────────────
*/

const uploadFile =
  async (
    req,
    res,
    next
  ) => {
    try {
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
      BODY
      */

      const {
        date,
        memoId,
      } = req.body;

      /*
      DATE CHECK
      */

      if (!date) {
        return res
          .status(400)
          .json({
            error:
              "Date required",
          });
      }

      /*
      DATE OBJECT
      */

      const entryDate =
        new Date(
          `${date}T12:00:00`
        );

      /*
      LOCK CHECK
      */

      if (
        isDateLocked(
          entryDate
        )
      ) {
        return res
          .status(403)
          .json({
            error:
              "Date locked",
          });
      }

      /*
      CREATE FILE RECORD
      */

      const fileRecord =
        await prisma.file.create(
          {
            data: {
              originalName:
                req.file
                  .originalname,

              storedName:
                req.file
                  .filename ||

                req.file
                  .public_id ||

                `file-${Date.now()}`,

              mimeType:
                req.file
                  .mimetype,

              size:
                req.file
                  .size,

              /*
              CLOUDINARY URL
              */

              path:
                req.file
                  .path,

              linkedDate:
                entryDate,

              memoId:
                memoId ||
                null,
            },
          }
        );

      /*
      RESPONSE
      */

      return res
        .status(201)
        .json({
          success: true,

          file: {
            id:
              fileRecord.id,

            url:
              fileRecord.path,

            originalName:
              fileRecord.originalName,

            mimeType:
              fileRecord.mimeType,
          },
        });
    } catch (err) {
      console.log(err);

      next(err);
    }
  };

/*
──────────────────────────────────────
VIEW FILE
──────────────────────────────────────
*/

const getFile =
  async (
    req,
    res,
    next
  ) => {
    try {
      const file =
        await prisma.file.findUnique(
          {
            where: {
              id:
                req.params.id,
            },
          }
        );

      /*
      NOT FOUND
      */

      if (!file) {
        return res
          .status(404)
          .json({
            error:
              "Not found",
          });
      }

      /*
      PDF FIX
      PREVENT DOWNLOAD
      */

      let fileUrl =
        file.path;

      if (
        file.mimeType ===
        "application/pdf"
      ) {
        fileUrl =
          file.path.replace(
  "/upload/",
  "/upload/fl_inline/"
)
      }

      /*
      REDIRECT TO CLOUDINARY
      */

      return res.redirect(
        fileUrl
      );
    } catch (err) {
      console.log(err);

      next(err);
    }
  };

/*
──────────────────────────────────────
GET FILES BY DATE
──────────────────────────────────────
*/

const getFilesByDate =
  async (
    req,
    res,
    next
  ) => {
    try {
      const { date } =
        req.query;

      /*
      DATE CHECK
      */

      if (!date) {
        return res
          .status(400)
          .json({
            error:
              "Date required",
          });
      }

      /*
      START
      */

      const start =
        new Date(
          `${date}T00:00:00`
        );

      /*
      END
      */

      const end =
        new Date(
          `${date}T23:59:59`
        );

      /*
      FILES
      */

      const files =
        await prisma.file.findMany(
          {
            where: {
              linkedDate: {
                gte: start,

                lte: end,
              },
            },

            orderBy: {
              uploadedAt:
                "desc",
            },
          }
        );

      return res.json({
        success: true,

        files,
      });
    } catch (err) {
      console.log(err);

      next(err);
    }
  };

/*
──────────────────────────────────────
DELETE FILE
──────────────────────────────────────
*/

const deleteFile =
  async (
    req,
    res,
    next
  ) => {
    try {
      const file =
        await prisma.file.findUnique(
          {
            where: {
              id:
                req.params.id,
            },
          }
        );

      /*
      NOT FOUND
      */

      if (!file) {
        return res
          .status(404)
          .json({
            error:
              "Not found",
          });
      }

      /*
      DELETE FROM CLOUDINARY
      */

      if (
        file.storedName
      ) {
        await cloudinary.uploader.destroy(
          `entry-files/${file.storedName}`,
          {
            resource_type:
              "image",
          }
        );
      }

      /*
      DELETE DB RECORD
      */

      await prisma.file.delete(
        {
          where: {
            id: file.id,
          },
        }
      );

      /*
      RESPONSE
      */

      return res.json({
        success: true,

        message:
          "Deleted successfully",
      });
    } catch (err) {
      console.log(err);

      next(err);
    }
  };

module.exports = {
  upload,

  uploadFile,

  getFile,

  getFilesByDate,

  deleteFile,
};