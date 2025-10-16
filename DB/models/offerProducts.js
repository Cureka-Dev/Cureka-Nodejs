import mongoose from 'mongoose';

const OfferProductsSchema = new mongoose.Schema({
  id: { type: Number, required: true },          // SQL-style ID
  offer_id: { type: Number, required: true },    // corresponds to order_id in your example
  product_id: { type: Number, required: true },
  //quantity: { type: Number, default: 1 },
  //final_price: { type: Number, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, { timestamps: false }); // timestamps false because we have custom created_at / updated_at

export default mongoose.model("OfferProducts", OfferProductsSchema);
