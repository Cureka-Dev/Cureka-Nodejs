import express from "express";
const router = express.Router();

import * as sellWithUsController from "../controllers/sellWithUs.js";
import jwtMiddleware from "../middlewares/jwtMiddleware.js";
import { userType } from "../utils/constants.js";

// Sell With Us
router.post(
  "/sell-request",
  jwtMiddleware([userType.USER]),
  sellWithUsController.createSellRequest
);

router.get(
  "/getAllSellRequests",
  jwtMiddleware([userType.ADMIN]),
  sellWithUsController.getAll
);

export default router;
