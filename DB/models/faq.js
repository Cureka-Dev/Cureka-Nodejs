// models/Faq.js
import mongoose from "mongoose";

const faqSchema = new mongoose.Schema({
      id: { type: Number, unique: true }, 
  question: { type: String, required: true },
  answer: { type: String, required: true },
  type: { type: String, required: true }, // e.g., General, Shipping, Returns
  status: { type: String, enum: ["Active", "Deleted"], default: "Active" },
}, { timestamps: true });

export default mongoose.model("Faq", faqSchema);
