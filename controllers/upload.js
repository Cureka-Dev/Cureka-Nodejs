// routes/upload.js

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multerS3 from 'multer-s3';           // Import multer-s3 for S3 integration with multer
import multer from 'multer';  
import s3 from '../utils/s3.util.js'; 
// Get __filename equivalent
const __filename = fileURLToPath(import.meta.url);

// Get __dirname equivalent
const __dirname = path.dirname(__filename); // Correct usage of path.dirname

// Define the file path
const filePath = path.join(__dirname, '../thumbnails/thumbnails.png'); // Replace with your file name

// import { createCustomError } from "../errors/custom-error.js";
import asyncWrapper from "../middlewares/asyncWrapper.js";
import logger from "../middlewares/logger.js";
//import upload from "../middlewares/upload.js";
import os from 'os';

//import { generateThumbnail } from "../middlewares/upload.js"
//const hostname = os.hostname();
const allowedMimeTypes = ["image/webp"]; // ✅ Only allow webp

const MAX_FILE_SIZE = 50 * 1024; // 50 KB

// ✅ Multer-S3 Storage Configuration with File Size Limit
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    acl: "public-read",
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const folder = process.env.FOLDER_NAME || "uploads";
      const filename = `${folder}/${Date.now()}-${file.originalname}`;
      cb(null, filename);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    cb(null, true); // Let all files pass, we'll handle size errors in error handler
  },
});

export const uploadFiles = asyncWrapper(async (req, res, next) => {
  upload.array("file")(req, res, async (err) => {
    if (err) {
      // Handle Multer file size error
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: `File size should not exceed ${MAX_FILE_SIZE / 1024} KB`,
        });
      }
      return res.status(400).json({ message: err.message });
    }

    if (!req.files || !req.files.length) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    // Optional: Clean up file info
    const files = req.files.map((file) => ({
      fileUrl: file.location,
      key: file.key,
      createdAt: new Date(),
    }));

    res.status(200).json({
      message: "File uploaded successfully!",
            fileUrl: req.files[0].location,
    });
  });
});
export const uploadAudio = asyncWrapper(
  async (req, res, next) => {
    //logger.error("req",req);
    //console.log("req.files",req);
    // export const uploadImage = (req, res) => {
    upload.array('audio')(req, res, async (err) => {
      logger.error("req", err);
      if (err) {
        return res.status(400).json({ message: err.message });
      }

      let hostname = getLocalIPAddress();
      //.log(`Hostname: ${hostname}`);
      let foundTask;
      for (let i = 0; i < req.files.length; i++) {
        req.files[i].imagePath = req.files[i].location;
        req.files[i].createdAt = new Date();
        delete req.files[i].bucket;
        delete req.files[i].acl;
        delete req.files[i].storageClass;
        delete req.files[i].location;
        delete req.files[i].contentDisposition;
        delete req.files[i].contentEncoding;
        delete req.files[i].serverSideEncryption;
        delete req.files[i].etag;
        let name;
        //console.log("foundTask", foundTask);
        if (req.query.name === "record") {
          //console.log("1");
          // Find the highest `recordX` number and increment it
          const latestRecord = await audio.findOne({ name: /^record\d*$/ }).sort({ name: -1 });
          let recordNumber = latestRecord ? parseInt(latestRecord.name.replace("record", "")) + 1 : 1;
          name = `record${recordNumber}`;
          //console.log("name",name);
        } else {
          name = req.query.name;
        }
        foundTask = await audio.findOne({ name });
        if (foundTask == null) {
          let data = {
            audioPath: req.files[i].imagePath,
            name: name
          }
          //console.log("data",req.files[i].location);
          const newAudio = await audio.create(data);
          req.files[i].audioId = newAudio._id;
        }

      }
      if (foundTask && req.query.name != "record") {
        res.status(400).json({
          message: 'this name already existed!',
          //file: req.files,
        });
      }
      else {
        res.status(200).json({
          message: 'Audio uploaded successfully!',
          file: req.files,
        });
      }


    })
    //};
  }
);
// Function to get the local IP address
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const iface in interfaces) {
    for (const alias of interfaces[iface]) {
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return '0.0.0.0';
}



export default uploadFiles;
