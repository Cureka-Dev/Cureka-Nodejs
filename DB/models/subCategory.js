import mongoose from 'mongoose';

const subCategorySchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    category: { type: Number, required: true },
    name: { type: String, required: true },
    image: { type: String, default: 'default.jpg' },
    description: { type: String, default: 'Sub-category description' },
    status: { type: String, enum: ['Active', 'inActive'], default: 'Active' },
    slug: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
 metaDescription: { type: String },
  metaTitle: { type: String },
    bannerImage: { type: String },
}, { timestamps: true });
export default mongoose.model('SubCategory', subCategorySchema);
