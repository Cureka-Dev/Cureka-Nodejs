import mongoose from 'mongoose';

const adminUserSchema = new mongoose.Schema({
      id: { type: Number, unique: true },
  first_name: String,
  last_name: String,
  email: { type: String, unique: true },
  mobile_number: { type: String },
  wallet_balance: { type: Number, default: 0 }, // ✅ must be Number
  is_admin: { type: Boolean, default: false },
  created_by: String,
  updated_by: String,
  password:String
});

export default mongoose.model('adminUser', adminUserSchema);
