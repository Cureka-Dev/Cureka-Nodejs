import mongoose from "mongoose";

const popupSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },  
    name: { type: String, required: true },
    image: { type: String, default: "" },
    coupon_code: { type: String, default: "" },
    product_id: { type: String, },
    category: { type: String, },
    brand: { type: String, default: "" },
    concern: { type: String, default: "" },
    time_lag: { type: String, default: "" },
    count_down: { type: String, default: "" },
    page_type: { type: String, default: "" },
    link: { type: String, default: "" },
    status: { type: String, default: "Active" },
    created_by: { type: String, default: "" },
    updated_by: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Popup", popupSchema);
