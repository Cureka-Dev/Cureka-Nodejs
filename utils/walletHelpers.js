// helpers/walletHelpers.js
import WalletTransaction from "../DB/models/WalletTransaction.js";
import User from "../DB/models/user.js";

export const recordWalletTransaction = async ({
  user_id, type, amount, description, order_id, payment_status
}) => {
  const user = await User.findById(user_id);
  const opening_balance = user.wallet_balance;
  let final_balance = opening_balance;

  if (type === "DEBIT") {
    final_balance -= amount;
    user.wallet_balance = final_balance;
  } else {
    final_balance += amount;
    user.wallet_balance = final_balance;
  }
  await user.save();

  const txn = new WalletTransaction({
    user_id,
    opening_balance,
    transaction_type: type,
    amount,
    final_amount: final_balance,
    description,
    order_id,
    payment_status,
    update_flag: true
  });
  await txn.save();
  return txn;
};
