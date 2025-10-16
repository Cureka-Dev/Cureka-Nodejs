import mongoose from "mongoose";

const cartSchema = new mongoose.Schema({
   id: { type: Number, unique: true },
  user_id: { type: Number,  default: null },
  product_id: { type: Number, required: true },
  qty: { type: Number, required: true },
  tempData: { type: String, default: null },
}, {
  timestamps: true,
});

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;
