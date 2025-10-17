import mongoose from "mongoose";
import Product from "../DB/models/product.js";
import elasticClient from "./elasticsearch.js";

const MONGO_URI = "mongodb+srv://dev_db_user:ekd9zxcopRs0SQl9@cluster0.lvzcoaa.mongodb.net/cureka?retryWrites=true&w=majority&appName=Cluster0"; // ✅ adjust this

const reindexProductsToElastic = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("✅ Connected to MongoDB");

    const products = await Product.find()
      .populate("brand", "name")
      .populate("category_id", "name")
      .lean();

    for (const product of products) {
      try {
        await elasticClient.index({
          index: "products",
          id: product._id.toString(),
          document: {
            vendor_article_name: product.vendor_article_name,
            age_group: product.age_group,
            min_age_years: product.min_age_years,
            max_age_years: product.max_age_years,
            brand_name: product.brand?.name || "",
            category_name: product.category_id?.name || "",
            createdAt: product.createdAt
          }
        });
      } catch (err) {
        console.error(`❌ Failed to index product ${product._id}:`, err);
      }
    }

    console.log("✅ Reindex complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

reindexProductsToElastic();
