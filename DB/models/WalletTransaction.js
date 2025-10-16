import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema({
       id: { type: Number, unique: true }, 
  user_id: { type: Number, required: true },
  opening_balance: Number,
  transaction_type: { type: String, enum: ["DEBIT", "CREDIT"], required: true },
  amount: Number,
  final_amount: Number,
  description: String,
  txn_date: { type: Date, default: Date.now },
  update_flag: { type: Boolean, default: false },
  order_id: { type: Number, required: true  },
  payment_status: String,
}, { timestamps: true });

export default mongoose.model("WalletTransaction", walletTransactionSchema);
