import { Router } from "express";
import {
  createOrFetchBrand,
  getAllBrands,
  getBrandById,
  updateBrand,
  deleteBrand
} from "../controllers/brandController.js";
import jwtMiddleware from "../middlewares/jwtMiddleware.js";

const router = Router();

// Create or fetch brand - Public or Protected based on use-case
router.post("/create-or-fetch",jwtMiddleware(), createOrFetchBrand);

// Get all brands - Protected Route
router.get("/all", getAllBrands);

// Get brand by ID - Protected Route
router.get("/:id", jwtMiddleware(), getBrandById);

// Update brand - Protected Route
router.put("/:id", jwtMiddleware(), updateBrand);

// Delete brand - Protected Route
router.delete("/:id", jwtMiddleware(), deleteBrand);


export default router;
