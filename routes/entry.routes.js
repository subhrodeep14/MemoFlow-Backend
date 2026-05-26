"use strict";

const express =
  require("express");

const router =
  express.Router();

const {
  /*
  IMPORTANT
  NEW CLOUDINARY MULTER
  */
  upload,

  createEntry,

  getEntries,

  searchCompanies,

  getEntriesByDate,

  searchEntries,

  getAvailableSlNumbers,

  uploadEntryFile,

  deleteEntryFile,
} = require(
  "../controllers/entry.controller"
);

const {
  authenticate,

  allowRoles,
} = require(
  "../middleware/auth.middleware"
);

const {
  uploadRateLimiter,
} = require(
  "../middleware/rateLimiter"
);

/*
──────────────────────────────────────
PROTECTED
──────────────────────────────────────
*/

router.use(
  authenticate
);

/*
──────────────────────────────────────
CREATE ENTRY
──────────────────────────────────────
*/

router.post(
  "/create",

  uploadRateLimiter,

  allowRoles(
    "SUPER_ADMIN",
    "ADMIN",
    "EMPLOYEE"
  ),

  createEntry
);

/*
──────────────────────────────────────
GET ENTRIES
──────────────────────────────────────
*/

router.get(
  "/",

  allowRoles(
    "SUPER_ADMIN",
    "ADMIN",
    "EMPLOYEE"
  ),

  getEntries
);

/*
──────────────────────────────────────
SEARCH ENTRIES
──────────────────────────────────────
*/

router.get(
  "/search",

  allowRoles(
    "SUPER_ADMIN",
    "ADMIN",
    "EMPLOYEE"
  ),

  searchEntries
);

/*
──────────────────────────────────────
GET ENTRIES BY DATE
──────────────────────────────────────
*/

router.get(
  "/by-date",

  allowRoles(
    "SUPER_ADMIN",
    "ADMIN",
    "EMPLOYEE"
  ),

  getEntriesByDate
);

/*
──────────────────────────────────────
AVAILABLE SL NUMBERS
──────────────────────────────────────
*/

router.get(
  "/sl-numbers",

  allowRoles(
    "SUPER_ADMIN",
    "ADMIN",
    "EMPLOYEE"
  ),

  getAvailableSlNumbers
);

/*
──────────────────────────────────────
SEARCH COMPANIES
──────────────────────────────────────
*/

router.get(
  "/companies/search",

  allowRoles(
    "SUPER_ADMIN",
    "ADMIN",
    "EMPLOYEE"
  ),

  searchCompanies
);

/*
──────────────────────────────────────
UPLOAD FILE
IMPORTANT:
NOW USING CLOUDINARY
UPLOAD MIDDLEWARE
FROM entry.controller.js
──────────────────────────────────────
*/

router.post(
  "/upload-file/:id",

  uploadRateLimiter,

  allowRoles(
    "SUPER_ADMIN",
    "ADMIN",
    "EMPLOYEE"
  ),

  upload.single(
    "file"
  ),

  uploadEntryFile
);

/*
──────────────────────────────────────
DELETE FILE
──────────────────────────────────────
*/

router.delete(
  "/delete-file/:id",

  allowRoles(
    "SUPER_ADMIN"
  ),

  deleteEntryFile
);

module.exports =
  router;