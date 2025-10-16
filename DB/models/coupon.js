import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true }, // manual increment
    name: { type: String, required: true },
    coupon_code: { type: String, required: true, unique: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    type: { type: String, required: true },
    offer_amount: { type: Number, required: true },
    max_user_limit: { type: Number, required: true },
    max_order_limit: { type: Number, required: true },
    min_order_value: { type: Number, required: true },
    image: { type: String },
    brand: { type: String },
    category: { type: String },
    access_role: { type: String, required: true },
    free_qty: { type: Number },
    order_qty: { type: Number },
    product_id: { type: Number },
    status: { type: String, default: "Active" }
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.model("Coupon", couponSchema);
