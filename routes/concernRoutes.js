import { Router } from "express";
import {
  createConcern,
  getAllConcerns,
  getConcernById,
  updateConcern,
  deleteConcern
} from "../controllers/concernController.js";
import jwtMiddleware from "../middlewares/jwtMiddleware.js";
import { userType } from "../utils/constants.js";
const router = Router();

router.post("/",jwtMiddleware([userType.USER]), createConcern);
router.get("/", getAllConcerns);
router.get("/:id",jwtMiddleware([userType.USER]), getConcernById);
router.put("/:id",jwtMiddleware([userType.USER]), updateConcern);
router.delete("/:id",jwtMiddleware([userType.USER]), deleteConcern);

export default router;
