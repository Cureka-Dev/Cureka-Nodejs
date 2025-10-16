import express from "express";
const router = express.Router();

import { 
  approveRejectComment, 
  listApprovedComment, 
  listUserComments,
  addComment
} from "../controllers/blogComment.js";

import jwtMiddleware from "../middlewares/jwtMiddleware.js";
import { userType } from "../utils/constants.js";

// Blog Comment Routes
router.get("/listUserComments", jwtMiddleware([userType.USER, userType.ADMIN]), listUserComments);
router.post("/approveRejectComment", jwtMiddleware([userType.ADMIN]), approveRejectComment);
router.get("/listApprovedComments", jwtMiddleware([userType.USER, userType.ADMIN]), listApprovedComment);
router.post("/addComment", jwtMiddleware([userType.ADMIN]), addComment);
export default router;
