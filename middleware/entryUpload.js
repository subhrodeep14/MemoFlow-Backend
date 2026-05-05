// src/middleware/entryUpload.js

const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

// 🔥 Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🔥 Cloudinary storage (NO local disk)
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "entry-files",
    resource_type: "auto",
    public_id: (req, file) => `entry-${Date.now()}`,
  },
});

// 🔥 multer upload
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = upload;