import mongoose from 'mongoose';

const MultipleAddSchema = new mongoose.Schema({
      id:  {type: Number, unique: true},
  title: { type: String, required: true },
  images: [{ type: String, required: true }],
  link: { type: String, required: true },
  is_active: { type: Boolean, default: true },
  status: { type: String, default: "Active" },
}, { timestamps: true });

export default mongoose.model("MultipleAdd", MultipleAddSchema);