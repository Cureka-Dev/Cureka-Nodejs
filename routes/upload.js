import { Router } from "express";
import jwtMiddleware from "../middlewares/jwtMiddleware.js";
import { userType } from "../utils/constants.js";
import multer from 'multer';
const upload = multer({ dest: '../uploads/' })
import {uploadFiles,uploadAudio} from "../controllers/upload.js";
const router = Router();
router.post('/uploadFile', jwtMiddleware([userType.USER, userType.ADMIN]),uploadFiles);
router.post('/uploadAudio',jwtMiddleware(), uploadAudio);
// router.post('/uploadFiles', upload.single('file'), function (req, res, next) {
//     //console.log("file",req);
//     // req.file is the `avatar` file
//     // req.body will hold the text fields, if there were any
//   })
export default router;

