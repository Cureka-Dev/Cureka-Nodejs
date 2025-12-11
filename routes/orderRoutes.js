import express from "express";
import orderController from "../controllers/orderController.js";
import gokwikController from "../controllers/gokwikController.js"
import getAdminOrderDetails from "../controllers/orderController.js"
import jwtMiddleware from "../middlewares/jwtMiddleware.js";
import { userType } from "../utils/constants.js";
const router = express.Router();

router.post("/create-order", gokwikController.createOrder);

router.post("/order", jwtMiddleware([userType.USER]), orderController.placeOrder);
router.get("/orders", jwtMiddleware([userType.USER]), orderController.getOrders);
router.get("/order/:orderId", jwtMiddleware([userType.USER]), orderController.getOrder);
router.post("/order/cancel", jwtMiddleware([userType.USER]), orderController.cancelOrder);
router.get("/adminOrders", jwtMiddleware([userType.ADMIN]), orderController.getAdminOrders);
router.get("/shippingCharges", jwtMiddleware([userType.ADMIN]), orderController.shippingCharges);

// Admin endpoints (add admin middleware if needed)
router.post("/admin/order", orderController.adminPlaceOrder);
router.put("/admin/order/:orderId", orderController.updateAdminOrderDetails);
router.put("/order/:orderId", orderController.updateStatus);
router.get("/getUnicommerseOrderInfo/:orderId", jwtMiddleware([userType.ADMIN]), orderController.getUnicommerseOrderInfo);
router.get("/getAdminOrderDetails/:orderId", jwtMiddleware([userType.ADMIN]), orderController.getAdminOrdersById);
router.get("/getUniInvoice/:orderId", jwtMiddleware([userType.ADMIN]), orderController.getUniInvoice);
export default router;
