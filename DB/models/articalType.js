import mongoose from "mongoose";

const articalTypeSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    name: { type: String, required: true, unique: true, trim: true },
    status: { type: String, default: "Active" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.model("ArticalType", articalTypeSchema);
