import { Router } from "express";
import {
  addCoupon,
  getAllCoupons,
  editCoupon,
  getCouponById,
  deleteCoupon,
  getCouponByCode,
  getAllActiveCoupons
} from "../controllers/couponController.js";

const router = Router();

router.post("/", addCoupon);
router.get("/", getAllCoupons);
router.get("/active", getAllActiveCoupons);
router.get("/:id", getCouponById);
router.get("/code/:coupon_code", getCouponByCode);
router.put("/:id", editCoupon);
router.delete("/:id", deleteCoupon);

export default router;
