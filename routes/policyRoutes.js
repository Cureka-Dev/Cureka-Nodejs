import express from "express";
const router = express.Router();

import {
  upsertPolicy,
  getPolicyBySlug
} from "../controllers/policyController.js";

import jwtMiddleware from "../middlewares/jwtMiddleware.js";
import { userType } from "../utils/constants.js";

// ✅ Create or Update Policy
router.post(
  "/policies/:policySlug",
  jwtMiddleware([userType.ADMIN]), // only admins should update policies
  upsertPolicy
);

// ✅ Get Policy by Slug
router.get(
  "/policies/:policySlug", // users and admins can read
  getPolicyBySlug
);

export default router;
