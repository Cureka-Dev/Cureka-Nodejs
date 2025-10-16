import { Router } from "express";
import {
  createCategoryItem,
  getAllCategoryItems,
  updateCategoryItem,
  deleteCategoryItem,
  getNestedCategories,
  getSubCategories,
  getSubSubCategories
} from "../controllers/categoryController.js";
import jwtMiddleware from "../middlewares/jwtMiddleware.js";
import { userType } from "../utils/constants.js";
const router = Router();

/**
 * @route   POST /api/categories
 * @desc    Create a new item in the category hierarchy (Category, SubCategory, SubSubCategory, SubSubSubCategory)
 * @access  Public
 */
router.post("/",jwtMiddleware([userType.USER]), createCategoryItem);

/**
 * @route   GET /api/categories
 * @desc    Get all items from all categories, subcategories, and sublevels
 * @access  Public
 */
router.get("/nested-categories", getNestedCategories);
router.get("/", getAllCategoryItems);

/**
 * @route   PUT /api/categories/:id
 * @desc    Update an existing category item (works for categories, subcategories, and sublevels)
 * @access  Public
 */
router.put("/:id",jwtMiddleware([userType.USER]), updateCategoryItem);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete an existing category item (works for categories, subcategories, and sublevels)
 * @access  Public
 */
router.delete("/:id",jwtMiddleware([userType.USER]), deleteCategoryItem);
router.get("/nested-categories",jwtMiddleware([userType.USER]), getNestedCategories);
router.get("/sub-categories",jwtMiddleware([userType.USER]), getSubCategories);
router.get("/sub-sub-categories",jwtMiddleware([userType.USER]), getSubSubCategories);

export default router;
