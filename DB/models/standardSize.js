import mongoose from "mongoose";

const standardSizeSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true },
    artical_type_id: { type: Number, required: true },
    name: { type: String, required: true },
    status: { type: String, default: "Active" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.model("StandardSize", standardSizeSchema);
