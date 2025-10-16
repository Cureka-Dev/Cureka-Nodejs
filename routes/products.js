import { Router } from "express";
import {
  addProduct,
  addSizeProduct,
  deleteProduct,
  updateProduct,
  getProductBySlug,
  searchProducts,
  productsSuggestions,
  categoryProducts,
  subcategoryProducts,
  subSubCategoryProducts,
  concernProducts,
  brandProducts,
  getBrandById,
  adminFetchProducts,
  adminFetchProductById,
  getNewTopPics,
  getProductsByGroup,
  getProducts
} from "../controllers/productController.js";
import * as schema from "../schema.js";
import { validateProductData } from "../utils/common.js";

const router = Router();

router.post("/addProduct", addProduct);
router.put("/update-products/:productId", updateProduct);
router.post("/addsize-product", addSizeProduct);
router.delete("/delete-product/:productId", deleteProduct);
router.get("/product/:slug", getProductBySlug);
router.get("/search-products", searchProducts)
router.get("/productsSuggestions", productsSuggestions);
// Category-wise products
router.get("/category-products/:slug", categoryProducts);

// Subcategory-wise products
router.get("/subcategory-products/:slug", subcategoryProducts);

// Sub-subcategory-wise products
router.get("/subsubcategory-products/:slug", subSubCategoryProducts);

// Concern-wise products
router.get("/concern-products/:slug", concernProducts);

// Brand-wise products
router.get("/brand-products/:slug", brandProducts);

// Get brand by ID
router.get("/get-brand-name/:id", getBrandById);
// Route to fetch paginated product list for admin
router.get("/admin-fetch-products", adminFetchProducts);

// Route to fetch single product details by ID for admin
router.get("/admin-fetch-products-by-id/:id", adminFetchProductById);

// Route to fetch single product details by ID for admin
router.get("/new-top-pics", getNewTopPics);

router.get("/products-by-group/:slug", getProductsByGroup);
router.get("/products", getProducts);

export default router;
