import mongoose from "mongoose";
import kebabCase from "lodash/kebabCase.js";

const concernSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },  
    name: { type: String, required: true },
    slug: { type: String, unique: true, required: true },
    image: { type: String, default: "-" },
    description: { type: String, default: "-" },
    status: { type: String, default: "active" },
      metaDescription: { type: String },
  metaTitle: { type: String },
  },
  { timestamps: true }
);

// Auto-generate slug before save
concernSchema.pre("save", function (next) {
  if (!this.slug) {
    this.slug = kebabCase(this.name);
  }
  next();
});

export default mongoose.model("Concern", concernSchema);
