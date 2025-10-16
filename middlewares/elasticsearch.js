import { Client } from '@elastic/elasticsearch';
import Product from "../DB/models/product.js";
import Category from '../DB/models/category.js';
const elasticClient = new Client({
  node: 'https://localhost:9200',
  auth: {
    username: 'elastic',
    password: '79GOjtENT1ypONcbub_j'//Dev- '79GOjtENT1ypONcbub_j',Local '-KCT2tZC9GiiS9RCHjC5'
  },
  tls: {
    rejectUnauthorized: false
  }
});

const indexName = "products";

// Delete index (dev only)
// export const deleteElasticIndex = async () => {
//   try {
//     const exists = await elasticClient.indices.exists({ index: indexName });
//     if (exists) {
//       await elasticClient.indices.delete({ index: indexName });
//       console.log(`🗑️ Deleted index: ${indexName}`);
//     } else {
//       console.log(`ℹ️ Index '${indexName}' does not exist.`);
//     }
//   } catch (err) {
//     console.error('❌ Failed to delete index:', err);
//   }
// };

// Create index with full mapping
// export const createElasticIndex = async () => {
//   try {
//     const exists = await elasticClient.indices.exists({ index: indexName });

//     if (!exists) {
//       await elasticClient.indices.create({
//         index: indexName,
//         body: {
//           settings: {
//             analysis: {
//               analyzer: {
//                 default: { type: "standard" }
//               }
//             }
//           },
//           mappings: {
//             properties: {
//               vendor_article_name: { type: "text" },
//               age_group: { type: "text" },
//               min_age_years: { type: "integer" },
//               max_age_years: { type: "integer" },
//               brand_name: { type: "text", fields: { keyword: { type: "keyword" } } },
//               category_name: { type: "text", fields: { keyword: { type: "keyword" } } },
//               createdAt: { type: "date" }
//             }
//           }
//         }
//       });

//       console.log("✅ Created Elasticsearch index:", indexName);
//     } else {
//       console.log(`ℹ️ Index '${indexName}' already exists.`);
//     }
//   } catch (error) {
//     if (error.meta?.body?.error?.type === "resource_already_exists_exception") {
//       console.log(`ℹ️ Index '${indexName}' already exists (safe to ignore).`);
//     } else {
//       console.error("❌ Error creating index:", error.meta?.body || error);
//     }
//   }
// };
export const createElasticIndex = async () => {
  // Fetch categories
  const categories = await Category.find();
  const categoryMap = {};
  categories.forEach(cat => {
    categoryMap[cat._id.toString()] = cat.name;
  });

  // Fetch products
  const products = await Product.find().populate("brand");

  if (!products.length) {
    console.log("⚠ No products found to index.");
    return;
  }

  // Prepare bulk body
  const body = products.flatMap(product => [
    { index: { _index: "products", _id: product._id.toString() } },
    {
      vendor_article_name: product.vendor_article_name,
      age_group: product.age_group,
      brand_name: product.brand?.name || "",
      category_name: categoryMap[product.category_id?.toString()] || "",
    }
  ]);

  // Send bulk request
  const result = await elasticClient.bulk({
    refresh: true,
    body
  });

  if (result.errors) {
    console.error("❌ Some documents failed to index", result);
  } else {
    console.log(`✅ Indexed ${products.length} products successfully.`);
  }
};


export default elasticClient;
