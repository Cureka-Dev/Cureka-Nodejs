import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  name: { type: String, required: true, unique: true },
  image: { type: String, default: 'default.jpg' },
  description: { type: String, default: 'Category description' },
  status: { type: String, enum: ['Active', 'inActive'], default: 'Active' },
  slug: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
  metaDescription: { type: String },
  metaTitle: { type: String },
    bannerImage: { type: String },
}, { timestamps: true });

export default mongoose.model('Category', categorySchema);
