import express from "express";
const router = express.Router();

import {
  addPreference,
  deletePreference,
  editPreference,
  listAllPreferences
} from "../controllers/preference.js";

// Preference Routes
router.get("/list", listAllPreferences);
router.post("/addPreference", addPreference);
router.put("/editPreference/:id", editPreference);
router.delete("/deletePreference/:id", deletePreference);

export default router;
