import mongoose from "mongoose";

// 🔹 Subscription Model
const subscriptionSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true }, // auto-incremented number
    email: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
