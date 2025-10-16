import mongoose from "mongoose";

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

const Address = mongoose.model("Address", addressSchema);

export default Address;
