// models/ShippingCharge.js
import mongoose from "mongoose";

const shippingChargeSchema = new mongoose.Schema({
  name: String,           // e.g., shipping type or description
  amount: Number,         // charge amount
  min_order: Number,      // optional: minimum order for this charge
  max_order: Number,      // optional: maximum order for this charge
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const ShippingCharge = mongoose.model("ShippingCharge", shippingChargeSchema);

export default ShippingCharge;
