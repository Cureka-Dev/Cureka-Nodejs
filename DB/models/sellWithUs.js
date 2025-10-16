import mongoose from "mongoose";

const sellWithUsSchema = new mongoose.Schema(
  {
        id: { type: Number, unique: true },
    full_name: { type: String, required: true },
    mobile: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    annual_business_volume: { type: String, required: true },
    no_of_products: { type: Number, required: true },
    current_catalog_link: { type: String, default: "" },
    brand_name: { type: String, required: true },
    categories: [{ type: String, required: true }], // array of strings
    message: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("SellWithUs", sellWithUsSchema);
