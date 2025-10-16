import mongoose from 'mongoose';

const homeBannerSchema = new mongoose.Schema({
        id: { type: Number, unique: true }, 
  image: { type: String, required: true },
  category: { type: String },
  status: { type: String, required: true },
  brand: { type: String },
  link: { type: String },
  position: { type: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('home_banners', homeBannerSchema);
