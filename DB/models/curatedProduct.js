import mongoose from "mongoose";

const curatedProductSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true }, // ✅ auto-increment-like field
    name: { type: String, required: true },
    image: { type: String, required: true },
    slug_name: { type: String, required: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    flag: { type: Number, default: 0 }, // ✅ like soft delete
    added_date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// ✅ Pre-save hook to auto-increment `id`
curatedProductSchema.pre("save", async function (next) {
  if (this.isNew) {
    const last = await mongoose.model("CuratedProduct").findOne().sort({ id: -1 });
    this.id = last ? last.id + 1 : 1;
  }
  next();
});

const CuratedProduct = mongoose.model("CuratedProduct", curatedProductSchema);
export default CuratedProduct;
