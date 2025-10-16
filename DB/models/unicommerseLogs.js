import mongoose from "mongoose";

const unicommerseResponseSchema = new mongoose.Schema({
  id: { type: Number, unique: true }, // optional if you need sequential IDs
  userId: { type: Number, required: true },
  orderId: { type: String, required: true },
  response: { type: String },
  payload: { type: String },
}, { timestamps: true });

const UnicommerseResponse = mongoose.model("UnicommerseResponse", unicommerseResponseSchema);

export default UnicommerseResponse;
