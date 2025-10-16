import express from "express";
import {
  addRole,
  getAllRoles,
  editRole,
  getRoleById,
  deleteRole,
  getAllAdminRoles,
} from "../controllers/roleController.js";

const router = express.Router();

router.post("/roles", addRole);
router.get("/roles", getAllRoles);
router.get("/roles/admin", getAllAdminRoles);
router.get("/roles/:id", getRoleById);
router.put("/roles/:id", editRole);
router.delete("/roles/:id", deleteRole);

export default router;
