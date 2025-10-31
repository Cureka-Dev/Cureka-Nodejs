import Product from "../DB/models/product.js";
import { ProductReview } from "../DB/models/productReview.js";
import Popup from "../DB/models/popup.js";
import Brand from '../DB/models/brand.js';
import Category from '../DB/models/category.js';
import SubCategory from '../DB/models/subCategory.js';
import SubSubCategory from '../DB/models/subSubCategory.js';
import SubSubSubCategory from '../DB/models/subSubSubCategory.js';
import Concern from "../DB/models/concern.js";
import Preference from "../DB/models/preference.js";
import _ from "lodash";
const isEmpty = _.isEmpty;
import { generateUniqueNumber, sortByValue, timeAgo } from "../utils/common.js";
import { cleanString } from '../utils/codeUtils.js';
import elasticClient from "../middlewares/elasticsearch.js"; // Adjust path if needed
import mongoose from "mongoose";
import Fuse from "fuse.js";
import NodeCache from "node-cache";
const cache = new NodeCache({ stdTTL: 300 });

const allowedSortFields = ["ranking", "popularity", "new-arrivals", "price-high-to-low", "price-low-to-high", "mrp", "added_date", "discount", "created_at"];
export const addProduct = async (req, res) => {
  try {
    // 🔹 Get the latest "id" from the same collection
    const lastProduct = await Product.findOne().sort({ id: -1 }).select("id");
    const nextId = lastProduct ? lastProduct.id + 1 : 1;

    // 🔹 Get the latest "id" from the same collection
    const lastProductId = await Product.findOne().sort({ product_id: -1 }).select("product_id");
    const nextProductId = lastProductId ? lastProductId.product_id + 1 : 1;
    const tags = req.body.tags;
    if (isEmpty(tags)) {
      return res.status(400).json({ error: "Please add at least one tag" });
    }

    const product_image_array = JSON.parse(req.body.product_image || "[]").map((img, i) => ({
      url: img,
      sortOrder: i + 1,
    }));

    if (isEmpty(product_image_array)) {
      return res.status(400).json({ error: "Product image is required" });
    }

    const faq_options = JSON.parse(req.body.faqs_option || "[]").filter(
      f => f.question?.trim() && f.answer?.trim()
    );

    const concernList = JSON.parse(req.body.concern || "[]");
    const preferenceList = JSON.parse(req.body.preference || "[]");

    const dynamicConcerns = {};
    concernList.forEach((item, idx) => (dynamicConcerns[`concern_${idx + 1}`] = item.value));
    const dynamicPreferences = {};
    preferenceList.forEach((item, idx) => (dynamicPreferences[`preference_${idx + 1}`] = item.value));

    const calculateFinalPrice = () => {
      const mrp = Number(req.body.mrp || 0);
      const discountPercent = Number(req.body.discount_in_percent || 0);
      const discountAmount = Number(req.body.discount_in_amount || 0);
      return discountPercent > 0
        ? Math.round(mrp - (mrp * discountPercent) / 100)
        : Math.round(mrp - discountAmount);
    };

    const newProduct = new Product({
      ...req.body,
      id: nextId, // 🔹 Auto-increment ID
      product_id: nextProductId,
      vendor_article_name: req.body.vendor_article_name,
      category_id: req.body.category_id,
      url: await cleanString(req.body.vendor_article_name),
      slug: await cleanString(req.body.vendor_article_name),
      tags,
      product_images: product_image_array,
      faqs: faq_options,
      final_price: calculateFinalPrice(),
      ...dynamicConcerns,
      ...dynamicPreferences,
    });

    await newProduct.save();

    res.status(201).json({
      message: "Product added successfully",
      data: newProduct,
    });
  } catch (error) {
    console.error("Error saving product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


const cal_price_discount = (mrp, discount) => {
  let discount_price = (mrp * discount) / 100;
  return Math.round(mrp - discount_price);
};

const cal_price_amount = (mrp, amount) => {
  return Math.round(mrp - amount);
};

export const updateProduct = async (req, res) => {
  try {
    const productId = Number(req.params.productId);

    if (!productId) {
      return res.status(400).json({ error: "Please provide product id to update the product" });
    }

    // Find the product by numeric product_id
    let product = await Product.findOne({ product_id: productId });
    if (!product) {
      return res.status(404).json({ error: "Product not found with given id" });
    }

    // Parse JSON fields
    const product_images = req.body?.product_image ? JSON.parse(req.body.product_image) : undefined;
    const concerns = req.body?.concern ? JSON.parse(req.body.concern) : [];
    const faqs_option = req.body?.faqs_option ? JSON.parse(req.body.faqs_option) : [];
    const preference = req.body?.preference ? JSON.parse(req.body.preference) : [];

    // Validate tags
    if (!req.body?.tags || !req.body.tags.length) {
      return res.status(400).json({ error: "Please add at least one tag" });
    }
    // Validate & normalize tags
    let tagsArray = [];
    if (Array.isArray(req.body?.tags)) {
      tagsArray = req.body.tags;
    } else if (typeof req.body?.tags === "string") {
      // split by comma if string
      tagsArray = req.body.tags.split(",").map(t => t.trim()).filter(Boolean);
    }

    if (!tagsArray.length) {
      return res.status(400).json({ error: "Please add at least one tag" });
    }

    const tags = tagsArray.join(", ");

    // Prepare dynamic concern fields
    const concernObj = {};
    concerns.forEach((c, idx) => {
      concernObj[`concern_${idx + 1}`] = c.value;
    });

    const preferenceObj = {};
    preference.forEach((p, idx) => {
      preferenceObj[`preference_${idx + 1}`] = p.label;
    });

    // Calculate final price
    const cal_price_discount = (mrp, discount) => Math.round(mrp - (mrp * discount) / 100);
    const cal_price_amount = (mrp, amount) => Math.round(mrp - amount);

    const mrp = req.body.mrp || 0;
    const discount_in_percent = req.body.discount_in_percent || 0;
    const discount_in_amount = req.body.discount_in_amount || 0;
    const final_price = discount_in_percent > 0
      ? cal_price_discount(mrp, discount_in_percent)
      : cal_price_amount(mrp, discount_in_amount);

    // Subcategory defaults
    const sub_category_id = req.body?.sub_category_id || 113;
    const sub_sub_category_id = req.body?.sub_sub_category_id || 2;
    const sub_sub_sub_category_id = req.body?.sub_sub_sub_category_id || 2;

    // Build update object
    const updateData = {
      vendor_article_name: req.body.vendor_article_name || product.vendor_article_name,
      category_id: req.body.category_id || product.category_id,
      sub_category_id,
      sub_sub_category_id,
      sub_sub_sub_category_id,
      vendor_sku_code: req.body.vendor_sku_code || product.vendor_sku_code,
      vendor_article_number: req.body.vendor_article_number || product.vendor_article_number,
      brand: req.body.brand || product.brand,
      manufacturer_name_and_address_with_pincode: req.body.manufacturer_name_and_address_with_pincode || product.manufacturer_name_and_address_with_pincode,
      packer_name_and_address_with_pincode: req.body.packer_name_and_address_with_pincode || product.packer_name_and_address_with_pincode,
      importer_name_and_address_with_pincode: req.body.importer_name_and_address_with_pincode || product.importer_name_and_address_with_pincode,
      country_of_origin: req.body.country_of_origin || product.country_of_origin,
      weight_kg: req.body.weight_kg || product.weight_kg,
      dimensions_cm: req.body.dimensions_cm || product.dimensions_cm,
      components: req.body.components || product.components,
      article_type: req.body.article_type || product.article_type,
      brand_size: req.body.brand_size || product.brand_size,
      standard_size: req.body.standard_size || product.standard_size,
      hsn: req.body.hsn || product.hsn,
      sku_code: req.body.sku_code || product.sku_code,
      age_group: req.body.age_group || product.age_group,
      min_age_years: req.body.min_age_years || 0,
      max_age_years: req.body.max_age_years || 0,
      product_highlights: req.body.product_highlights || product.product_highlights,
      description: req.body.description || product.description,
      product_benefits: req.body.product_benefits || product.product_benefits,
      directions_of_use: req.body.directions_of_use || product.directions_of_use,
      safety_information: req.body.safety_information || product.safety_information,
      tags,
      ...concernObj,
      special_features: req.body.special_features || product.special_features,
      mrp,
      discount_in_percent,
      discount_in_amount,
      final_price,
      status: req.body.status || "Active",
      new_arrival: req.body.new_arrival || 0,
      top_picks: req.body.top_picks || 0,
      ranking: req.body.ranking || 0,
      toppics_ranking: req.body.toppics_ranking || 0,
      newarrival_ranking: req.body.newarrival_ranking || 0,
      expires_in_days: req.body.expires_in_days || 0,
      key_ingredients: req.body.key_ingredients || product.key_ingredients,
      other_ingredients: req.body.other_ingredients || product.other_ingredients,
      min_order_quantity: req.body.min_order_quantity || 0,
      max_order_quantity: req.body.max_order_quantity || 0,
      back_order_quantity: req.body.back_order_quantity || 0,
      meta_title: req.body.meta_title || product.meta_title,
      meta_description: req.body.meta_description || product.meta_description,
      stock_status: req.body.stock_status || product.stock_status,
      product_video: req.body.product_video || product.product_video,
      expert_advice: req.body.expert_advice || product.expert_advice,
      accessories_specification: req.body.specifications || product.accessories_specification,
      feeding_table: req.body.feeding_table || product.feeding_table,
      size_chart: req.body.size_chart || product.size_chart,
      skin_type: req.body.skin_type || product.skin_type,
      hair_type: req.body.hair_type || product.hair_type,
      spf: req.body.spf_type || product.spf,
      size_chart_type: req.body.size_chart_type || product.size_chart_type,
      colours: req.body.color || product.colours,
      flavours: req.body.flavour || product.flavours,
      protein_type: req.body.protein_type || product.protein_type,
      diaper_style: req.body.diaper_style || product.diaper_style,
      formulation: req.body.formulation_type || product.formulation,
      staging: req.body.staging || product.staging,
      ...preferenceObj,
      show_stock: req.body.show_stock || 0,
    };

    // Update faqs and images if provided
    if (faqs_option) updateData.faqs = faqs_option;
    if (product_images) {
      let parsedImages = Array.isArray(product_images) ? product_images : [product_images];
      parsedImages = parsedImages.map((img, index) => {
        if (typeof img === "string") {
          return { url: img, alt_text: "", position: index + 1 };
        }
        return {
          url: img.url || "",
          alt_text: img.alt_text || "",
          position: img.position ?? index + 1
        };
      });
      updateData.product_images = parsedImages;
    }

    // Perform update
    const updatedProduct = await Product.findOneAndUpdate(
      { product_id: productId },
      { $set: updateData },
      { new: true }
    ).lean();

    res.status(200).json({
      message: "Product updated successfully",
      error: false,
      data: updatedProduct
    });

  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



export const addSizeProduct = async (req, res) => {
  try {
    // Fetch the original product by ID
    const originalProduct = await Product.findById(req.body?.id);
    if (!originalProduct) {
      return res.status(404).json({ error: "Original product not found" });
    }

    // Parse arrays from request body if provided
    let productImages = req.body.product_image ? JSON.parse(req.body.product_image) : [];
    let concerns = req.body.concern ? JSON.parse(req.body.concern) : [];
    let faqOptions = req.body.faqs_option ? JSON.parse(req.body.faqs_option) : [];

    // Generate new unique product id (implement this function as needed)
    const generated_product_id = generateUniqueNumber();

    // Build new product document based on original, overwriting fields from request
    let newProduct = new Product({
      ...originalProduct.toObject(),

      _id: undefined, // unset original id to insert as new doc
      product_id: generated_product_id,
      vendor_article_name: req.body.vendor_article_name || originalProduct.vendor_article_name,
      vendor_sku_code: req.body.vendor_sku_code || originalProduct.vendor_sku_code,
      url: await cleanString(req.body.vendor_article_name || originalProduct.vendor_article_name),
      slug: await cleanString(req.body.vendor_article_name || originalProduct.vendor_article_name),
      weight_kg: req.body.weight_kg ?? originalProduct.weight_kg,
      dimensions_cm: req.body.dimensions_cm ?? originalProduct.dimensions_cm,
      brand_size: req.body.brand_size || originalProduct.brand_size,
      mrp: req.body.mrp ?? 0,
      discount_in_percent: req.body.discount_in_percent ?? 0,
      discount_in_amount: req.body.discount_in_amount ?? 0,
      status: req.body.status || "Active",
      product_type: req.body.ptype || "variant",
      new_arrival: req.body.is_new ?? 0,
      top_picks: req.body.is_top ?? 0,
      min_order_quantity: req.body.min_order_quantity ?? 0,
      max_order_quantity: req.body.max_order_quantity ?? 0,
      back_order_quantity: req.body.back_order_quantity ?? 0,
      meta_title: req.body.meta_title || null,
      meta_description: req.body.meta_description || null,
      sku_code: req.body.sku_code || originalProduct.sku_code,

      // Update images and FAQs inside this product document
      product_images: productImages.length > 0 ? productImages : originalProduct.product_images,
      faqs: faqOptions.length > 0 ? faqOptions : originalProduct.faqs,

      // Use existing concerns or updated ones if provided
      concern_1: concerns[0]?.value || originalProduct.concern_1 || null,
      concern_2: concerns[1]?.value || originalProduct.concern_2 || null,
      concern_3: concerns[2]?.value || originalProduct.concern_3 || null,
    });

    // Calculate final price based on discount or amount
    if (newProduct.discount_in_percent > 0) {
      newProduct.final_price = await cal_price_discount(newProduct.mrp, newProduct.discount_in_percent);
    } else {
      newProduct.final_price = await cal_price_amount(newProduct.mrp, newProduct.discount_in_amount);
    }

    // Save new product variant to DB
    const savedProduct = await newProduct.save();

    return res.status(201).json({
      message: "Product size added successfully",
      error: false,
      data: savedProduct
    });
  } catch (error) {
    console.error("Error adding product size:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
export const deleteProduct = async (req, res) => {
  try {
    const id = req.params.productId;
    if (isEmpty(id)) {
      return res.status(400).json({ error: "Please provide product id to delete the product" });
    }

    // Find product by _id
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found with given id" });
    }

    // Delete product document (includes images and FAQs as embedded arrays)
    await Product.findByIdAndDelete(id);

    res.status(200).json({
      message: "Product deleted successfully",
      error: false,
      data: product,  // returning deleted product info if needed
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({ error: "Product slug is required" });
    }

    // ✅ Helper: safely convert to Number or null
    function toNumberOrNull(value) {
      if (value === null || value === undefined) return null;
      if (typeof value === "string" && (value.toUpperCase() === "NULL" || value.trim() === "")) return null;
      const num = Number(value);
      return isNaN(num) ? null : num;
    }

    // Find the product without populate
    const product = await Product.findOne({ slug }).lean();

    if (!product) {
      return res.status(404).json({ error: "Product not found with the given slug" });
    }

    const productId = product.product_id;

    // Extract images
    const product_images = product.product_images || [];

    // ✅ Fetch category / subcategory / sub-subcategory / sub-sub-subcategory / brand safely
    const [category, subCategory, subSubCategory, subSubSubCategory, brand] = await Promise.all([
      Category.findOne({ id: toNumberOrNull(product.category_id) }, { name: 1, slug: 1 }).lean(),
      SubCategory.findOne({ id: toNumberOrNull(product.sub_category_id) }, { name: 1, slug: 1 }).lean(),
      SubSubCategory.findOne({ id: toNumberOrNull(product.sub_sub_category_id) }, { name: 1, slug: 1 }).lean(),
      SubSubSubCategory.findOne({ id: toNumberOrNull(product.sub_sub_sub_category_id) }, { sub_sub_sub_category_name: 1, slug: 1 }).lean(),
      Brand.findOne({ id: toNumberOrNull(product.brand) }, { name: 1 }).lean(),
    ]);

    // Get other products in same style group
    let styles = [];
    if (product.style_group_id) {
      styles = await Product.find({
        style_group_id: product.style_group_id,
        product_id: { $ne: productId },
      }).lean();

      styles = await Promise.all(
        styles.map(async (p) => {
          const [c, sc, ssc] = await Promise.all([
            Category.findOne({ id: toNumberOrNull(p.category_id) }, { name: 1, slug: 1 }).lean(),
            SubCategory.findOne({ id: toNumberOrNull(p.sub_category_id) }, { name: 1, slug: 1 }).lean(),
            SubSubCategory.findOne({ id: toNumberOrNull(p.sub_sub_category_id) }, { name: 1, slug: 1 }).lean(),
          ]);
          return {
            ...p,
            categoryName: c?.name || null,
            subCategoryName: sc?.name || null,
            subSubCategoryName: ssc?.name || null,
          };
        })
      );
    }

    const variants = styles.filter((p) => p.product_type === "variant");
    const bundles = styles.filter((p) => p.product_type === "bundle");

    // Get approved product reviews
    const product_reviews = await ProductReview.find({
      productid: productId,
      status: "Approved",
    }).lean();

    const totalRating = product_reviews.reduce((sum, r) => sum + r.rating, 0);
    const average = product_reviews.length ? totalRating / product_reviews.length : 0;

    // Add relative time to reviews
    for (let review of product_reviews) {
      review.time = await timeAgo(review.created_at);
    }

    const ratingSummary = [5, 4, 3, 2, 1].map((star) => {
      const count = product_reviews.filter((r) => r.rating === star).length;
      const averagePercent = product_reviews.length
        ? Math.round((count / product_reviews.length) * 100)
        : 0;
      return { name: `${star} Star`, count, average: averagePercent };
    });

    const ratingCount = {
      average: Math.round(average),
      totalReviews: product_reviews.length,
      totalCustomerRating: ratingSummary,
    };

    // Optional popup data
    const popups = await Popup.findOne({
      product_id: { $in: [productId.toString()] },
      status: "Active",
    }).limit(1);

    // ✅ Normalize all FAQ fields dynamically into array
    let product_faq_array = [];
    Object.keys(product).forEach((key) => {
      if( product[key] && typeof product[key] === "string"){
        product[key] = product[key].replace(/\\n/g, "\n");
      }

      const match = key.match(/^faq(\d+)$/); // matches faq1, faq2, faq3...
      if (match) {
        const index = match[1];
        const question = product[`faq${index}`];
        const answer = product[`faq${index}_a`];
        if (question && answer && question !== "null" && answer !== "null") {
          product_faq_array.push({
            id: Number(`${product.product_id}${index}`), // unique id e.g., 4888261
            faq: question,
            faq_a: answer,
            product_id: product.product_id,
          });
        }
      }
    });

    let objectData = {
      ...product,
      category_name: category?.name || null,
      category_slug: category?.slug || null,
      sub_category_name: subCategory?.name || null,
      sub_category_slug: subCategory?.slug || null,
      sub_sub_category_name: subSubCategory?.name || null,
      sub_sub_category_slug: subSubCategory?.slug || null,
      sub_sub_sub_category_name: subSubSubCategory?.sub_sub_sub_category_name || null,
      sub_sub_sub_category_slug: subSubSubCategory?.slug || null,
      brandName: brand?.name || null,
      product_images,
      faqs: product_faq_array,
      variants,
      bundles,
      product_reviews,
      ratingCount,
      popups
    }

    let json_string = JSON.stringify(objectData).replace("//n", "/n");
    let finalData = JSON.parse(json_string);
    // Final response
    res.status(200).json(finalData);
  } catch (error) {
    console.error("Error fetching product by slug:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



// Old Code
// export const searchProducts = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const pageSize = parseInt(req.query.pageSize) || 30;
//     const sortBy = req.query.sortBy || "ranking";
//     const searchTerm = req.query.search_term || "";
//       const allowedSortFields = [
//       "createdAt",
//       // add your allowed fields here
//     ];
//   const allowedSortFieldsArray = allowedSortFields;
//   if (!allowedSortFieldsArray.includes(sortBy)) {
//     return res.status(400).json({ error: `Invalid sortBy parameter '${sortBy}'` });
//   }

//     const sortOptions = {};
//     sortOptions[sortBy] = -1;

//     // Build query
//     const query = { status: "Active" };
//     if (searchTerm) {
//       query.$or = [
//         { vendor_article_name: { $regex: searchTerm, $options: "i" } },
//         { age_group: { $regex: searchTerm, $options: "i" } },
//       ];
//     }
// console.log("query",query);
//     // Dynamic filters
//     const dynamicFilters = Object.keys(req.query).filter(
//       (key) => !["page", "pageSize", "sortBy", "search_term"].includes(key)
//     );

//     for (const key of dynamicFilters) {
//       if (key === "brand") {
//         const brandNames = req.query.brand.split(",");
//         const brandDocs = await Brand.find({ name: { $in: brandNames } });
//         const brandIds = brandDocs.map((b) => b._id);
//         query.brand = { $in: brandIds };
//       } else {
//         query[key] = req.query[key];
//       }
//     }

//     const totalItems = await Product.countDocuments(query);

//     const products = await Product.find(query)
//       .populate("brand", "name")
//       .populate("category_id", "name slug")
//       .populate("sub_category_id", "name slug")
//       .populate("sub_sub_category_id", "name slug")
//       .populate("sub_sub_sub_category_id", "sub_sub_sub_category_name slug")
//       .sort(sortOptions)
//       .skip((page - 1) * pageSize)
//       .limit(pageSize)
//       .lean();

//     // Fetch reviews for all product IDs in bulk
//     const productIds = products.map((product) => product._id);
//     const reviews = await ProductReview.find({ productid: { $in: productIds } }).lean();

//     // Group reviews by product ID
//     const reviewsByProductId = {};
//     reviews.forEach((review) => {
//       const pid = review.productid.toString();
//       if (!reviewsByProductId[pid]) {
//         reviewsByProductId[pid] = [];
//       }
//       reviewsByProductId[pid].push(review);
//     });

//     // Attach images and reviews to each product
//     products.forEach((product) => {
//       if (product.images && product.images.length > 0) {
//         product.product_images = [product.images[0]];
//       } else {
//         product.product_images = [];
//       }

//       const pid = product._id.toString();
//       product.product_reviews = reviewsByProductId[pid] || [];
//     });

//     // Filter counts
//     const filterFields = [
//       "brand",
//       "preference",
//       "preference_2",
//       "preference_3",
//       "skin_type",
//       "min_age_years",
//     ];
//     const filters = {};

//     for (const field of filterFields) {
//       if (field === "min_age_years") {
//         const result = await Product.aggregate([
//           { $match: query },
//           {
//             $group: {
//               _id: { min: "$min_age_years", max: "$max_age_years" },
//               count: { $sum: 1 },
//             },
//           },
//         ]);
//         filters[field] = result.map((r) => ({
//           value: `${r._id.min} to ${r._id.max}`,
//           count: r.count,
//         }));
//       } else {
//         const result = await Product.aggregate([
//           { $match: query },
//           {
//             $group: {
//               _id: `$${field}`,
//               count: { $sum: 1 },
//             },
//           },
//         ]);
//         filters[field] = result
//           .filter((r) => r._id)
//           .map((r) => ({ value: r._id, count: r.count }));
//       }
//     }

//     // Matching brands & categories for search suggestions
//     const brands = await Brand.find({ name: { $regex: searchTerm, $options: "i" } });
//     const categories = await Category.find({ name: { $regex: searchTerm, $options: "i" } });

//     res.status(200).json({
//       pagination: {
//         totalItems,
//         totalPages: Math.ceil(totalItems / pageSize),
//         currentPage: page,
//         itemsPerPage: pageSize,
//       },
//       products,
//       brands,
//       categories,
//       filters,
//       allowedSortFields,
//     });
//   } catch (error) {
//     console.error("Error in /search-products:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };

function cleanFilters(filters) {
  const cleaned = {};

  Object.keys(filters).forEach((key) => {
    if (Array.isArray(filters[key])) {
      const filteredArr = filters[key].filter(
        (item) => item.value !== "NULL" && item.value !== null && item.value !== undefined && item.value !== ""
      );
      if (filteredArr.length) cleaned[key] = filteredArr;
    }
  });

  return cleaned;
}
export const searchProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 30;
    const sortBy = req.query.sortBy || "ranking";
    const searchTerm = req.query.search_term || "";

    //const allowedSortFields = ["createdAt", "ranking"];
    if (!allowedSortFields.includes(sortBy)) {
      return res.status(400).json({ error: `Invalid sortBy parameter '${sortBy}'` });
    }

    const sortOptions = { [sortBy]: -1 };
    const query = { status: "Active" };

    // 🔹 Whole word match on vendor_article_name
    if (searchTerm) {
      const escapedTerm = searchTerm.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      query.vendor_article_name = { $regex: `\\b${escapedTerm}\\b`, $options: "i" };
    }

    // // 🔹 Apply dynamic filters from query
    // const dynamicFilters = Object.keys(req.query).filter(
    //   (key) => !["page", "pageSize", "sortBy", "search_term"].includes(key)
    // );

    // for (const key of dynamicFilters) {
    //   if (key === "brand") {
    //     const brandNames = req.query.brand.split(",");
    //     const brandDocs = await Brand.find({ name: { $in: brandNames } });
    //     const brandIds = brandDocs.map(b => b._id);
    //     query.brand = { $in: brandIds };
    //   } else {
    //     query[key] = req.query[key];
    //   }
    // }

    // Apply dynamic filters
    const ignoredKeys = ["page", "pageSize", "sortBy", "search_term"];
    for (const key of Object.keys(req.query)) {
      if (!ignoredKeys.includes(key)) {
        if (key === "brand") {
          const brandNames = req.query.brand.split(",");
          const brandDocs = await Brand.find({ name: { $in: brandNames } });
          const brandIds = brandDocs.map((b) => b.id);
          query.brand = { $in: brandIds };
        } else if (key === "minPrice") {
          query.final_price = { ...(query.final_price || {}), $gte: parseFloat(req.query[key]) };
        } else if (key === "maxPrice") {
          query.final_price = { ...(query.final_price || {}), $lte: parseFloat(req.query[key]) };
        } else if (key === "min_age_years") {
          const ageRange = decodeURIComponent(req.query[key]);
          const [min, max] = ageRange.replace(/\+/g, " ").split("to").map(v => parseInt(v.trim(), 10));
          if (!isNaN(min)) query.min_age_years = { ...(query.min_age_years || {}), $gte: min };
          if (!isNaN(max)) query.max_age_years = { ...(query.max_age_years || {}), $lte: max };
        } else {
          let keys = req.query[key].split(",");
          query[key] = { $in: keys };
        }
      }
    }

    // 🔹 Fetch products with aggregations
    let products = await Product.aggregate([
      { $match: query },
      { $lookup: { from: "brands", localField: "brand", foreignField: "_id", as: "brand" } },
      { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "categories", localField: "category_id", foreignField: "_id", as: "category_id" } },
      { $unwind: { path: "$category_id", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "subcategories", localField: "sub_category_id", foreignField: "_id", as: "sub_category_id" } },
      { $unwind: { path: "$sub_category_id", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "subsubcategories", localField: "sub_sub_category_id", foreignField: "_id", as: "sub_sub_category_id" } },
      { $unwind: { path: "$sub_sub_category_id", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "subsubsubcategories", localField: "sub_sub_sub_category_id", foreignField: "_id", as: "sub_sub_sub_category_id" } },
      { $unwind: { path: "$sub_sub_sub_category_id", preserveNullAndEmptyArrays: true } },
      { $sort: sortOptions },
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize }
    ]).option({ allowDiskUse: true });

    // 🔹 Fuse.js fuzzy search
    if (searchTerm) {
      const fuse = new Fuse(products, {
        keys: ["vendor_article_name", "sku_code", "brand.name"],
        threshold: 0.3,
      });
      products = fuse.search(searchTerm).map(res => res.item);
    }

    const totalItems = products.length;
    const paginatedProducts = products.slice((page - 1) * pageSize, page * pageSize);

    // 🔹 Attach reviews
    const productIds = paginatedProducts.map(p => p.id);
    const reviews = await ProductReview.find({ productid: { $in: productIds } }).lean();
    const reviewsByProductId = {};
    reviews.forEach(review => {
      const pid = review.productid.toString();
      if (!reviewsByProductId[pid]) reviewsByProductId[pid] = [];
      reviewsByProductId[pid].push(review);
    });

    // paginatedProducts.forEach(product => {
    //   product.product_images = product.images?.length ? [product.images[0]] : [];
    //   const pid = product._id.toString();
    //   product.product_reviews = reviewsByProductId[pid] || [];
    // });

    // 🔹 Filters
    const filterFields = ["brand", "preference", "preference_2", "preference_3", "skin_type", "min_age_years"];
    const filters = {};

    for (const field of filterFields) {
      if (field === "min_age_years") {
        const result = await Product.aggregate([
          { $match: { status: "Active" } }, // ignore other filters
          { $group: { _id: { min: "$min_age_years", max: "$max_age_years" }, count: { $sum: 1 } } }
        ]);
        filters[field] = result.map(r => ({ value: `${r._id.min} to ${r._id.max}`, count: r.count }));
      } else if (field === "brand") {
        // Get all brands with counts
        const result = await Product.aggregate([
          { $match: { status: "Active" } }, // ignore brand filter for listing
          { $lookup: { from: "brands", localField: "brand", foreignField: "_id", as: "brand_docs" } },
          { $unwind: "$brand_docs" },
          { $group: { _id: "$brand_docs.name", count: { $sum: 1 } } }
        ]);
        filters[field] = result.filter(r => r._id).map(r => ({ value: r._id, count: r.count }));
      } else {
        const result = await Product.aggregate([
          { $match: query },
          { $group: { _id: `$${field}`, count: { $sum: 1 } } }
        ]);
        filters[field] = result.filter(r => r._id).map(r => ({ value: r._id, count: r.count }));
      }
    }

    // 🔹 Related brands & categories
    const brands = await Brand.find({ name: { $regex: searchTerm, $options: "i" } });
    const categories = await Category.find({ name: { $regex: searchTerm, $options: "i" } });
    const cleanedFilters = cleanFilters(filters);
    return res.status(200).json({
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
        currentPage: page,
        itemsPerPage: pageSize,
      },
      products: paginatedProducts,
      brands,
      categories,
      filters: cleanedFilters,
      allowedSortFields,
    });

  } catch (error) {
    console.error("❌ Error in /search-products:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};






export const productsSuggestions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 30;
    const sortBy = req.query.sortBy || "ranking";
    const searchTerm = req.query.search_term || "";

    const allowedSortFields = [
      "ranking",
      "mrp",
      "final_price",
      "vendor_article_name",
      // add your allowed fields here
    ];

    if (!allowedSortFields.includes(sortBy)) {
      return res.status(400).json({ error: `Invalid sortBy parameter '${sortBy}'` });
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortBy === "vendor_article_name" ? 1 : -1;

    // Base query
    const query = { status: "Active" };

    // Search term as regex on vendor_article_name or sku_code
    if (searchTerm) {
      query.$or = [
        { vendor_article_name: { $regex: searchTerm, $options: "i" } },
        { sku_code: { $regex: searchTerm, $options: "i" } },
      ];
    }

    // Dynamic filters from query params except pagination/sort/search keys
    const ignoredKeys = ["page", "pageSize", "sortBy", "search_term"];
    for (const key of Object.keys(req.query)) {
      if (!ignoredKeys.includes(key)) {
        if (key === "brand") {
          const brandNames = req.query.brand.split(",");
          const brandDocs = await Brand.find({ name: { $in: brandNames } });
          const brandIds = brandDocs.map((b) => b._id);
          query.brand = { $in: brandIds };
        } else {
          query[key] = req.query[key];
        }
      }
    }

    const totalItems = await Product.countDocuments(query);

    const products = await Product.find(query)
      .populate("brand", "name")
      .populate("category_id", "name slug")
      .populate("sub_category_id", "name slug")
      .populate("sub_sub_category_id", "name slug")
      .populate("sub_sub_sub_category_id", "sub_sub_sub_category_name slug")
      .sort(sortOptions)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    // Bulk fetch reviews for products
    const productIds = products.map((p) => p.product_id);
    const reviews = await ProductReview.find({ productid: { $in: productIds }, status: "Approved" }).lean();

    // Group reviews by product ID
    const reviewsByProductId = {};
    for (const review of reviews) {
      const pid = review.productid.toString();
      if (!reviewsByProductId[pid]) reviewsByProductId[pid] = [];
      reviewsByProductId[pid].push(review);
    }

    // Attach first image and reviews to each product
    products.forEach((product) => {
      //product.product_images = product.product_images?.length ? [product.product_images[0]] : [];
      product.product_reviews = reviewsByProductId[product._id.toString()] || [];
      product.faqs = product.faqs || [];
    });

    // Aggregate filter counts
    const filterFields = [
      "brand",
      "preference",
      "preference_2",
      "preference_3",
      "skin_type",
      "min_age_years",
    ];
    const filters = {};

    for (const field of filterFields) {
      if (field === "min_age_years") {
        const result = await Product.aggregate([
          { $match: query },
          {
            $group: {
              _id: { min: "$min_age_years", max: "$max_age_years" },
              count: { $sum: 1 },
            },
          },
        ]);
        filters[field] = result.map((r) => ({
          value: `${r._id.min} to ${r._id.max}`,
          count: r.count,
        }));
      } else {
        const result = await Product.aggregate([
          { $match: query },
          {
            $group: {
              _id: `$${field}`,
              count: { $sum: 1 },
            },
          },
        ]);
        filters[field] = result
          .filter((r) => r._id)
          .map((r) => ({ value: r._id, count: r.count }));
      }
    }

    // Search suggestions for brands and categories
    const brands = await Brand.find({ name: { $regex: `^${searchTerm}`, $options: "i" } }).limit(10);
    const categories = await Category.find({ name: { $regex: `^${searchTerm}`, $options: "i" } }).limit(10);
    // const subcategories = await SubCategory.find({ name: { $regex: `^${searchTerm}`, $options: "i" } }).limit(10);
    // const subsubcategories = await SubSubCategory.find({ name: { $regex: `^${searchTerm}`, $options: "i" } }).limit(10);
    const concerns = await Concern.find({ name: { $regex: `^${searchTerm}`, $options: "i" } }).limit(10);
    const cleanedFilters = cleanFilters(filters);

  const subcategories = await SubCategory.aggregate([
  { $match: { name: { $regex: `^${searchTerm}`, $options: "i" } } },
  {
    $lookup: {
      from: "categories",             // name of the Brand collection
      localField: "category_id",        // field in Product
      foreignField: "id",        // field in Brand
      as: "category"                 // output field name
    }
  },
  {
    $unwind: {
      path: "$category",
      preserveNullAndEmptyArrays: true // keep products even without a brand (LEFT JOIN behavior)
    }
  },

  { $limit: 10}

]);

  const subsubcategories = await SubSubCategory.aggregate([
  { $match: { name: { $regex: `^${searchTerm}`, $options: "i" } } },
  {
    $lookup: {
      from: "categories",             // name of the Brand collection
      localField: "category_id",        // field in Product
      foreignField: "id",        // field in Brand
      as: "category"                 // output field name
    }
  },
  {
    $unwind: {
      path: "$category",
      preserveNullAndEmptyArrays: true // keep products even without a brand (LEFT JOIN behavior)
    }
  },

    {
    $lookup: {
      from: "subcategories",             // name of the Brand collection
      localField: "sub_category_id",        // field in Product
      foreignField: "id",        // field in Brand
      as: "subcategory"                 // output field name
    }
  },
  {
    $unwind: {
      path: "$subcategory",
      preserveNullAndEmptyArrays: true // keep products even without a brand (LEFT JOIN behavior)
    }
  },

  { $limit: 10}

]);

    res.status(200).json({
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
        currentPage: page,
        itemsPerPage: pageSize,
      },
      products,
      brands,
      categories,
      subcategories,
      subsubcategories,
      concerns,
      filters: cleanedFilters,
      allowedSortFields,
    });
  } catch (error) {
    console.error("Error in /productsSuggestions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Category Products API
export const categoryProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 30;
    const sortBy = req.query.sortBy || "ranking";
    const slugName = req.params.slug;
    //const allowedSortFields = ["ranking", "price", "name", "createdAt"];

    if (!allowedSortFields.includes(sortBy)) {
      return res.status(400).json({ error: "Invalid sortBy parameter" });
    }

    // ✅ Find category by slug
    const category = await Category.findOne({ slug: slugName }).lean();
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    const cat_id = category.id; // depends on schema

    // ✅ Dynamic Filters
    const andConditions = [
      { category_id: cat_id },
      { status: "Active" }
    ];

    if (req.query.brand) {
      const brands = await Brand.find({ name: { $in: req.query.brand.split(",") } }).lean();
      const brandIds = brands.map(b => b.id);
      if (brandIds.length) andConditions.push({ brand: { $in: brandIds } });
    }

    // ✅ Preference filter (direct from Product fields)
    if (req.query.preference) {
      const prefValues = req.query.preference.split(",");
      andConditions.push({
        $or: [
          { preference: { $in: prefValues } },
          { preference_2: { $in: prefValues } },
          { preference_3: { $in: prefValues } },
        ],
      });
    }

    if (req.query.concern_1) {
      const concerns = await Concern.find({ name: { $in: req.query.concern_1.split(",") } }).lean();
      const concernIds = concerns.map(c => c._id);
      if (concernIds.length) {
        andConditions.push({
          $or: [
            { concern_1: { $in: concernIds } },
            { concern_2: { $in: concernIds } },
            { concern_3: { $in: concernIds } },
          ],
        });
      }
    }

    if (req.query.minPrice || req.query.maxPrice) {
      const priceCond = {};
      if (req.query.minPrice) priceCond.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) priceCond.$lte = parseFloat(req.query.maxPrice);
      andConditions.push({ final_price: priceCond });
    }

    // ✅ Final query
    const finalQuery = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];
    //console.log("finalQuery",finalQuery);
    // ✅ Total products
    const totalItems = await Product.countDocuments(finalQuery);

    // ✅ Sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortBy === "vendor_article_name" ? 1 : -1;
    // const sortValue = await sortByValue(sortBy);
    // const products = await Product.find(finalQuery)
    //   .populate("brand", "name")
    //   .sort(sortValue)
    //   .skip((page - 1) * pageSize)
    //   .limit(pageSize)
    //   .lean();


let sortValue = {};
if (req.query.sortBy) {
  const [field, order] = req.query.sortBy.split(" ");
  sortValue[field] = order === "desc" ? -1 : 1;
} else {
  sortValue = { ranking: 1 }; // default
}

    const products = await Product.aggregate([
  //  Filter (same as find)
  { $match: finalQuery },

  // Join with brands collection (LEFT JOIN)
  {
    $lookup: {
      from: "brands",             // name of the Brand collection
      localField: "brand",        // field in Product
      foreignField: "id",        // field in Brand
      as: "brand"                 // output field name
    }
  },

  // Unwind to turn the joined brand array into an object
  {
    $unwind: {
      path: "$brand",
      preserveNullAndEmptyArrays: true // keep products even without a brand (LEFT JOIN behavior)
    }
  },

  // Sort (same as .sort(sortValue))
  { $sort: sortValue },

  // Pagination (same as skip + limit)
  { $skip: (page - 1) * pageSize },
  { $limit: pageSize },

]);




    // ✅ Add category name directly into each product
    products.forEach((product) => {
      product.category_name = category.name;
      product.brand_name = product.brand.name ? product.brand.name : "";
      product.brand = product.brand.id ? product.brand.id : "";

      // product.product_images = product.product_images?.length
      //   ? product.product_images.map((img, index) => ({
      //     image: img.url || img,   // handle case if it's just a string
      //     sortOrder: img.sortOrder || index + 1,
      //   }))
      //   : [];
    });

    // ✅ Filters
    const filters = {};

    // Brand filter
    const brandAgg = await Product.aggregate([
      { $match: { category_id: cat_id, status: "Active" } },
      { $group: { _id: "$brand", count: { $sum: 1 } } },
      { $match: { _id: { $ne: null } } }
    ]);
    filters.brand = await Promise.all(
      brandAgg.map(async (b) => {
        const doc = await Brand.findById(b.id).lean();
        return doc ? { value: doc.name, count: b.count } : null;
      })
    ).then(arr => arr.filter(Boolean).sort((a, b) => b.count - a.count));

    // Simple fields
    const filterFields = [
      "spf", "size_chart_type", "colours", "flavours",
      "protein_type", "formulation", "staging", "skin_type", "hair_type"
    ];
    for (const field of filterFields) {
      const result = await Product.aggregate([
        { $match: { category_id: cat_id, status: "Active" } },
        { $group: { _id: `$${field}`, count: { $sum: 1 } } },
        { $match: { _id: { $nin: [null, "", "undefined", "null"] } } },
      ]);
      if (result.length) {
        filters[field] = result
          .map((r) => ({ value: r._id, count: r.count }))
          .sort((a, b) => b.count - a.count);
      }
    }

    // ✅ Preference filter aggregation (direct from Product)
    const prefAgg = await Product.aggregate([
      { $match: { category_id: cat_id, status: "Active" } },
      {
        $project: {
          prefs: {
            $setUnion: [
              [{ $ifNull: ["$preference", null] }],
              [{ $ifNull: ["$preference_2", null] }],
              [{ $ifNull: ["$preference_3", null] }],
            ],
          },
        },
      },
      { $unwind: "$prefs" },
      { $match: { prefs: { $nin: [null, "", "undefined", "null"] } } },
      { $group: { _id: "$prefs", count: { $sum: 1 } } },
    ]);

    filters.preference = prefAgg
      .map(p => ({ value: p._id, count: p.count }))
      .sort((a, b) => b.count - a.count);

    // Concern filter
    const concernAgg = await Product.aggregate([
      { $match: { category_id: cat_id, status: "Active" } },
      {
        $project: {
          concerns: {
            $setUnion: [
              [{ $ifNull: ["$concern_1", null] }],
              [{ $ifNull: ["$concern_2", null] }],
              [{ $ifNull: ["$concern_3", null] }],
            ],
          },
        },
      },
      { $unwind: "$concerns" },
      { $match: { concerns: { $nin: [null, "", "undefined", "null"] } } },
      { $group: { _id: "$concerns", count: { $sum: 1 } } },
    ]);

    filters.concern = await Promise.all(
      concernAgg.map(async (c) => {
        const doc = await Concern.findById(c.id).lean();
        return doc ? { value: doc.name, count: c.count } : null;
      })
    ).then(arr => arr.filter(Boolean).sort((a, b) => b.count - a.count));
    const cleanedFilters = cleanFilters(filters);
    //console.log(cleanedFilters);
    // ✅ Response
    res.status(200).json({
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
        currentPage: page,
        itemsPerPage: pageSize,
      },
      products,
      catadata: category,
      filters: cleanedFilters,
      allowedSortFields,
    });
  } catch (err) {
    console.error("Error in /category-products/:slug:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};





export const subcategoryProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 30;
    const sortBy = req.query.sortBy || "ranking";
    const slug = req.params.slug;

    if (!allowedSortFields.includes(sortBy)) {
      return res
        .status(400)
        .json({ error: `Invalid sortBy parameter '${sortBy}'` });
    }

    // const sortValue = await sortByValue(sortBy);

    // ✅ Find the subcategory
    const subCategory = await SubCategory.findOne({ slug }).lean();
    if (!subCategory) return res.status(404).json({ error: "Subcategory not found" });

    // ✅ Fetch category name
    const categoryDoc = await Category.findOne({ id: subCategory.category_id }).lean();
    const categoryName = categoryDoc ? categoryDoc.name : null;

    // ✅ Base query
    const andConditions = [
      { status: "Active" },
      { sub_category_id: subCategory.id },
    ];

    // ✅ Dynamic filters
    if (req.query.brand) {
      const brands = await Brand.find({ name: { $in: req.query.brand.split(",") } }).lean();
      const brandIds = brands.map((b) => b.id);
      if (brandIds.length) andConditions.push({ brand: { $in: brandIds } });
    }

    if (req.query.preference) {
      const prefNames = req.query.preference.split(",");
      andConditions.push({
        $or: [
          { preference: { $in: prefNames } },
          { preference_2: { $in: prefNames } },
          { preference_3: { $in: prefNames } },
        ],
      });
    }

    if (req.query.concern_1) {
      const concerns = await Concern.find({ name: { $in: req.query.concern_1.split(",") } }).lean();
      const concernIds = concerns.map((c) => c.id);
      if (concernIds.length) {
        andConditions.push({
          $or: [
            { concern_1: { $in: concernIds } },
            { concern_2: { $in: concernIds } },
            { concern_3: { $in: concernIds } },
          ],
        });
      }
    }

    if (req.query.minPrice || req.query.maxPrice) {
      const priceCond = {};
      if (req.query.minPrice) priceCond.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) priceCond.$lte = parseFloat(req.query.maxPrice);
      andConditions.push({ final_price: priceCond });
    }

    const finalQuery = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    // ✅ Total products
    const totalItems = await Product.countDocuments(finalQuery);

    // ✅ Get products
    // const products = await Product.find(finalQuery)
    //   .populate("brand", "name")
    //   .populate("category_id", "name slug")
    //   .populate("sub_category_id", "name slug")
    //   .populate("sub_sub_category_id", "name slug")
    //   .populate("sub_sub_sub_category_id", "sub_sub_sub_category_name slug")
    //   .sort(sortValue)
    //   .skip((page - 1) * pageSize)
    //   .limit(pageSize)
    //   .lean();

    let sortValue = {};
if (req.query.sortBy) {
  const [field, order] = req.query.sortBy.split(" ");
  sortValue[field] = order === "desc" ? -1 : 1;
} else {
  sortValue = { ranking: 1 }; // default
}

        const products = await Product.aggregate([
  //  Filter (same as find)
  { $match: finalQuery },

  // Join with brands collection (LEFT JOIN)
  {
    $lookup: {
      from: "brands",             // name of the Brand collection
      localField: "brand",        // field in Product
      foreignField: "id",        // field in Brand
      as: "brand"                 // output field name
    }
  },

  // Unwind to turn the joined brand array into an object
  {
    $unwind: {
      path: "$brand",
      preserveNullAndEmptyArrays: true // keep products even without a brand (LEFT JOIN behavior)
    }
  },

  // Sort (same as .sort(sortValue))
  { $sort: sortValue },

  // Pagination (same as skip + limit)
  { $skip: (page - 1) * pageSize },
  { $limit: pageSize },

]);


    const productIds = products.map((p) => p.product_id);

    // ✅ Attach reviews
    const reviews = await ProductReview.find({
      productid: { $in: productIds },
      status: "Approved",
    }).lean();

    const reviewsByProductId = {};
    for (const review of reviews) {
      const pid = review.productid.toString();
      if (!reviewsByProductId[pid]) reviewsByProductId[pid] = [];
      reviewsByProductId[pid].push(review);
    }

    products.forEach((product) => {
      // product.product_images = product.product_images?.length
      //   ? [product.product_images[0]]
      //   : [];
      product.product_reviews = reviewsByProductId[product._id.toString()] || [];
      product.category_name = categoryName;
            product.brand_name = product?.brand?.name ? product.brand.name : "";
      product.brand = product?.brand?.id ? product.brand.id : "";

    });

    // ✅ Filters
    const filters = {};

    // Brand filter
    const brandAgg = await Product.aggregate([
      { $match: { sub_category_id: subCategory.id, status: "Active" } },
      { $group: { _id: "$brand", count: { $sum: 1 } } },
      { $match: { _id: { $ne: null } } },
    ]);
    filters.brand = await Promise.all(
      brandAgg.map(async (b) => {
        const doc = await Brand.findById(b.id).lean();
        return doc ? { value: doc.name, count: b.count } : null;
      })
    ).then((arr) => arr.filter(Boolean).sort((a, b) => b.count - a.count));

    // Simple fields
    const filterFields = [
      "spf",
      "size_chart_type",
      "colours",
      "flavours",
      "protein_type",
      "formulation",
      "staging",
      "skin_type",
      "hair_type",
    ];
    for (const field of filterFields) {
      const result = await Product.aggregate([
        { $match: { sub_category_id: subCategory.id, status: "Active" } },
        { $group: { _id: `$${field}`, count: { $sum: 1 } } },
        { $match: { _id: { $nin: [null, "", "undefined", "null"] } } },
      ]);
      if (result.length) {
        filters[field] = result
          .map((r) => ({ value: r._id, count: r.count }))
          .filter(f => f.value) // ✅ remove null values
          .sort((a, b) => b.count - a.count);
      }
    }

    // Preferences filter
    const prefAgg = await Product.aggregate([
      { $match: { sub_category_id: subCategory.id, status: "Active" } },
      {
        $project: {
          prefs: {
            $setUnion: [
              [{ $ifNull: ["$preference", null] }],
              [{ $ifNull: ["$preference_2", null] }],
              [{ $ifNull: ["$preference_3", null] }],
            ],
          },
        },
      },
      { $unwind: "$prefs" },
      { $match: { prefs: { $nin: [null, "", "undefined", "null"] } } },
      { $group: { _id: "$prefs", count: { $sum: 1 } } },
    ]);
    filters.preference = prefAgg
      .map((p) => ({ value: p._id, count: p.count }))
      .filter(f => f.value) // ✅ remove null values
      .sort((a, b) => b.count - a.count);

    // Concern filter
    const concernAgg = await Product.aggregate([
      { $match: { sub_category_id: subCategory.id, status: "Active" } },
      {
        $project: {
          concerns: {
            $setUnion: [
              [{ $ifNull: ["$concern_1", null] }],
              [{ $ifNull: ["$concern_2", null] }],
              [{ $ifNull: ["$concern_3", null] }],
            ],
          },
        },
      },
      { $unwind: "$concerns" },
      { $match: { concerns: { $nin: [null, "", "undefined", "null"] } } },
      { $group: { _id: "$concerns", count: { $sum: 1 } } },
    ]);
    filters.concern = await Promise.all(
      concernAgg.map(async (c) => {
        const doc = await Concern.findById(c.id).lean();
        return doc ? { value: doc.name, count: c.count } : null;
      })
    ).then((arr) => arr.filter(Boolean).sort((a, b) => b.count - a.count));

    const cleanedFilters = cleanFilters(filters);
    // ✅ Response
    res.status(200).json({
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
        currentPage: page,
        itemsPerPage: pageSize,
      },
      products,
      catadata: subCategory,
      filters: cleanedFilters,
      allowedSortFields,
    });
  } catch (error) {
    console.error("Error in /subcategory-products/:slug:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



// ✅ Sub-Sub-Category Products API
export const subSubCategoryProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 30;
    const sortBy = req.query.sortBy || "ranking";
    const slugName = req.params.slug;

    if (!allowedSortFields.includes(sortBy)) {
      return res.status(400).json({ error: "Invalid sortBy parameter" });
    }
    // const sortValue = await sortByValue(sortBy);

    // ✅ Find sub-sub-category by slug
    const subSubCategory = await SubSubCategory.findOne({ slug: slugName }).lean();
    if (!subSubCategory) {
      return res.status(404).json({ error: "Sub-sub-category not found" });
    }
    const subsub_id = subSubCategory.id;

    // ✅ Fetch category name using category_id inside SubSubCategory
    let categoryName = null;
    if (subSubCategory.category_id) {
      const categoryDoc = await Category.findOne({ id: subSubCategory.category_id }).lean();
      categoryName = categoryDoc ? categoryDoc.name : null;
    }

    // ✅ Dynamic Filters
    const andConditions = [
      { sub_sub_category_id: subsub_id },
      { status: "Active" },
    ];

    if (req.query.brand) {
      const brands = await Brand.find({ name: { $in: req.query.brand.split(",") } }).lean();
      const brandIds = brands.map(b => b.id);
      if (brandIds.length) andConditions.push({ brand: { $in: brandIds } });
    }

    if (req.query.preference) {
      const prefNames = req.query.preference.split(",");
      andConditions.push({
        $or: [
          { preference: { $in: prefNames } },
          { preference_2: { $in: prefNames } },
          { preference_3: { $in: prefNames } },
        ],
      });
    }

    if (req.query.concern) {
      const concernNames = req.query.concern.split(",");
      const concernDocs = await Concern.find({ name: { $in: concernNames } }).lean();
      const concernIds = concernDocs.map(c => c.id);
      andConditions.push({
        $or: [
          { concern_1: { $in: concernIds } },
          { concern_2: { $in: concernIds } },
          { concern_3: { $in: concernIds } },
        ],
      });
    }

    if (req.query.minPrice || req.query.maxPrice) {
      const priceCond = {};
      if (req.query.minPrice) priceCond.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) priceCond.$lte = parseFloat(req.query.maxPrice);
      andConditions.push({ final_price: priceCond });
    }

    const finalQuery = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    const totalItems = await Product.countDocuments(finalQuery);
        let sortValue = {};
if (req.query.sortBy) {
  const [field, order] = req.query.sortBy.split(" ");
  sortValue[field] = order === "desc" ? -1 : 1;
} else {
  sortValue = { ranking: 1 }; // default
}

    // const products = await Product.find(finalQuery)
    //   .populate("brand", "name")
    //   .populate("category_id", "name slug")
    //   .populate("sub_category_id", "name slug")
    //   .populate("sub_sub_category_id", "name slug")
    //   .populate("sub_sub_sub_category_id", "name slug")
    //   .sort(sortValue)
    //   .skip((page - 1) * pageSize)
    //   .limit(pageSize)
    //   .lean();


            const products = await Product.aggregate([
  //  Filter (same as find)
  { $match: finalQuery },

  // Join with brands collection (LEFT JOIN)
  {
    $lookup: {
      from: "brands",             // name of the Brand collection
      localField: "brand",        // field in Product
      foreignField: "id",        // field in Brand
      as: "brand"                 // output field name
    }
  },

  // Unwind to turn the joined brand array into an object
  {
    $unwind: {
      path: "$brand",
      preserveNullAndEmptyArrays: true // keep products even without a brand (LEFT JOIN behavior)
    }
  },

  // Sort (same as .sort(sortValue))
  { $sort: sortValue },

  // Pagination (same as skip + limit)
  { $skip: (page - 1) * pageSize },
  { $limit: pageSize },

]);

    // ✅ Filters
    const filters = {};

    // 🔹 Brand filter (return brand names only, remove nulls)
    const brandAgg = await Product.aggregate([
      { $match: { sub_sub_category_id: subsub_id, status: "Active" } },
      { $group: { _id: "$brand", count: { $sum: 1 } } },
      { $match: { _id: { $nin: [null, "", "null", "undefined"] } } },
    ]);
    const brandIds = brandAgg.map(b => b._id);
    const brandDocs = await Brand.find({ id: { $in: brandIds } }).lean();
    const brandMap = brandDocs.reduce((acc, b) => {
      acc[b.id] = b.name;
      return acc;
    }, {});
    filters.brand = brandAgg
      .map(b => ({ value: brandMap[b._id] || null, count: b.count }))
      .filter(b => b.value) // 🚀 remove null values
      .sort((a, b) => b.count - a.count);

    // 🔹 Simple filter fields (remove nulls)
    const filterFields = [
      "spf", "size_chart_type", "colours", "flavours",
      "protein_type", "formulation", "staging", "skin_type", "hair_type"
    ];
    for (const field of filterFields) {
      const result = await Product.aggregate([
        { $match: { sub_sub_category_id: subsub_id, status: "Active" } },
        { $group: { _id: `$${field}`, count: { $sum: 1 } } },
        { $match: { _id: { $nin: [null, "", "null", "undefined"] } } },
      ]);
      if (result.length) {
        filters[field] = result
          .map(r => ({ value: r._id, count: r.count }))
          .sort((a, b) => b.count - a.count);
      }
    }

    // 🔹 Preference filter (remove nulls)
    const prefAgg = await Product.aggregate([
      { $match: { sub_sub_category_id: subsub_id, status: "Active" } },
      {
        $project: {
          prefs: {
            $setUnion: [
              [{ $ifNull: ["$preference", null] }],
              [{ $ifNull: ["$preference_2", null] }],
              [{ $ifNull: ["$preference_3", null] }],
            ],
          },
        },
      },
      { $unwind: "$prefs" },
      { $match: { prefs: { $nin: [null, "", "null", "undefined"] } } },
      { $group: { _id: "$prefs", count: { $sum: 1 } } },
    ]);
    filters.preference = prefAgg
      .map(p => ({ value: p._id, count: p.count }))
      .sort((a, b) => b.count - a.count);

    // 🔹 Concern filter (map IDs → names, remove nulls)
    const concernAgg = await Product.aggregate([
      { $match: { sub_sub_category_id: subsub_id, status: "Active" } },
      {
        $project: {
          concerns: {
            $setUnion: [
              [{ $ifNull: ["$concern_1", null] }],
              [{ $ifNull: ["$concern_2", null] }],
              [{ $ifNull: ["$concern_3", null] }],
            ],
          },
        },
      },
      { $unwind: "$concerns" },
      { $match: { concerns: { $nin: [null, "", "null", "undefined"] } } },
      { $group: { _id: "$concerns", count: { $sum: 1 } } },
    ]);
    const concernIds = concernAgg.map(c => c.id);
    const concernDocs = await Concern.find({ id: { $in: concernIds } }).lean();
    const concernMap = concernDocs.reduce((acc, c) => {
      acc[c.id] = c.name;
      return acc;
    }, {});
    filters.concern = concernAgg
      .map(c => ({ value: concernMap[c.id] || null, count: c.count }))
      .filter(c => c.value) // 🚀 remove null values
      .sort((a, b) => b.count - a.count);

    // ✅ Product images & category name
    products.forEach((product) => {
      // product.product_images = product.product_images?.length
      //   ? product.product_images.map((img, index) => ({
      //       image: img.url || img,
      //       sortOrder: img.sortOrder || index + 1,
      //     }))
      //   : [];
      product.category_name = categoryName;
      product.brand_name = product?.brand?.name ? product.brand.name : "";
      product.brand = product?.brand?.id ? product.brand.id : "";
    });
    const cleanedFilters = cleanFilters(filters);
    res.status(200).json({
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
        currentPage: page,
        itemsPerPage: pageSize,
      },
      products,
      catadata: subSubCategory,
      filters: cleanedFilters,
      allowedSortFields,
    });
  } catch (err) {
    console.error("Error in /subsubcategory-products/:slug:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



export const concernProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 30;
    const sortBy = req.query.sortBy || "ranking";
    const slug = req.params.slug;

    if (!allowedSortFields.includes(sortBy)) {
      return res.status(400).json({ error: `Invalid sortBy parameter '${sortBy}'` });
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortBy === "vendor_article_name" ? 1 : -1;
    // const sortValue = await sortByValue(sortBy);

    // Find concern ID by slug
    const concern = await Concern.findOne({ slug });
    if (!concern) {
      return res.status(404).json({ error: "Concern not found" });
    }

    // Base query for concern only (used for filters)
    const baseQuery = {
      status: "Active",
      $or: [
        { concern_1: concern.id },
        { concern_2: concern.id },
        { concern_3: concern.id },
      ],
    };

    // Actual query with filters applied
    const query = { ...baseQuery };

    // Apply dynamic filters
    const ignoredKeys = ["page", "pageSize", "sortBy", "search_term"];
    for (const key of Object.keys(req.query)) {
      if (!ignoredKeys.includes(key)) {
        if (key === "brand") {
          const brandNames = req.query.brand.split(",");
          const brandDocs = await Brand.find({ name: { $in: brandNames } });
          const brandIds = brandDocs.map((b) => b.id);
          query.brand = { $in: brandIds };
        } else if (key === "minPrice") {
          query.final_price = { ...(query.final_price || {}), $gte: parseFloat(req.query[key]) };
        } else if (key === "maxPrice") {
          query.final_price = { ...(query.final_price || {}), $lte: parseFloat(req.query[key]) };
        } else if (key === "min_age_years") {
          const ageRange = decodeURIComponent(req.query[key]);
          const [min, max] = ageRange.replace(/\+/g, " ").split("to").map(v => parseInt(v.trim(), 10));
          if (!isNaN(min)) query.min_age_years = { ...(query.min_age_years || {}), $gte: min };
          if (!isNaN(max)) query.max_age_years = { ...(query.max_age_years || {}), $lte: max };
        } else {
          let keys = req.query[key].split(",");
          query[key] = { $in: keys };
        }
      }
    }

    // Fetch products
    const totalItems = await Product.countDocuments(query);

let sortValue = {};
if (req.query.sortBy) {
  const [field, order] = req.query.sortBy.split(" ");
  sortValue[field] = order === "desc" ? -1 : 1;
} else {
  sortValue = { ranking: 1 }; // default
}

    // const products = await Product.find(query)
    //   .populate("brand", "name")
    //   .populate("category_id", "name slug")
    //   .populate("sub_category_id", "name slug")
    //   .populate("sub_sub_category_id", "name slug")
    //   .populate("sub_sub_sub_category_id", "sub_sub_sub_category_name slug")
    //   .sort(sortValue)
    //   .skip((page - 1) * pageSize)
    //   .limit(pageSize)
    //   .lean();

  const products = await Product.aggregate([
  //  Filter (same as find)
  { $match: query },

  // Join with brands collection (LEFT JOIN)
  {
    $lookup: {
      from: "brands",             // name of the Brand collection
      localField: "brand",        // field in Product
      foreignField: "id",        // field in Brand
      as: "brand"                 // output field name
    }
  },

  // Unwind to turn the joined brand array into an object
  {
    $unwind: {
      path: "$brand",
      preserveNullAndEmptyArrays: true // keep products even without a brand (LEFT JOIN behavior)
    }
  },

  // Sort (same as .sort(sortValue))
  { $sort: sortValue },

  // Pagination (same as skip + limit)
  { $skip: (page - 1) * pageSize },
  { $limit: pageSize },

]);



    const productIds = products.map((p) => p.id);
    const reviews = await ProductReview.find({
      productid: { $in: productIds },
      status: "Approved"
    }).lean();

    const reviewsByProductId = {};
    for (const review of reviews) {
      const pid = review.productId;
      if (!reviewsByProductId[pid]) reviewsByProductId[pid] = [];
      reviewsByProductId[pid].push(review);
    }

    products.forEach((product) => {
      product.product_images = product.product_images?.length ? [product.product_images[0]] : [];
      product.product_reviews = reviewsByProductId[product._id.toString()] || [];
      product.brand_name = product?.brand?.name ? product.brand.name : "";
      product.brand = product?.brand?.id ? product.brand.id : "";

    });

    // Build filters from baseQuery (null/undefined removed)
    const filterFields = [
      "brand",
      "skin_type",
      "spf",
      "size_chart_type",
      "colours",
      "flavours",
      "protein_type",
      "diaper_style",
      "formulation",
      "staging",
      "min_age_years",
    ];
    const filters = {};

    for (const field of filterFields) {
      if (field === "brand") {
        const result = await Product.aggregate([
          { $match: baseQuery },
          { $group: { _id: "$brand", count: { $sum: 1 } } },
          {
            $lookup: {
              from: "brands",
              localField: "_id",
              foreignField: "id",
              as: "brandInfo",
            },
          },
          { $unwind: "$brandInfo" },
          {
            $project: {
              value: "$brandInfo.name",
              count: 1,
            },
          },
          { $match: { value: { $nin: [null, "", "undefined", "null"] } } }, // remove nulls
        ]);
        filters[field] = result;
      } else if (field === "min_age_years") {
        const result = await Product.aggregate([
          { $match: baseQuery },
          {
            $group: {
              _id: { min: "$min_age_years", max: "$max_age_years" },
              count: { $sum: 1 },
            },
          },
          { $match: { "_id.min": { $ne: null }, "_id.max": { $ne: null } } }, // remove nulls
        ]);
        filters[field] = result.map((r) => ({
          value: `${r._id.min} to ${r._id.max}`,
          count: r.count,
        }));
      } else {
        const result = await Product.aggregate([
          { $match: baseQuery },
          { $group: { _id: `$${field}`, count: { $sum: 1 } } },
          { $match: { _id: { $nin: [null, "", "undefined", "null"] } } }, // remove nulls
        ]);
        filters[field] = result.map((r) => ({ value: r._id, count: r.count }));
      }
    }

    // Concern-related popups
    const popups = await Popup.find({
      status: "Active",
      concern: { $in: [concern.id] },
    }).limit(1).lean();
    const cleanedFilters = cleanFilters(filters);

    // const sortedData = Object.fromEntries(
    //    Object.entries(cleanedFilters).map(([key, arr]) => [
    //    key,
    //    [...arr].sort((a, b) => a.value.localeCompare(b.value, 'en', { sensitivity: 'base' }))
    // ])
    // );
    const sortedData = Object.fromEntries(
  Object.entries(cleanedFilters).map(([key, arr]) => [
    key,
    [...arr].sort((a, b) =>
      String(a?.value ?? '').localeCompare(String(b?.value ?? ''), 'en', { sensitivity: 'base' })
    )
  ])
);

    res.status(200).json({
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
        currentPage: page,
        itemsPerPage: pageSize,
      },
      products,
      catadata: concern,
      filters: sortedData,
      allowedSortFields,
      popups,
    });
  } catch (error) {
    console.error("Error in concernProducts:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};




export const brandProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 30;
    const sortBy = req.query.sortBy || "ranking";
    const slug = req.params.slug;
    const sanitizedSlug = slug.replace(/[^a-zA-Z0-9]/g, "");
    console.log("sanitizedSlug",sanitizedSlug);
    const regexPattern = sanitizedSlug
      .split("")              // split into letters
      .map(char => char + "[\\s.-]*") // allow spaces, dots, dashes in between
      .join("");
    // const allowedSortFields = [
    //   "ranking",
    //   "mrp",
    //   "final_price",
    //   "vendor_article_name",
    //   // add more fields as needed
    // ];

    if (!allowedSortFields.includes(sortBy)) {
      return res.status(400).json({ error: `Invalid sortBy parameter '${sortBy}'` });
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortBy === "vendor_article_name" ? 1 : -1;
    const sortValue = await sortByValue(sortBy);

    // Get the brand ID by slug
    // const brandDoc = await Brand.findOne({ name: slug });
    const brandDoc = await Brand.findOne({name: { $regex: new RegExp(regexPattern, "i") }, });
    if (!brandDoc) {
      return res.status(404).json({ error: "Brand not found" });
    }

    const brandId = brandDoc.id;

    // Construct query
    const query = { brand: brandDoc.id, status: "Active" };

    // Apply dynamic filters
    // const ignoredKeys = ["page", "pageSize", "sortBy"];
    // for (const key of Object.keys(req.query)) {
    //   if (!ignoredKeys.includes(key)) {
    //     const value = req.query[key];
    //     if (key === "brand") continue; // already applied via slug

    //     if (key === "minPrice") {
    //       query.final_price = { ...query.final_price, $gte: parseFloat(value) };
    //     } else if (key === "maxPrice") {
    //       query.final_price = { ...query.final_price, $lte: parseFloat(value) };
    //     } else {
    //       // query[key] = value;
    //       let keys = req.query[key].split(",");
    //       query[key] = { $in: keys };
    //     }
    //   }
    // }

    // Apply dynamic filters
    const ignoredKeys = ["page", "pageSize", "sortBy", "search_term"];
    for (const key of Object.keys(req.query)) {
      if (!ignoredKeys.includes(key)) {
        if (key === "brand") {
          const brandNames = req.query.brand.split(",");
          const brandDocs = await Brand.find({ name: { $in: brandNames } });
          const brandIds = brandDocs.map((b) => b.id);
          query.brand = { $in: brandIds };
        } else if (key === "minPrice") {
          query.final_price = { ...(query.final_price || {}), $gte: parseFloat(req.query[key]) };
        } else if (key === "maxPrice") {
          query.final_price = { ...(query.final_price || {}), $lte: parseFloat(req.query[key]) };
        } else if (key === "min_age_years") {
          const ageRange = decodeURIComponent(req.query[key]);
          const [min, max] = ageRange.replace(/\+/g, " ").split("to").map(v => parseInt(v.trim(), 10));
          if (!isNaN(min)) query.min_age_years = { ...(query.min_age_years || {}), $gte: min };
          if (!isNaN(max)) query.max_age_years = { ...(query.max_age_years || {}), $lte: max };
        } else {
          let keys = req.query[key].split(",");
          query[key] = { $in: keys };
        }
      }
    }

    const totalItems = await Product.countDocuments(query);

    const products = await Product.find(query)
      .populate("brand", "name")
      .populate("category_id", "name slug")
      .populate("sub_category_id", "name slug")
      .populate("sub_sub_category_id", "name slug")
      .populate("sub_sub_sub_category_id", "sub_sub_sub_category_name slug")
      .sort(sortValue)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    const productIds = products.map((p) => p.product_id);
    const reviews = await ProductReview.find({ productid: { $in: productIds }, status: "Approved" }).lean();

    const reviewsByProductId = {};
    for (const review of reviews) {
      const pid = review.productId;
      if (!reviewsByProductId[pid]) reviewsByProductId[pid] = [];
      reviewsByProductId[pid].push(review);
    }

    // Attach image, review placeholders
    products.forEach((product) => {
      product.product_images = product.product_images?.length ? [product.product_images[0]] : [];
      product.product_reviews = reviewsByProductId[product._id.toString()] || [];
      product.faqs = product.faqs || [];
    });

    // Build filter aggregations
    const filterFields = [
      "skin_type",
      "age_group",
      "spf",
      "size_chart_type",
      "colours",
      "flavours",
      "protein_type",
      "diaper_style",
      "formulation",
      "staging",
      "min_age_years",
    ];

    // ✅ Filters (cleaned null/undefined values)
    const filters = {};
    for (const field of filterFields) {
      if (field === "min_age_years") {
        const ageAgg = await Product.aggregate([
          { $match: query },
          {
            $group: {
              _id: { min: "$min_age_years", max: "$max_age_years" },
              count: { $sum: 1 },
            },
          },
        ]);
        filters[field] = ageAgg
          .filter(r => r._id.min != null && r._id.max != null)
          .map((r) => ({
            value: `${r._id.min} to ${r._id.max}`,
            count: r.count,
          }));
      } else {
        const result = await Product.aggregate([
          { $match: query },
          {
            $group: {
              _id: `$${field}`,
              count: { $sum: 1 },
            },
          },
        ]);
        filters[field] = result
          .filter((r) => r._id != null && r._id !== "" && r._id !== "undefined" && r._id !== "null")
          .map((r) => ({ value: r._id, count: r.count }))
          .sort((a, b) => b.count - a.count);
      }
    }

    // Popups related to the brand
    const popups = await Popup.find({
      status: "Active",
      brand: brandId,
    })
      .limit(1)
      .lean();
    const cleanedFilters = cleanFilters(filters);
    res.status(200).json({
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
        currentPage: page,
        itemsPerPage: pageSize,
      },
      products,
      catadata: brandDoc,
      filters: cleanedFilters,
      allowedSortFields,
      popups,
    });
  } catch (error) {
    console.error("Error in /brand-products/:slug:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const adminFetchProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 13000;

    const totalItems = await Product.countDocuments({});

    const products = await Product.find({})
      .sort({ _id: -1 }) // Sort by ID descending like ORDER BY id DESC
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    const productIds = products.map((p) => p.product_id);

    // Fetch images and FAQs
    const assets = await Product.find({ prod_id: { $in: productIds } }).lean();

    const imagesByProdId = {};
    const faqsByProdId = {};

    for (const asset of assets) {
      const pid = asset.prod_id;
      if (asset.type === "image") {
        if (!imagesByProdId[pid]) imagesByProdId[pid] = [];
        imagesByProdId[pid].push(asset);
      } else if (asset.type === "faq") {
        if (!faqsByProdId[pid]) faqsByProdId[pid] = [];
        faqsByProdId[pid].push(asset);
      }
    }

    // Collect concern and preference IDs
    const concernIdSet = new Set();
    const preferenceIdSet = new Set();

    products.forEach((p) => {
      ["concern_1", "concern_2", "concern_3"].forEach((key) => p[key] && concernIdSet.add(p[key]));
      ["preference_1", "preference_2", "preference_3"].forEach((key) => p[key] && preferenceIdSet.add(p[key]));
    });

    //     const concerns = await Concern.find({ _id: { $in: Array.from(concernIdSet) } }).lean();
    //     const preferences = await Preference.find({ name: { $in: Array.from(preferenceIdSet) } }).lean();
    // console.log("concerns",concerns);
    // console.log("preferences",preferences);
    //     const concernMap = {};
    //     const preferenceMap = {};

    //concerns.forEach((c) => (concernMap[c._id] = { value: c._id, label: c.name }));
    // preferences.forEach((p) => (preferenceMap[p.name] = { value: p.name, label: p.name }));

    // Enrich products
    products.forEach((p) => {
      const pid = p.product_id;
      //p.product_images = imagesByProdId[pid] || [];
      p.product_faq_array = faqsByProdId[pid] || [];

      // const concernIds = [p.concern_1, p.concern_2, p.concern_3].filter(Boolean);
      // p.product_concern_array = concernIds.map((id) => concernMap[id]).filter(Boolean);

      // const preferenceKeys = [p.preference_1, p.preference_2, p.preference_3].filter(Boolean);
      // p.product_preference_array = preferenceKeys.map((name) => preferenceMap[name]).filter(Boolean);
    });

    res.status(200).json({
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
        currentPage: page,
        itemsPerPage: pageSize,
      },
      products,
    });
  } catch (error) {
    console.error("Error in /admin-fetch-products:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
// export const adminFetchProducts = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const pageSize = parseInt(req.query.pageSize) || 13000;

//     const cacheKey = `products_page_${page}_size_${pageSize}`;
//     const cachedData = cache.get(cacheKey);

//     // ✅ Serve from cache if available
//     if (cachedData) {
//       console.log("🟢 Serving from cache:", cacheKey);
//       return res.status(200).json(cachedData);
//     }

//      // 🧭 Fetch fresh data from DB
//     const totalItems = await Product.countDocuments({});

//     const products = await Product.find({})
//       .sort({ _id: -1 }) // Sort by ID descending like ORDER BY id DESC
//       .skip((page - 1) * pageSize)
//       .limit(pageSize)
//       .lean();

//     const productIds = products.map((p) => p.product_id);

//     // Fetch images and FAQs
//     const assets = await Product.find({ prod_id: { $in: productIds } }).lean();

//     const imagesByProdId = {};
//     const faqsByProdId = {};

//     for (const asset of assets) {
//       const pid = asset.prod_id;
//       if (asset.type === "image") {
//         if (!imagesByProdId[pid]) imagesByProdId[pid] = [];
//         imagesByProdId[pid].push(asset);
//       } else if (asset.type === "faq") {
//         if (!faqsByProdId[pid]) faqsByProdId[pid] = [];
//         faqsByProdId[pid].push(asset);
//       }
//     }

//     // Collect concern and preference IDs
//     const concernIdSet = new Set();
//     const preferenceIdSet = new Set();

//     products.forEach((p) => {
//       ["concern_1", "concern_2", "concern_3"].forEach((key) => p[key] && concernIdSet.add(p[key]));
//       ["preference_1", "preference_2", "preference_3"].forEach((key) => p[key] && preferenceIdSet.add(p[key]));
//     });

//     //     const concerns = await Concern.find({ _id: { $in: Array.from(concernIdSet) } }).lean();
//     //     const preferences = await Preference.find({ name: { $in: Array.from(preferenceIdSet) } }).lean();
//     // console.log("concerns",concerns);
//     // console.log("preferences",preferences);
//     //     const concernMap = {};
//     //     const preferenceMap = {};

//     //concerns.forEach((c) => (concernMap[c._id] = { value: c._id, label: c.name }));
//     // preferences.forEach((p) => (preferenceMap[p.name] = { value: p.name, label: p.name }));

//     // Enrich products
//     products.forEach((p) => {
//       const pid = p.product_id;
//       //p.product_images = imagesByProdId[pid] || [];
//       p.product_faq_array = faqsByProdId[pid] || [];

//       // const concernIds = [p.concern_1, p.concern_2, p.concern_3].filter(Boolean);
//       // p.product_concern_array = concernIds.map((id) => concernMap[id]).filter(Boolean);

//       // const preferenceKeys = [p.preference_1, p.preference_2, p.preference_3].filter(Boolean);
//       // p.product_preference_array = preferenceKeys.map((name) => preferenceMap[name]).filter(Boolean);
//     });

//     const responseData = {
//       pagination: {
//         totalItems,
//         totalPages: Math.ceil(totalItems / pageSize),
//         currentPage: page,
//         itemsPerPage: pageSize,
//       },
//       products,
//     };

//     // 💾 Save to cache
//     cache.set(cacheKey, responseData);
//     console.log("🟡 Cached data:", cacheKey);

//     res.status(200).json(responseData);
//   } catch (error) {
//     console.error("Error in /admin-fetch-products:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };
// ✅ Helper: safely convert to Number or null
function toNumberOrNull(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && (value.toLowerCase() === "null" || value.trim() === "")) return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

export const adminFetchProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const prod = await Product.findOne({ product_id: Number(id) }).lean();
    if (!prod) return res.status(404).json({ error: "Product not found" });

    // ✅ Category
    const categoryId = toNumberOrNull(prod.category_id);
    let category_slug = null;
    if (categoryId !== null) {
      const category = await Category.findOne({ id: categoryId }).select({ slug: 1, _id: 0 });
      if (category) category_slug = category.slug;
    }

    // ✅ Subcategory
    const subcategoryId = toNumberOrNull(prod.subcategory_id);
    let subcategory_slug = null;
    if (subcategoryId !== null) {
      const subcat = await SubCategory.findOne({ id: subcategoryId }).select({ slug: 1, _id: 0 });
      if (subcat) subcategory_slug = subcat.slug;
    }

    // ✅ SubSubcategory
    const subsubcategoryId = toNumberOrNull(prod.subsubcategory_id);
    let subsubcategory_slug = null;
    if (subsubcategoryId !== null) {
      const subsubcat = await SubSubCategory.findOne({ id: subsubcategoryId }).select({ slug: 1, _id: 0 });
      if (subsubcat) subsubcategory_slug = subsubcat.slug;
    }

    // ✅ Brand
    const brandId = toNumberOrNull(prod.brand_id);
    let brandData = null;
    if (brandId !== null) {
      const brand = await Brand.findOne({ id: brandId }).select({ id: 1, name: 1, _id: 0 });
      if (brand) brandData = { value: brand.id, label: brand.name };
    }

    // ✅ Concerns
    const productConcernIds = [prod.concern_1, prod.concern_2, prod.concern_3]
      .map(toNumberOrNull)
      .filter((v) => v !== null);

    let product_concern_array = [];
    if (productConcernIds.length) {
      const concerns = await Concern.find({ id: { $in: productConcernIds } }).select({ id: 1, name: 1, slug: 1, _id: 0 });
      product_concern_array = concerns.map(c => ({ value: c.id, label: c.name, slug: c.slug }));
    }

    // ✅ Preferences
    const rawPrefIds = [prod.preference_1, prod.preference_2, prod.preference_3].filter(Boolean);
    let product_preference_array = [];
    if (rawPrefIds.length) {
      const numericPrefs = rawPrefIds.map(toNumberOrNull).filter((v) => v !== null);
      const stringPrefs = rawPrefIds.filter(x => isNaN(Number(x)) && x.toLowerCase() !== "null");
      const prefQuery = { $or: [] };
      if (numericPrefs.length) prefQuery.$or.push({ id: { $in: numericPrefs } });
      if (stringPrefs.length) prefQuery.$or.push({ name: { $in: stringPrefs } });
      if (prefQuery.$or.length) {
        const prefs = await Preference.find(prefQuery).select({ id: 1, name: 1, slug: 1, _id: 0 });
        product_preference_array = prefs.map(p => ({ value: p.id, label: p.name, slug: p.slug }));
      }
    }

    // ✅ Skin Types
    const skinTypeIds = [prod.skin_type_1, prod.skin_type_2, prod.skin_type_3]
      .map(toNumberOrNull)
      .filter((v) => v !== null);

    let product_skin_type_array = [];
    if (skinTypeIds.length) {
      const skinTypes = await SkinType.find({ id: { $in: skinTypeIds } }).select({ id: 1, name: 1, slug: 1, _id: 0 });
      product_skin_type_array = skinTypes.map(s => ({ value: s.id, label: s.name, slug: s.slug }));
    }

    // ✅ Final Response
    const response = {
      ...prod,
      category_slug,
      subcategory_slug,
      subsubcategory_slug,
      brand: brandData,
      product_concern_array,
      product_preference_array,
      product_skin_type_array,
    };

    res.json(response);
  } catch (err) {
    console.error("❌ Error in adminFetchProductById:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const getBrandById = async (req, res) => {
  try {
    const bid = req.params.id;

    if (!bid || !bid.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Please pass a valid brand ID" });
    }

    const brand = await Brand.findById(bid).lean();

    if (!brand) {
      return res.status(404).json({ error: "Brand not found" });
    }

    res.status(200).json(brand);
  } catch (error) {
    console.error("Error in getBrandById:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
export const getNewTopPics = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 8;
    const startIndex = (page - 1) * pageSize;

    const productLookupPipeline = [
      {
        $lookup: {
          from: "categories",
          localField: "category_id",
          foreignField: "id",
          as: "category"
        }
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "subcategories",
          localField: "sub_category_id",
          foreignField: "id",
          as: "sub_category"
        }
      },
      { $unwind: { path: "$sub_category", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "subsubcategories",
          localField: "sub_sub_category_id",
          foreignField: "id",
          as: "sub_sub_category"
        }
      },
      { $unwind: { path: "$sub_sub_category", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "subsubsubcategories",
          localField: "sub_sub_sub_category_id",
          foreignField: "id",
          as: "sub_sub_sub_category"
        }
      },
      { $unwind: { path: "$sub_sub_sub_category", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "id",
          as: "brand"
        }
      },
      { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },

      {
        $project: {
          product_id: 1,
          vendor_article_name: 1,
          mrp: 1,
          final_price: 1,
          description: 1,
          discount_percent: 1,
          price: 1,
          status: 1,
          slug: 1,
          new_arrival: 1,
          top_picks: 1,
          newarrival_ranking: 1,
          toppics_ranking: 1,

          // // ✅ Always output images in required format
          product_images: 1,
          // ✅ Flattened category/subcategory names
          category_name: "$category.name",
          category_slug: "$category.slug",
          sub_category_name: "$sub_category.name",
          sub_category_slug: "$sub_category.slug",
          sub_sub_category_name: "$sub_sub_category.name",
          sub_sub_category_slug: "$sub_sub_category.slug",
          sub_sub_sub_category_name: "$sub_sub_sub_category.name",
          sub_sub_sub_category_slug: "$sub_sub_sub_category.slug",
          brand_name: "$brand.name"
        }
      }
    ];

    // New Arrivals
    const newArrivals = await Product.aggregate([
      { $match: { status: "Active", new_arrival: 1 } },
      ...productLookupPipeline,
      { $sort: { newarrival_ranking: 1 } },
      { $skip: startIndex },
      { $limit: pageSize }
    ]);

    // Top Picks
    const topPics = await Product.aggregate([
      { $match: { status: "Active", top_picks: 1 } },
      ...productLookupPipeline,
      { $sort: { toppics_ranking: 1 } }
    ]);

    // Collect all product IDs
    const productIds = [
      ...newArrivals.map(p => p.product_id),
      ...topPics.map(p => p.product_id)
    ];

    // Fetch reviews
    const productReviews = await ProductReview.find({
      productid: { $in: productIds },
      status: "Approved"
    }).lean();

    // Attach reviews to products
    const attachReviews = (products) =>
      products.map(product => ({
        ...product,
        product_reviews: productReviews.filter(r => r.productid === product.product_id)
      }));

    const finalNewArrivals = attachReviews(newArrivals);
    const finalTopPics = attachReviews(topPics);

    // Count for pagination
    const totalItems = await Product.countDocuments({
      status: "Active",
      new_arrival: 1
    });

    res.status(200).json({
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
        currentPage: page,
        itemsPerPage: pageSize
      },
      topPics: finalTopPics,
      newArrivals: finalNewArrivals
    });

  } catch (error) {
    console.error("Error retrieving products:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getProductsByGroup = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 30;
    const slugName = req.params.slug || req.query.url;
    const minAge = parseInt(req.query.min) || 0;
    const maxAge = parseInt(req.query.max) || 0;

    if (!slugName) {
      return res.status(400).json({ error: "Group is required" });
    }

    // ✅ base condition
    let match = { status: "Active" };

    if (slugName === "new-arrivals") {
      match.new_arrival = 1;
    } else if (slugName === "top-picks") {
      match.top_picks = 1;
    } else if (slugName === "shop-by-age") {
      match.min_age_years = { $lte: maxAge };
      match.max_age_years = { $gte: minAge };
    }

    let clone_match = JSON.parse(JSON.stringify(match));

    // Apply dynamic filters
    const ignoredKeys = ["page", "pageSize", "sortBy", "search_term", "min", "max"];
    for (const key of Object.keys(req.query)) {
      if (!ignoredKeys.includes(key)) {
        if (key === "brand") {
          const brandNames = req.query.brand.split(",");
          const brandDocs = await Brand.find({ name: { $in: brandNames } });
          const brandIds = brandDocs.map((b) => b.id);
          match.brand = { $in: brandIds };
        } else if (key === "minPrice") {
          match.final_price = { ...(match.final_price || {}), $gte: parseFloat(req.query[key]) };
        } else if (key === "maxPrice") {
          match.final_price = { ...(match.final_price || {}), $lte: parseFloat(req.query[key]) };
        } else if (key === "min_age_years") {
          const ageRange = decodeURIComponent(req.query[key]);
          const [min, max] = ageRange.replace(/\+/g, " ").split("to").map(v => parseInt(v.trim(), 10));
          if (!isNaN(min)) match.min_age_years = { ...(match.min_age_years || {}), $gte: min };
          if (!isNaN(max)) match.max_age_years = { ...(match.max_age_years || {}), $lte: max };
        } else {
          let keys = req.query[key].split(",");
          match[key] = { $in: keys };
        }
      }
    }


    // // ✅ dynamic filters
    // const dynamicFilters = Object.keys(req.query).filter(
    //   (key) => !["page", "pageSize", "sortBy", "min", "max", "url"].includes(key)
    // );

    // dynamicFilters.forEach((key) => {
    //   if (key === "brand") {
    //     const brandIds = req.query[key]
    //     .split(",")
    //     .map((id) => parseInt(id))
    //     .filter((id) => !isNaN(id));
    //     if (brandIds.length > 0) {
    //       match.brand = { $in: brandIds };
    //     }
    //   } else if (key === "concern") {
    //     const concernId = parseInt(req.query[key]);
    //     match.$or = [
    //       { concern_1: concernId },
    //       { concern_2: concernId },
    //       { concern_3: concernId },
    //     ];
    //   } else if (key === "preference") {
    //     const prefId = parseInt(req.query[key]);
    //     match.$or = [
    //       { preference: prefId },
    //       { preference_2: prefId },
    //       { preference_3: prefId },
    //     ];
    //   } else if (key === "minPrice") {
    //     match.final_price = {
    //       ...(match.final_price || {}),
    //       $gte: parseFloat(req.query[key]),
    //     };
    //   } else if (key === "maxPrice") {
    //     match.final_price = {
    //       ...(match.final_price || {}),
    //       $lte: parseFloat(req.query[key]),
    //     };
    //   } else {
    //     match[key] = req.query[key];
    //   }
    // });

    // ✅ sorting
    let sort = { ranking: 1 };
    // if (slugName === "new-arrivals") {
    //   sort = { newarrival_ranking: 1 };
    // } else if (slugName === "top-picks") {
    //   sort = { toppics_ranking: 1 };
    // } else {
    //   sort = { ranking: 1 };
    // }


switch (req.query.sortBy) {
  case "price-low-to-high":
    sort = { final_price: 1 };
    break;
  case "price-high-to-low":
    sort = { final_price: -1 };
    break;
  case "new-arrivals":
    sort = { created_at: -1 }; // newest first
    break;
  case "popularity":
    sort = { ranking: 1 }; // or whatever field you use for popularity
    break;
  case "discount":
    sort = { discount_percent: -1 }; // highest discount first
    break;
  default:
    sort = { ranking: 1 }; // default sort
}


    // ✅ lookup pipeline with direct category name
    const productLookupPipeline = [
      { $lookup: { from: "categories", localField: "category_id", foreignField: "id", as: "category" } },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "subcategories", localField: "sub_category_id", foreignField: "id", as: "sub_category" } },
      { $unwind: { path: "$sub_category", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "subsubcategories", localField: "sub_sub_category_id", foreignField: "id", as: "sub_sub_category" } },
      { $unwind: { path: "$sub_sub_category", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "subsubsubcategories", localField: "sub_sub_sub_category_id", foreignField: "id", as: "sub_sub_sub_category" } },
      { $unwind: { path: "$sub_sub_sub_category", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "brands", localField: "brand", foreignField: "id", as: "brand" } },
      { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          category_name: {
            $ifNull: [
              "$category.name",
              { $ifNull: ["$sub_category.name", { $ifNull: ["$sub_sub_category.name", "$sub_sub_sub_category.name"] }] }
            ]
          },
          category_slug: {
            $ifNull: [
              "$category.slug",
              { $ifNull: ["$sub_category.slug", { $ifNull: ["$sub_sub_category.slug", "$sub_sub_sub_category.slug"] }] }
            ]
          }
        }
      },
      {
        $project: {
          product_id: 1,
          name: 1,
          description: 1,
          price: 1,
          final_price: 1,
          status: 1,
          new_arrival: 1,
          top_picks: 1,
          newarrival_ranking: 1,
          toppics_ranking: 1,
          ranking: 1,
          vendor_article_name: 1,
          mrp: 1,
          slug: 1,
          product_images: 1,
          category_name: 1,
          category_slug: 1,
          brand_name: "$brand.name",
          discount_percent:1,
          discount_amount:1
        },
      },
    ];

    // ✅ total items
    const totalItems = await Product.countDocuments(match);

    // ✅ products
    const products = await Product.aggregate([
      { $match: match },
      ...productLookupPipeline,
      { $sort: sort },
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize },
    ]);

    // Build filters from baseQuery (null/undefined removed)
    const filterFields = [
      "brand",
      "skin_type",
      "spf",
      "size_chart_type",
      "colours",
      "flavours",
      "protein_type",
      "diaper_style",
      "formulation",
      "staging",
      "min_age_years",
    ];
    const filters = {};

    for (const field of filterFields) {
      if (field === "brand") {
        const result = await Product.aggregate([
          { $match: clone_match },
          { $group: { _id: "$brand", count: { $sum: 1 } } },
          {
            $lookup: {
              from: "brands",
              localField: "_id",
              foreignField: "id",
              as: "brandInfo",
            },
          },
          { $unwind: "$brandInfo" },
          {
            $project: {
              value: "$brandInfo.name",
              count: 1,
            },
          },
          { $match: { value: { $nin: [null, "", "undefined", "null"] } } }, // remove nulls
        ]);
        filters[field] = result;
      } else if (field === "min_age_years") {
        const result = await Product.aggregate([
          { $match: clone_match },
          {
            $group: {
              _id: { min: "$min_age_years", max: "$max_age_years" },
              count: { $sum: 1 },
            },
          },
          { $match: { "_id.min": { $ne: null }, "_id.max": { $ne: null } } }, // remove nulls
        ]);
        filters[field] = result.map((r) => ({
          value: `${r._id.min} to ${r._id.max}`,
          count: r.count,
        }));
      } else {
        const result = await Product.aggregate([
          { $match: clone_match },
          { $group: { _id: `$${field}`, count: { $sum: 1 } } },
          { $match: { _id: { $nin: [null, "", "undefined", "null"] } } }, // remove nulls
        ]);
        filters[field] = result.map((r) => ({ value: r._id, count: r.count }));
      }
    }
    
    const allowedSortFields = [
      "ranking",
      "popularity",
      "new-arrivals",
      "price-high-to-low",
      "price-low-to-high",
      "mrp",
      "added_date",
      "discount",
      "created_at",
    ];
    const cleanedFilters = cleanFilters(filters);
    res.status(200).json({
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
        currentPage: page,
        itemsPerPage: pageSize,
      },
      products,
      filters: cleanedFilters,
      allowedSortFields,
    });
  } catch (error) {
    console.error("Error retrieving products:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


export const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 30;
    const sortBy = req.query.sortBy || "ranking";
    const searchTerm = req.query.searchTerm || "";

    let query = {};

    if (searchTerm) {
      query.product_name = { $regex: searchTerm, $options: "i" };
    }

    const productsRaw = await Product.aggregate([
      { $match: query },

      // 🔹 Join brand
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "id",
          as: "brand"
        }
      },
      { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },

      // 🔹 Join category
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "id",
          as: "category"
        }
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },

      // 🔹 Join concern_1
      {
        $lookup: {
          from: "concerns",
          localField: "concern_1",
          foreignField: "id",
          as: "concern_1"
        }
      },
      { $unwind: { path: "$concern_1", preserveNullAndEmptyArrays: true } },

      // 🔹 Join concern_2
      {
        $lookup: {
          from: "concerns",
          localField: "concern_2",
          foreignField: "id",
          as: "concern_2"
        }
      },
      { $unwind: { path: "$concern_2", preserveNullAndEmptyArrays: true } },

      // 🔹 Join concern_3
      {
        $lookup: {
          from: "concerns",
          localField: "concern_3",
          foreignField: "id",
          as: "concern_3"
        }
      },
      { $unwind: { path: "$concern_3", preserveNullAndEmptyArrays: true } },

      // 🔹 Sorting
      { $sort: { [sortBy]: 1 } },

      // 🔹 Pagination
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize }
    ]);

    const totalCount = await Product.countDocuments(query);

    res.json({
      data: productsRaw,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / pageSize)
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
// export const updateProduct = async (req, res) => {
//   try {
//     const productId = req.params.productId;

//     if (!productId) {
//       return res.status(400).json({ error: "Please provide product id to update the product" });
//     }

//     // Find product by ObjectId
//     const product = await Product.findById(productId);
//     if (!product) {
//       return res.status(400).json({ error: "Product not found with given id" });
//     }

//     // Helper functions
//     const cal_price_discount = (mrp, discount) => {
//       return Math.round(mrp - (mrp * discount) / 100);
//     };
//     const cal_price_amount = (mrp, amount) => {
//       return Math.round(mrp - amount);
//     };

//     // Parse JSON fields from request
//     let product_image_array = req.body.product_image ? JSON.parse(req.body.product_image) : [];
//     let concerns = req.body.concern ? JSON.parse(req.body.concern) : [];
//     let faq_options = req.body.faqs_option ? JSON.parse(req.body.faqs_option) : [];
//     let preference = req.body.preference ? JSON.parse(req.body.preference) : [];

//     // Tags
//     if (!req.body.tags || req.body.tags.length === 0) {
//       return res.status(500).json({ error: "Please add at least one tags" });
//     }
//     const tags = req.body.tags.join(", ");

//     // Dynamic concerns
//     const dynamicConcerns = {};
//     concerns.forEach((c, i) => dynamicConcerns[`concern_${i + 1}`] = c.value);
//     const concern_1 = dynamicConcerns.concern_1 || null;
//     const concern_2 = dynamicConcerns.concern_2 || null;
//     const concern_3 = dynamicConcerns.concern_3 || null;

//     // Dynamic preferences
//     const dynamicPref = {};
//     preference.forEach((p, i) => dynamicPref[`preference_${i + 1}`] = p.label);
//     const preference_1 = dynamicPref.preference_1 || null;
//     const preference_2 = dynamicPref.preference_2 || null;
//     const preference_3 = dynamicPref.preference_3 || null;

//     // Subcategory defaults
//     const sub_category_id = req.body.sub_category_id || 113;
//     const sub_sub_category_id = req.body.sub_sub_category_id || 2;
//     const sub_sub_sub_category_id = req.body.sub_sub_sub_category_id || 2;

//     // Calculate final price
//     const mrp = req.body.mrp || 0;
//     const discount_in_percent = req.body.discount_in_percent || 0;
//     const discount_in_amount = req.body.discount_in_amount || 0;
//     const final_price = discount_in_percent > 0
//       ? cal_price_discount(mrp, discount_in_percent)
//       : cal_price_amount(mrp, discount_in_amount);

//     // Build update object
//     const updateData = {
//       vendor_article_name: req.body.vendor_article_name || null,
//       category_id: req.body.category_id || null,
//       sub_category_id,
//       sub_sub_category_id,
//       sub_sub_sub_category_id,
//       vendor_sku_code: req.body.vendor_sku_code || null,
//       vendor_article_number: req.body.vendor_article_number || null,
//       brand: req.body.brand || null,
//       manufacturer_name_and_address_with_pincode: req.body.manufacturer_name_and_address_with_pincode || null,
//       packer_name_and_address_with_pincode: req.body.packer_name_and_address_with_pincode || null,
//       importer_name_and_address_with_pincode: req.body.importer_name_and_address_with_pincode || null,
//       country_of_origin: req.body.country_of_origin || null,
//       weight_kg: req.body.weight_kg || null,
//       dimensions_cm: req.body.dimensions_cm || null,
//       components: req.body.components || null,
//       article_type: req.body.article_type || null,
//       brand_size: req.body.brand_size || null,
//       standard_size: req.body.standard_size || null,
//       hsn: req.body.hsn || null,
//       sku_code: req.body.sku_code || null,
//       age_group: req.body.age_group || null,
//       min_age_years: req.body.min_age_years || 0,
//       max_age_years: req.body.max_age_years || 0,
//       checkout: req.body.checkout || null,
//       product_highlights: req.body.product_highlights || null,
//       description: req.body.description || null,
//       product_benefits: req.body.product_benefits || null,
//       directions_of_use: req.body.directions_of_use || null,
//       safety_information: req.body.safety_information || null,
//       tags,
//       concern_1,
//       concern_2,
//       concern_3,
//       special_features: req.body.special_features || null,
//       mrp,
//       discount_in_percent,
//       discount_in_amount,
//       final_price,
//       status: req.body.status || 'Active',
//       new_arrival: req.body.new_arrival || 0,
//       top_picks: req.body.top_picks || 0,
//       ranking: req.body.ranking || 0,
//       toppics_ranking: req.body.toppics_ranking || 0,
//       newarrival_ranking: req.body.newarrival_ranking || 0,
//       expires_in_days: req.body.expires_in_days || 0,
//       key_ingredients: req.body.key_ingredients || null,
//       other_ingredients: req.body.other_ingredients || null,
//       min_order_quantity: req.body.min_order_quantity || 0,
//       max_order_quantity: req.body.max_order_quantity || 0,
//       back_order_quantity: req.body.back_order_quantity || 0,
//       meta_title: req.body.meta_title || null,
//       meta_description: req.body.meta_description || null,
//       stock_status: req.body.stock_status || null,
//       product_video: req.body.product_video || "",
//       expert_advice: req.body.expert_advice || null,
//       accessories_specification: req.body.specifications || null,
//       feeding_table: req.body.feeding_table || null,
//       size_chart: req.body.size_chart || null,
//       skin_type: req.body.skin_type || null,
//       hair_type: req.body.hair_type || null,
//       spf: req.body.spf_type || null,
//       size_chart_type: req.body.size_chart_type || null,
//       colours: req.body.color || null,
//       flavours: req.body.flavour || null,
//       protein_type: req.body.protein_type || null,
//       diaper_style: req.body.diaper_style || null,
//       formulation: req.body.formulation_type || null,
//       staging: req.body.staging || null,
//       preference_1,
//       preference_2,
//       preference_3,
//       show_stock: req.body.show_stock || 0,
//       product_images: product_image_array,
//       faqs: faq_options,
//     };

//     // Update the product
//     await Product.findByIdAndUpdate(productId, updateData, { new: true });

//     res.status(200).json({
//       message: "Product updated successfully",
//       error: false,
//     });

//   } catch (error) {
//     console.error("Error updating product:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };

export const getSuggestedProducts = async (req, res) => {
  try {
    console.log(req.query.product_id, "Query");

    const productId = req.query.product_id;
    console.log(productId, "-=-=-=productId");

    if (!productId) {
      return res.status(400).json({ error: "Missing productId in query" });
    }

    // 🧠 Fix: Use correct cache key (template string)
    const cacheKey = `suggested_${productId}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log("🟢 Serving suggested products from cache");
      return res.status(200).json(cached);
    }

    // ✅ Fix: Use findOne({ product_id }) instead of findById
    const baseProduct = await Product.findOne({ product_id: productId });
    console.log(baseProduct.brand,"baseProduct");
    console.log(baseProduct.category_id,"baseProduct");
    if (!baseProduct) {
      return res.status(404).json({ error: "Product not found" });
    }
    console.log("Base Product",baseProduct);
    
    // ✅ Fix: use product_id instead of id for filtering
    const suggestedProducts = await Product.find({
      product_id: { $ne: productId }, // exclude the same product
      $or: [
        { brand: baseProduct.brand },
        { category_id: baseProduct.category_id },
      ],
    })
      .limit(6)

    const brandIds = [...new Set(suggestedProducts.map(p => p.brand))];
    const brands = await Brand.find({ id: { $in: brandIds } });
    const brandMap = Object.fromEntries(brands.map(b => [b.id.toString(), b.name]));

    const productsWithBrandName = suggestedProducts.map(p => ({
      ...p.toObject(),
            brandName: brandMap[p.brand.toString()] || null,
      }));
      

    const responseData = { products: productsWithBrandName };

    // 💾 Cache the result
    cache.set(cacheKey, responseData);

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error in /api/products/suggested:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};










