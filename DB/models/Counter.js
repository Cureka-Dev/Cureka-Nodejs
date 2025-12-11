import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  value: { type: Number, default: 1 }
});

const Counter = mongoose.model("Counter", counterSchema);
export default Counter;
