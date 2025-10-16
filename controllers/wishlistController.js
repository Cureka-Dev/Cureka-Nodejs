import Wishlist from "../DB/models/wishlistModel.js";
import Product from "../DB/models/product.js"; // Adjust this to match your schema
//import ProductImage from "../models/productImageModel.js";
import { addUserLogs } from "../utils/common.js";
import Category from '../DB/models/category.js';
import SubCategory from '../DB/models/subCategory.js';
import SubSubCategory from '../DB/models/subSubCategory.js';
import SubSubSubCategory from '../DB/models/subSubSubCategory.js';
// Add to wishlist with auto-increment id
export const addToWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    //console.log("req.user.id",req.user.id);
    const { product_id } = req.body;

    if (!userId || !product_id) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // 🔹 Find last wishlist item to get latest id
    const lastWishlist = await Wishlist.findOne().sort({ id: -1 });
    const newId = lastWishlist ? lastWishlist.id + 1 : 1;

    // 🔹 Create wishlist with incremented id
    const wishlist = await Wishlist.create({
      id: newId,
      user_id: userId,
      product_id
    });

    // 🔹 Log user action
    await addUserLogs({
      user_id: userId,
      payload: JSON.stringify(req.body),
      response: JSON.stringify({ id: newId, product_id }),
      type: "addWishlist"
    });

    res.status(201).json({
      status: true,
      message: "Product added to wishlist successfully",
      data: { id: wishlist.id, product_id }
    });

  } catch (err) {
    console.error("Error adding to wishlist:", err);

    // 🔹 Handle duplicate entry error
    if (err.code === 11000) {
      return res.status(400).json({
        status: false,
        message: "This product is already in your wishlist"
      });
    }

    res.status(500).json({ 
      status: false,
      message: "Internal Server Error" 
    });
  }
};


export const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = req.params.productId;

    const result = await Wishlist.findOneAndDelete({ user_id: userId, product_id: productId });

    if (!result) {
      return res.status(404).json({ error: "Wishlist item not found." });
    }

    res.status(200).json({ message: "Successfully Removed From Wishlist." });
  } catch (err) {
    console.error("Error deleting wishlist:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
export const getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;

    // ✅ Get wishlist items for this user
    const items = await Wishlist.find({ user_id: userId }).lean();

    if (!items.length) {
      return res.status(200).json({
        status: true,
        message: "Wishlist fetched successfully",
        data: []
      });
    }

    // ✅ Collect product IDs from wishlist
    const productIds = items.map((item) => item.product_id);

    // ✅ Fetch products with all required fields
    const products = await Product.find(
      { product_id: { $in: productIds } },
      {
        product_id: 1,
        vendor_article_name: 1,
        url: 1,
        slug: 1,
        pid: 1,
        mrp: 1,
        discount_amount: 1,
        discount_percent: 1,
        final_price: 1,
        category_id: 1,
        sub_category_id: 1,
        sub_sub_category_id: 1,
        product_images: 1
      }
    ).lean();

    // ✅ Collect unique category IDs
    const categoryIds = [...new Set(products.map((p) => p.category_id).filter(Boolean))];
    const subCategoryIds = [...new Set(products.map((p) => p.sub_category_id).filter(Boolean))];
    const subSubCategoryIds = [...new Set(products.map((p) => p.sub_sub_category_id).filter(Boolean))];

    // ✅ Fetch category names from respective collections
    const [categories, subCategories, subSubCategories] = await Promise.all([
      Category.find({ id: { $in: categoryIds } }, { id: 1, name: 1, slug: 1 }).lean(),
      SubCategory.find({ id: { $in: subCategoryIds } }, { id: 1, name: 1, slug: 1 }).lean(),
      SubSubCategory.find({ id: { $in: subSubCategoryIds } }, { id: 1, name: 1, slug: 1 }).lean(),
    ]);

    // ✅ Map categories for quick lookup
    const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));
    const subCategoryMap = Object.fromEntries(subCategories.map((sc) => [sc.id, sc]));
    const subSubCategoryMap = Object.fromEntries(subSubCategories.map((ssc) => [ssc.id, ssc]));

    // ✅ Map products by product_id
    const productMap = {};
    products.forEach((prod) => {
      productMap[prod.product_id] = {
        vendor_article_name: prod.vendor_article_name,
        url: prod.url,
        slug: prod.slug,
        pid: prod.pid,
        mrp: prod.mrp,
        discount_amount: prod.discount_amount,
        discount_percent: prod.discount_percent,
        final_price: prod.final_price,
        category: categoryMap[prod.category_id] || null,
        sub_category: subCategoryMap[prod.sub_category_id] || null,
        sub_sub_category: subSubCategoryMap[prod.sub_sub_category_id] || null,
        image: prod.images?.length ? prod.images[0] : null, // first image string
        product_images: prod.product_images
      };
    });

    // ✅ Build final response
    const data = items.map((item) => {
      const product = productMap[item.product_id] || {};
      return {
        id: item.id,
        user_id: item.user_id,
        product_id: item.product_id || null,
        size: item.size || 0,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
        vendor_article_name: product.vendor_article_name || null,
        url: product.url || null,
        slug: product.slug || null,
        image: product.image || null,
        pid: product.pid || null,
        mrp: product.mrp || null,
        discount_amount: product.discount_amount || 0,
        discount_percent: product.discount_percent || 0,
        final_price: product.final_price || null,

        // ✅ category names from respective collections
        category_name: product.category?.name || null,
        category_slug: product.category?.slug || null,
        sub_category_name: product.sub_category?.name || null,
        sub_category_slug: product.sub_category?.slug || null,
        sub_sub_category_name: product.sub_sub_category?.name || null,
        sub_sub_category_slug: product.sub_sub_category?.slug || null,

        product_images: product.product_images || []
      };
    });

    res.status(200).json({
      status: true,
      message: "Wishlist fetched successfully",
      data
    });
  } catch (err) {
    console.error("Error retrieving wishlist:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};










