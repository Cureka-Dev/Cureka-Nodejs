import mongoose from "mongoose";

const customersSchema = new mongoose.Schema({
  id: {  type: Number }, // sequential number
  mobile_number: { type: String, unique: true, required: true },
  email: { type: String, unique: true, sparse: true },
  username: { type: String, unique: true, sparse: true },
  first_name:{ type: String },
  last_name:{ type: String },
  password: { type: String },
  otp: { type: String },
  otpExpiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  wallet_balance: { type: Number, default: 0 }, 
});

// ✅ Pre-save hook for auto-increment ID
customersSchema.pre("save", async function (next) {
  if (this.isNew && !this.id) {
    try {
      const lastCustomer = await Customers.findOne().sort({ id: -1 }).lean();
      this.id = lastCustomer ? lastCustomer.id + 1 : 1;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// ⚠️ Important: Define model *after* hook
const Customers = mongoose.model("customers", customersSchema);

export default Customers;
