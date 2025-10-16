import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
  {
    id: {  type: Number }, // sequential number
    user_id: { type: Number, required: true },
    product_id: { type: Number, required: true },
  },
  { timestamps: true }
);

//wishlistSchema.index({ user_id: 1, product_id: 1 }, { unique: true });

export default mongoose.model("wishlist", wishlistSchema);
