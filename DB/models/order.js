
import mongoose from "mongoose";
import productInOrderSchema from "./productInOrder.js"; // Import the SCHEMA
const orderSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
  user_id: { type:Number,  required: true },
  shipping_address_id: { type:Number, required: true },
  billing_address_id: { type:Number, required: true },
  subtotal: Number,
  discount: Number,
  coupon_code: String,
  gift_wrapping: Boolean,
  transaction_id: String,
  is_cod: Boolean,
  shippingCharge: Number,
  walletMoneyUsed: Number,
  is_wallet_option: Boolean,
  order_placed_status: { type: String, default: "Pending Payment" },
  products: [productInOrderSchema],
  created_at: { type: Date, default: Date.now },
  shiprocket_id: String,
  cart_id:{type: String, default: null},
});

export default mongoose.model("Order", orderSchema);