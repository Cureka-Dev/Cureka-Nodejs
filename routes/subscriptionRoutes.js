import express from "express";
import {
  addSubscriptions,
  getAllSubscriptions,
  connectWithUs,
  getAllConnectWithUs,
} from "../controllers/subscriptionController.js";

const router = express.Router();

// Subscriptions
router.post("/subscriptions", addSubscriptions);
router.get("/subscriptions", getAllSubscriptions);

// Connect With Us
router.post("/connect-with-us", connectWithUs);
router.get("/connect-with-us", getAllConnectWithUs);

export default router;
