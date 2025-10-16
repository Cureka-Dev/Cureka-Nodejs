import express from "express";
import {
  listAllPopups,
  getPopup,
  addPopup,
  editPopup,
  deletePopup,
} from "../controllers/popupController.js";
import jwtMiddleware from "../middlewares/jwtMiddleware.js";
import { userType } from "../utils/constants.js";
const router = express.Router();

router.get("/",jwtMiddleware([userType.USER]), listAllPopups);
router.get("/:id",jwtMiddleware([userType.USER]), getPopup);
router.post("/",jwtMiddleware([userType.USER]), addPopup);
router.put("/:id",jwtMiddleware([userType.USER]), editPopup);
router.delete("/:id",jwtMiddleware([userType.USER]), deletePopup);

export default router;
