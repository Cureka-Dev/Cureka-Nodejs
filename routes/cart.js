import express from "express";
import { addToCart, getCart,updateCart,removeFromCart,getAbondedCartList,moveCart } from "../controllers/cartController.js";
import jwtMiddleware from "../middlewares/jwtMiddleware.js";
import { userType } from "../utils/constants.js";

const router = express.Router();

router.get("/", getCart);
router.post("/", addToCart);
router.put("/", jwtMiddleware([userType.USER]), updateCart);
router.post("/moveCart",jwtMiddleware([userType.USER]), moveCart);
router.delete("/:id", removeFromCart);
router.get("/abondedCartList", getAbondedCartList);

export default router;
