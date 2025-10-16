import express from "express";
import * as blogController from "../controllers/blogController.js";
import jwtMiddleware from "../middlewares/jwtMiddleware.js";
import { userType } from "../utils/constants.js";
const router = express.Router();

router.post("/create-blog",jwtMiddleware([userType.USER]), blogController.createBlog);
router.put("/update-blog/:id",jwtMiddleware([userType.USER]), blogController.updateBlog);
router.get("/list-blog",blogController.listBlogs);
router.get("/blogs", blogController.getBlogs);
router.get("/blog/:identifier", blogController.getBlog);
router.get("/trending-blogs",jwtMiddleware([userType.USER]), blogController.getTrendingBlogs);
router.delete("/delete-blog/:id",jwtMiddleware([userType.USER]), blogController.deleteBlog);

export default router;
