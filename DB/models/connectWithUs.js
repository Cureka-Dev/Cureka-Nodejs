import mongoose from "mongoose";
// 🔹 ConnectWithUs Model
const connectWithUsSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true }, // auto-incremented number
    name: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String },
    subject: { type: String },
    message: { type: String },
  },
  { timestamps: true }
);

export const ConnectWithUs = mongoose.model("ConnectWithUs", connectWithUsSchema);