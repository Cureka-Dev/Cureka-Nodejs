import _ from "lodash";
import moment from "moment";
import BlogComment from "../DB/models/blogComment.js";
import Blog from "../DB/models/blog.js";
import User from "../DB/models/customers.js";

const { isEmpty } = _;

/**
 * List all comments for a blog (with pagination)
 */
export const listUserComments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 30;
    const blog_id = parseInt(req.query.blog_id);

    if (!blog_id) {
      return res.status(400).json({
        error: true,
        message: "Blog ID is required",
        data: {},
      });
    }

    // 🔹 Count total comments
    const totalItems = await BlogComment.countDocuments({ blog_id });

    // 🔹 Fetch comments only (no populate)
    const comments = await BlogComment.find({ blog_id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);
//console.log("blog_id",typeof(blog_id));
    // 🔹 Fetch related blog once
    const blog = await Blog.findOne({ id: blog_id });
//console.log("blog",blog);
    // 🔹 Fetch all user IDs from comments
    const userIds = comments.map((c) => c.user_id).filter(Boolean);
    const users = await User.find({ id: { $in: userIds } }).select(
      "id username email createdAt updatedAt"
    );

    // 🔹 Map userId → user details
    const userMap = {};
    users.forEach((u) => {
      userMap[u._id.toString()] = u;
    });

    // 🔹 Map comments into required response format
    const formattedResults = comments.map((comment) => {
      const user = comment.user_id ? userMap[comment.user_id.toString()] : null;
      return {
        id: comment.id, // auto-increment id in BlogComment
        blog_id: blog?.id || null,
        user_id: user?._id || 0,
        user_name: comment.user_name || user?.username || null,
        user_email: user?.email || null,
        comment: comment.comment,
        commented_at: moment(comment.createdAt).format("DD-MM-YYYY HH:mm:ss"),
        is_approved: comment.is_approved ?? 0,
        approved_at: comment.approved_at || null,
        is_rejected: comment.is_rejected ?? null,
        rejected_at: comment.rejected_at || null,
        reject_reason: comment.reject_reason || null,
        created_at: comment.createdAt,
        updated_at: comment.updatedAt,
        blog_title: blog?.title || null,
        user_username: user?.username || null,
        user_created_at: user?.createdAt || null,
        user_updated_at: user?.updatedAt || null,
      };
    });

    // 🔹 Final response
    res.status(200).json({
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
        currentPage: page,
        itemsPerPage: pageSize,
      },
      results: formattedResults,
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

/**
 * Approve / Reject a comment
 */
export const approveRejectComment = async (req, res) => {
  try {
    const { blog_comment_id, action, reject_reason } = req.body;

    if (!action || action.trim() === "") {
      return res.status(400).json({
        error: true,
        message: "Please provide action type (accept/reject)",
      });
    }

    // 🔹 Find by numeric id (custom field, not _id)
    const comment = await BlogComment.findOne({ id: Number(blog_comment_id) }).lean();
    if (!comment) {
      return res.status(404).json({
        error: true,
        message: "Comment not found with given id",
      });
    }

    let updateData = {};
    if (action === "accept") {
      updateData = {
        is_approved: true,
        approved_at: moment().toDate(),
        is_rejected: false,
        rejected_at: null,
        reject_reason: null,
      };
    } else if (action === "reject") {
      updateData = {
        is_approved: false,
        approved_at: null,
        is_rejected: true,
        rejected_at: moment().toDate(),
        reject_reason: reject_reason || null,
      };
    } else {
      return res.status(400).json({
        error: true,
        message: "Invalid action. Allowed values: accept or reject",
      });
    }

    // 🔹 Update comment
    const updatedComment = await BlogComment.findOneAndUpdate(
      { id: Number(blog_comment_id) },
      { $set: updateData },
      { new: true }
    );

    res.status(200).json({
      error: false,
      message: `Blog comment ${action}ed successfully.`,
      data: updatedComment,
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};



/**
 * List approved comments for a blog
 */
export const listApprovedComment = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 30;
    const blog_id = Number(req.query.blog_id); // ✅ ensure number

    if (!blog_id || isNaN(blog_id)) {
      return res.status(400).json({
        error: true,
        message: "Blog ID is required and must be a number",
        data: {},
      });
    }

    // ensure blog exists
    const blog = await Blog.findOne({ id: blog_id }); // ✅ blog_id is number
    if (!blog) {
      return res.status(404).json({
        error: true,
        message: "Blog not found with given id",
      });
    }

    const totalItems = await BlogComment.countDocuments({
      blog_id,
      is_approved: true,
    });

    const results = await BlogComment.find({ blog_id, is_approved: true })
      .select("id comment user_name user_email createdAt approved_at user_id") // ✅ use `id`
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .sort({ createdAt: -1 })
      .lean(); // ✅ convert to plain JS object

    // transform results: `_id` ➝ `id` (number)
    const formattedResults = results.map((item) => ({
      id: Number(item.id), // ✅ force number
      blog_id: blog_id,
      comment: item.comment,
      user_name: item.user_name,
      user_email: item.user_email,
      createdAt: item.createdAt,
      approved_at: item.approved_at,
      user_id: Number(item.user_id) || 0, // ✅ ensure numeric user_id
    }));

    res.status(200).json({
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
        currentPage: page,
        itemsPerPage: pageSize,
      },
      results: formattedResults,
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

export const addComment = async (req, res) => {
  try {
    const user = req.user;
    const { blogId, comment, user_name, user_email } = req.body;
    const userId = user?.userId || 0; // numeric only

    const commented_at = moment().format("DD-MM-YYYY HH:mm:ss");

    if (!blogId || isNaN(blogId)) {
      return res.status(400).json({ error: "Invalid blogId" });
    }

    if (!comment || comment.trim() === "") {
      return res.status(400).json({ error: "Comment cannot be empty" });
    }

    // check blog existence
    const blogInfo = await Blog.findOne({ id: Number(blogId) });
    if (!blogInfo) {
      return res.status(404).json({ error: "Blog not found for given blogId" });
    }

    // ✅ Find last comment id for sequential increment
    const lastComment = await BlogComment.findOne().sort({ id: -1 });
    const newId = lastComment ? lastComment.id + 1 : 1;

    // ✅ create new comment with sequential id
    const newComment = await BlogComment.create({
      id: newId,
      blog_id: Number(blogId),
      user_id: Number(userId),
      user_name,
      user_email: user_email || "",
      comment,
      commented_at,
    });

    return res.status(201).json({
      message: "Comment added successfully",
      error: false,
      data: {
        id: newComment.id, // 👈 numeric sequential id
        blog_id: newComment.blog_id,
        user_id: newComment.user_id,
        user_name: newComment.user_name,
        user_email: newComment.user_email,
        comment: newComment.comment,
        commented_at: newComment.commented_at,
        is_approved: newComment.is_approved,
      },
    });
  } catch (error) {
    console.error("Error in addComment:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
