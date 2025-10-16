// models/Preference.js
import mongoose from "mongoose";

const preferenceSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    name: { type: String, required: true, unique: true },
    status: { type: String, enum: ["Active", "inActive"], default: "Active" },
  },
  { timestamps: true }
);

const Preference = mongoose.models.Preference || mongoose.model("Preference", preferenceSchema);
export default Preference;
