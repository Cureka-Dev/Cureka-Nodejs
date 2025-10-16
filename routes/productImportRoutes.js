// routes/productImportRoutes.js
import express from "express";
const router = express.Router();

import {
  importProducts,
  importProductImages,
  importProductPrices,
  importOfferProducts,
  downloadSampleExcel,
  downloadSampleProductPriceExcel,
  downloadSampleProductImageExcel,
  downloadSampleOfferproductExcel,
  updateProductsFromCSV
} from "../controllers/productImportController.js";

import multer from "multer";
const upload = multer({ dest: "./public/" });

// Optional: Add middleware here (e.g., jwtMiddleware) if needed

// Routes for importing data
router.post("/import", upload.single("file"), importProducts);
router.post("/product-images-import", upload.single("file"), importProductImages);
router.post("/product-prices-import", upload.single("file"), importProductPrices);
router.post("/offer-products-import", upload.single("file"), importOfferProducts);
router.post("/updateProductsFromCSV", upload.single("file"), updateProductsFromCSV);
// Routes for downloading sample templates
router.get("/sample/products", downloadSampleExcel);
router.get("/sample/prices", downloadSampleProductPriceExcel);
router.get("/sample/images", downloadSampleProductImageExcel);
router.get("/sample/offers", downloadSampleOfferproductExcel);

export default router;
