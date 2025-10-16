import express from "express";
import {
  listCuratedProducts,
  insertCuratedProduct,
  fetchCuratedProduct,
  deleteCuratedProduct,
  updateCuratedProduct,
  fetchProductOptions,
  export_product
} from "../controllers/curatedProductController.js";

const router = express.Router();
router.get("/fetch-product-options", fetchProductOptions);   
router.get("/", listCuratedProducts);          // ✅ GET all curated products
router.post("/", insertCuratedProduct);        // ✅ POST insert new product
router.get("/:id", fetchCuratedProduct);       // ✅ GET one curated product
router.delete("/:id", deleteCuratedProduct);   // ✅ DELETE product (soft delete)
router.put("/", updateCuratedProduct);         // ✅ PUT update product
router.post("/fetch-product-report", export_product);  
export default router;
