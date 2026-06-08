const express =
  require("express");

const multer =
  require("multer");

const router =
  express.Router();

const {
  authenticate,
  allowRoles,
} = require(
  "../middleware/auth.middleware"
);

const {
  importRegister,
} = require(
  "../controllers/import.controller"
);

const upload =
  multer({
    storage:
      multer.memoryStorage(),
  });

router.post(
  "/register",
  authenticate,
  allowRoles(
    "SUPER_ADMIN",
    "ADMIN"
  ),
  upload.single("file"),
  importRegister
);

module.exports =
  router;