import mongoose from "mongoose";

const productReviewSchema = new mongoose.Schema({
   id: { type: Number, unique: true },
  productid: { type: Number, required: true },
  userid: { type: Number, required: true },
  rating: { type: Number, required: true },
  comments: { type: String, required: true },
  title: { type: String },
  created_by: { type: String, required: true },
  status: { type: String, default: "Pending" },
  created_at: { type: Date, default: Date.now },
});

export const ProductReview = mongoose.model("ProductReview", productReviewSchema);
