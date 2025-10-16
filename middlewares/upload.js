import multerS3 from 'multer-s3';           // Import multer-s3 for S3 integration with multer
import multer from 'multer';                // Import multer for handling file uploads
//import path from 'path';                    // Import path for handling file and directory paths
import s3 from '../utils/s3.util.js';       // Import custom S3 utility module
//import ffmpeg from 'fluent-ffmpeg';         // Import ffmpeg for video processing and thumbnail generation
import fs from 'fs';  
import path, { dirname } from "path";                      // Import fs for file system operations
import { PutObjectCommand } from '@aws-sdk/client-s3'; // Import AWS SDK command to upload files to S3
// Configurable size limit (in bytes)
import { fileURLToPath } from "url";
const fileSizeLimit = 5 * 1024 * 1024; // 5 MB
const otherFilesDirectoryName = "others";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const generateUniqueFilename = (originalname) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8); // Use a portion of a random string
  const sanitizedFilename = originalname.replace(/\s/g, "_").replace(/\.[^/.]+$/, ""); // Replace spaces with underscores and remove extension
  const fileExtension = originalname.split(".").pop(); // Extract the file extension

  return `${sanitizedFilename}_${timestamp}_${randomString}.${fileExtension}`;
};

// Set up Multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.query.category || otherFilesDirectoryName;
    const uploadPath = path.join(__dirname, "public", category);

    // Create the subfolder if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueFilename = generateUniqueFilename(file.originalname);
    cb(null, uniqueFilename);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: fileSizeLimit },
});


export default upload; // Export configured multer upload for use in other modules