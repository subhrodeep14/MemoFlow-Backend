// controllers/file.controller.js

const multer = require("multer");

const {
  CloudinaryStorage,
} = require(
  "multer-storage-cloudinary"
);

const cloudinary =
  require("cloudinary").v2;

const {
  isDateLocked,
} = require(
  "../utils/dateUtils"
);

const prisma =
  require(
    "../config/prisma"
  );

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
STORAGE
IMPORTANT:
PDF MUST USE image
OTHER FILES USE raw
──────────────────────────────────────
*/

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
        PDF -> image
        Others -> raw
        */

        resource_type:
          isPdf
            ? "image"
            : "raw",

        /*
        UNIQUE FILE NAME
        */

        public_id:
          `entry-${Date.now()}`,

        /*
        PRESERVE PDF FORMAT
        */

        format:
          isPdf
            ? "pdf"
            : undefined,
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
      REDIRECT TO CLOUDINARY
      */

      return res.redirect(
        file.path
      );
    } catch (err) {
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
        files,
      });
    } catch (err) {
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
        const isPdf =
          file.mimeType ===
          "application/pdf";

        await cloudinary.uploader.destroy(
          `entry-files/${file.storedName}`,
          {
            /*
            PDF uploaded as image
            */

            resource_type:
              isPdf
                ? "image"
                : "raw",
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