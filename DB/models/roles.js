import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
      id: { type: Number, unique: true }, // manual increment
    name: { type: String, required: true, unique: true }, // Role name (Admin, Manager, etc.)
    status: { type: String, default: true },             // Active / Inactive
    created_by: { type: String }, 
    updated_by: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Role", roleSchema);
