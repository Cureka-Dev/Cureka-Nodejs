import express from "express";
import {
  addReview,
  getAllReviews,
  getApprovedReviews,
  editReviewStatus,
  getReviewById,
} from "../controllers/reviewController.js";

const router = express.Router();
import jwtMiddleware from "../middlewares/jwtMiddleware.js";
import { userType } from "../utils/constants.js";
router.post("/add-review",jwtMiddleware([userType.USER]), addReview);
router.get("/all-reviews",jwtMiddleware([userType.USER]), getAllReviews);
router.get("/getApprovedReviews", getApprovedReviews);
router.put("/review-status",jwtMiddleware([userType.USER]), editReviewStatus);
router.get("/review",jwtMiddleware([userType.USER]), getReviewById);

export default router;
