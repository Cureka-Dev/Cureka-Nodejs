// models/brands.js
import mongoose from 'mongoose';

const brandsSchema = new mongoose.Schema({
    id: { type: Number, unique: true },  
  name: { type: String, required: true, unique: true },
  image: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
    metaDescription: { type: String },
  metaTitle: { type: String }
});

export default mongoose.model('brands', brandsSchema);
