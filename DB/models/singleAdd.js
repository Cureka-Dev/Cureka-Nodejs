import mongoose from 'mongoose';

const SingleAddSchema = new mongoose.Schema({
      id:  {type: Number, unique: true},
  title: { type: String, required: true },
  image: { type: String, required: true },
  url: { type: String, required: true },
  is_active: { type: Boolean, default: true },
  status: { type: String, default: "Active" },
}, { timestamps: true });

export default mongoose.model("SingleAdd", SingleAddSchema);
