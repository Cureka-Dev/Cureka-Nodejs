import { Router } from "express";
import {
  addToWishlist,
  removeFromWishlist,
  getWishlist
} from "../controllers/wishlistController.js";
import jwtMiddleware from "../middlewares/jwtMiddleware.js";
import { userType } from "../utils/constants.js";

const router = Router();

router.post("/", jwtMiddleware([userType.USER]), addToWishlist);
router.delete("/:productId", jwtMiddleware([userType.USER]), removeFromWishlist);
router.get("/", jwtMiddleware([userType.USER]), getWishlist);

export default router;
