import mongoose from "mongoose";
import Counter from "./Counter.js"
const addressSchema = new mongoose.Schema({
    id:  {type: Number, unique: true},
  userId:  {type: Number, unique: true},
  name: String,
  email: String,
  mobile: String,
  address: String,
  landmark: String,
  pincode: String,
  address_type: String,
  other_title: String,
  city: String,
  state: String,
    latitute: String,
      logitude: String,
  status: { type: String, default: "Active" }
}, { timestamps: true });

addressSchema.pre("save", async function (next) {
  if (this.id != null) return next(); // don't overwrite if id already exists

  const counter = await Counter.findOneAndUpdate(
    { key: "address_id" },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  this.id = counter.value;
  next();
});


const Address = mongoose.model("Address", addressSchema);

export default Address;
