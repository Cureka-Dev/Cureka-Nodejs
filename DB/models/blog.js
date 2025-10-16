import mongoose from "mongoose";

const blogSchema = new mongoose.Schema({
      id:  {type: Number, unique: true},
  category_id: { type: Number, required: true },
  concern_id: { type: Number, required: true },
  title: { type: String, required: true },
  image: String,
  url: { type: String, required: true, unique: true },
  description: String,
  canonical_url: String,
  og_tag: String,
  keywords: String,
  content: String,
  content1: String,
  blog_date: Date,
  thumbnail_image: String,
  popularity: String,
  status: { type: String, default: "Active" },
  views: { type: Number, default: 0 },  // for trending
}, { timestamps: true });

export default mongoose.model("Blog", blogSchema);
// Add text index on the fields you want to search
blogSchema.index({
  title: "text",
  description: "text",
  keywords: "text",
  content: "text",
  content1: "text",
});