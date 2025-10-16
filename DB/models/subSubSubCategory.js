import mongoose from 'mongoose';

const subSubSubCategorySchema = new mongoose.Schema({
      id: { type: Number, unique: true },
  category: { type: Number, required: true },
  subCategory: { type: Number, required: true },
  subSubCategory: { type: Number, required: true },
  name: { type: String, required: true },
  image: { type: String, default: 'default.jpg' },
  description: { type: String, default: 'Sub-sub-sub-category description' },
  status: { type: String, enum: ['Active', 'inActive'], default: 'Active' },
  slug: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
 metaDescription: { type: String },
  metaTitle: { type: String },
    bannerImage: { type: String },
}, { timestamps: true });

export default mongoose.model('SubSubSubCategory', subSubSubCategorySchema);
