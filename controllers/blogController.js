import Blog from "../DB/models/blog.js";
import mongoose from "mongoose";

// Create blog
export const createBlog = async (req, res) => {
  try {
    // 🔹 Find latest blog id
    const lastBlog = await Blog.findOne().sort({ id: -1 }).select("id");
    const nextId = lastBlog ? lastBlog.id + 1 : 1;

    // 🔹 Create new blog with next id
    const blog = new Blog({
      id: nextId,   // ✅ Auto-increment ID
      ...req.body,
    });

    await blog.save();

    // Optionally add user logs here
    // await addUserLogs({ user_id: req.user?._id, payload: JSON.stringify(req.body), response: JSON.stringify(blog), type: "createBlog" });

    res.status(201).json(blog);
  } catch (err) {
    console.error("Error creating blog:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// Update blog
export const updateBlog = async (req, res) => {
  try {
    const updatedBlog = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedBlog) {
      return res.status(404).json({ error: "Blog not found." });
    }

    // Optionally add user logs here
    // await addUserLogs({ ... });

    res.json({ message: "Blog updated successfully.", blog: updatedBlog });
  } catch (err) {
    console.error("Error updating blog:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// List all blogs (without pagination)
export const listBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (err) {
    console.error("Error retrieving blogs:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// List blogs with pagination and filtering
export const getBlogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    const match = { status: "Active" };

    if (req.query.category_id) match.category_id = Number(req.query.category_id);
    if (req.query.concern_id) match.concern_id = Number(req.query.concern_id);

    if (req.query.search_term) {
      match.$text = { $search: req.query.search_term };
    }

    const totalItems = await Blog.countDocuments(match);

    const blogs = await Blog.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "categories",
          localField: "category_id",
          foreignField: "id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "concerns",
          localField: "concern_id",
          foreignField: "id",
          as: "concern",
        },
      },
      { $unwind: { path: "$concern", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          id: 1,
          title: 1,
          description: 1,
          createdAt: 1,
          status: 1,
          image:1,
          url:1,
          category_id: 1,
          concern_id: 1,
          category_name: "$category.name",
          category_slug: "$category.slug",
          concern_name: "$concern.name",
          concern_slug: "$concern.slug",
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize },
    ]);

    res.json({
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
        currentPage: page,
        itemsPerPage: pageSize,
      },
      blogs,
    });
  } catch (err) {
    console.error("Error retrieving blogs:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



// Get blog by ID or URL
export const getBlog = async (req, res) => {
  try {
    const identifier = req.params.identifier;

    let blog;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      blog = await Blog.findById(identifier)
        .populate("category_id", "name slug")
        .populate("concern_id", "name slug");
    } else {
      blog = await Blog.findOne({ url: identifier })
        .populate("category_id", "name slug")
        .populate("concern_id", "name slug");
    }

    if (!blog) return res.status(404).json({ error: "Blog not found" });

    res.json(blog);
  } catch (err) {
    console.error("Error retrieving blog:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get trending blogs (top 3 by views)
export const getTrendingBlogs = async (req, res) => {
  try {
    const trendingBlogs = await Blog.find()
      .sort({ views: -1 })
      .limit(3);
    res.json(trendingBlogs);
  } catch (err) {
    console.error("Error retrieving trending blogs:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Delete blog by ID
export const deleteBlog = async (req, res) => {
  try {
    const deletedBlog = await Blog.findByIdAndDelete(req.params.id);
    if (!deletedBlog) return res.status(404).json({ error: "Blog not found." });
    res.json({ message: "Blog deleted successfully." });
  } catch (err) {
    console.error("Error deleting blog:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
