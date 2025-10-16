import mongoose from "mongoose";

const policySchema = new mongoose.Schema(
  {
       id:  {type: Number, unique: true},
    policy_slug: { type: String, required: true, unique: true },
    policy_name: { type: String, default: "" },
    policy_content: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Policy", policySchema);
