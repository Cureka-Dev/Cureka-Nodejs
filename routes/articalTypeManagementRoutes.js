import express from "express";
const router = express.Router();

import {
  addArticalType,
  createStandardSize,
  deleteArticalType,
  deleteStandardSize,
  editArticalType,
  listAllArticalTypes,
  listStandardSize,
  updateStandardSize
} from "../controllers/articalTypeController.js";

// Article Type Routes
router.get("/list", listAllArticalTypes);
router.post("/addArticalType", addArticalType);
router.put("/editArticaltype/:id", editArticalType);
router.delete("/deleteArticalType/:id", deleteArticalType);

// Standard Size Routes
router.get("/listStandardSize", listStandardSize);
router.post("/createStandardSize", createStandardSize);
router.put("/updateStandardSize/:id", updateStandardSize);
router.delete("/deleteStandardSize/:id", deleteStandardSize);

export default router;
