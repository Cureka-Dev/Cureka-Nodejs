import express from "express";
import {
  productList,
  categoriesList,
  productListByCategory,
  fasterCheckout,
} from "../controllers/fasterController.js";

const router = express.Router();

router.get("/productsList", productList);
router.get("/categoriesList", categoriesList);
router.get("/productListByCategory", productListByCategory);
router.post("/fasterCheckout", fasterCheckout);

export default router;
