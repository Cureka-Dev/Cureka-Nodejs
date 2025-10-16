import mongoose from 'mongoose';

const CuratedAddSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  title: { type: String},
  description: { type: String },
  image: { type: String, required: true },
  link: { type: String, required: true },
  type: { type: String, required: true },
  status: { type: String, default: "Active" },
  products: { type: String },
}, { timestamps: true });

export default mongoose.model("CuratedAdd", CuratedAddSchema);
