import { Router } from "express";
import {
  createHomeBanner,
  listHomeBanners,
  //getHomeBannerById,
  updateHomeBanner,
  deleteHomeBanner
} from "../controllers/homeBannerController.js";
import jwtMiddleware from "../middlewares/jwtMiddleware.js";
import { userType } from "../utils/constants.js";

const router = Router();

router.post("/", jwtMiddleware([userType.USER]), createHomeBanner);
router.get("/", jwtMiddleware([userType.USER]), listHomeBanners);
//router.get("/:id", jwtMiddleware([userType.USER]), getHomeBannerById);
router.put("/:id", jwtMiddleware([userType.USER]), updateHomeBanner);
router.delete("/:id", jwtMiddleware([userType.USER]), deleteHomeBanner);

export default router;
