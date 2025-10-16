import mongoose from "mongoose";

const BlogCommentSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    blog_id: { type: Number, unique: true  },
    user_id: { type: Number, unique: true  },
    comment: { type: String, required: true },
    user_name: String,
    user_email: String,
    is_approved: { type: Boolean, default: false },
    approved_at: Date,
    is_rejected: { type: Boolean, default: false },
    rejected_at: Date,
    reject_reason: String,
  },
  { timestamps: true }
);

export default mongoose.model("BlogComment", BlogCommentSchema);
