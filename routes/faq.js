import { Router } from "express";
import {
  createFaq,
  getFaqs,
  getFaqById,
  updateFaq,
  deleteFaq,
} from "../controllers/faqController.js";
import jwtMiddleware from "../middlewares/jwtMiddleware.js";
import { userType } from "../utils/constants.js";

const router = Router();

// Create a new FAQ (Admin only)
router.post("/faq", jwtMiddleware([userType.ADMIN]), createFaq);

// Get all FAQs (Public)
router.get("/faqs", getFaqs);

// Get FAQ by ID (Public)
router.get("/faq/:id", getFaqById);

// Update FAQ (Admin only)
router.put("/faq/:id", jwtMiddleware([userType.ADMIN]), updateFaq);

// Delete FAQ (Admin only)
router.delete("/faq/:id", jwtMiddleware([userType.ADMIN]), deleteFaq);

export default router;
