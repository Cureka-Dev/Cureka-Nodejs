import { ProductReview } from "../DB/models/productReview.js";
//import { Product } from "../DB/models/product.js";
import Blog from "../DB/models/blog.js";
import Popup from "../DB/models/popup.js";
import { signupEmail } from "../emails/signup.js";

export const addReview = async (req, res) => {
  const { productid, userid, rating, comments, created_by, title } = req.body;

  if (!productid || !userid || !rating || !comments || !created_by) {
    return res.status(400).json({ error: true, message: "Missing required fields" });
  }

  try {
    // 🔹 Find the latest review ID from reviews collection
    const latestReview = await ProductReview.findOne().sort({ id: -1 }).lean();
    //console.log("latestReview",latestReview);
    const newId = latestReview ? latestReview.id + 1 : 1;
//console.log("newId",newId);
    // 🔹 Create new review with sequential id
    const review = await ProductReview.create({
      id: newId,
      productid,
      userid,
      rating,
      comments,
      created_by,
      title,
      createdAt: new Date()
    });

    // Send email to admin (optional)
    const adminEmail = "admin@example.com"; // replace with real fetch logic
    const templateData = { name: "Admin" };
    const html = await signupEmail(templateData);
    // await sendEmail({ to: adminEmail, subject: "Review Approval Request", html });

    res.status(201).json({
      error: false,
      message: "Review added successfully",
      data: {
        id: review.id,
        productid: review.productid,
        userid: review.userid,
        rating: review.rating,
        comments: review.comments,
        created_by: review.created_by,
        title: review.title,
        createdAt: review.createdAt
      }
    });
  } catch (error) {
    console.error("Add review error:", error);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};


export const getAllReviews = async (req, res) => {
  try {
    const reviews = await ProductReview.find()
      .sort({ _id: -1 });
      //.populate("productid","userid", "url slug vendor_article_name");
    res.status(200).json({ error: false, message: "Reviews fetched", results: reviews });
  } catch (error) {
    console.log("error",error);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

export const getApprovedReviews = async (req, res) => {
  try {
    // ✅ Fetch approved reviews with product details
    const reviews = await ProductReview.find({ status: "Approved" })
      .sort({ _id: -1 })
      .populate("productid", "url slug vendor_article_name");

    // ✅ Fetch active blogs
    const blogs = await Blog.find({ status: "Active" });

    // ✅ Fetch one active HOME popup
    const popup = await Popup.findOne({ page_type: "HOME", status: "Active" });

    // ✅ Prepare final object
    const resultObj = {
      reviews,
      blogs,
      popups: popup ? [popup] : [], // keeping array structure like SQL LIMIT 1
    };

    return res.status(200).json({
      error: false,
      message: "List Fetched successfully.",
      results: resultObj,
    });
  } catch (error) {
    console.error("Error in getApprovedReviews:", error);
    return res.status(500).json({
      error: true,
      message: "Internal Server Error",
    });
  }
};


export const editReviewStatus = async (req, res) => {
  try {
    const { id } = req.query;  // numeric ID (e.g., 74)
    const { status } = req.body;

    if (!id || !status) {
      return res.status(400).json({ error: true, message: "Missing id or status" });
    }

    // Convert to number if your IDs are stored as numbers
    const reviewId = Number(id);

    const updated = await ProductReview.findOneAndUpdate(
      { id: reviewId },   // ✅ use numeric review_id
      { $set: { status } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: true, message: "Review not found" });
    }

    res.status(200).json({
      error: false,
      message: "Review status updated successfully",
    });
  } catch (error) {
    console.error("Error updating review status:", error);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};


export const getReviewById = async (req, res) => {
  try {
    const { id } = req.query;
    const review = await ProductReview.findById(id);
    if (!review) return res.status(404).json({ error: true, message: "Review not found" });

    res.status(200).json({
      error: false,
      message: "Review detail retrieved successfully",
      data: review
    });
  } catch (error) {
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};
