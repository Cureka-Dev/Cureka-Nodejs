// models/productInOrder.js
import mongoose from "mongoose";

const productInOrderSchema = new mongoose.Schema({
  product_id: { type: Number, unique: true },
  quantity: { type: Number, required: true },
  mrp: Number,
  product_name: String,
  final_price: Number,
});

export default productInOrderSchema; // <-- EXPORT THE SCHEMA, NOT MODEL
