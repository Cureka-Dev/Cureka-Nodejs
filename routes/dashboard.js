import { Router } from "express";
import {
  dashboardCount,
  dashboardOverview
} from "../controllers/dashboardController.js";
import jwtMiddleware from "../middlewares/jwtMiddleware.js";
import { userType } from "../utils/constants.js";

const router = Router();

// Dashboard summary counts (sales, income, visitors, etc.)
router.get("/dashboard", dashboardCount);

// Dashboard overview (monthly sales, visitors, categories, brands, concerns)
router.get("/overview", dashboardOverview);

export default router;
