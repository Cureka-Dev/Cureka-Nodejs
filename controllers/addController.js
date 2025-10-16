import SingleAdd from '../DB/models/singleAdd.js';
import MultipleAdd from '../DB/models/multipleAdd.js';
import CuratedAdd from '../DB/models/curatedAdd.js';
import mongoose from "mongoose";
import HomeContent from '../DB/models/homeContent.js'
import OfferProducts from '../DB/models/offerProducts.js';
import Product from "../DB/models/product.js";
import Brand from '../DB/models/brand.js';
import Category from '../DB/models/category.js';
import { addUserLogs } from '../utils/common.js';

// Utility for consistent error handling
const handleError = (res, message, err) => {
  console.error(message, err);
  res.status(500).json({ error: "Internal Server Error" });
};

// ---------- Single Add ----------

export const createSingleAdd = async (req, res) => {
  try {
    // 🔹 Find latest id
    const lastAdd = await SingleAdd.findOne().sort({ id: -1 }).select("id");
    const nextId = lastAdd ? lastAdd.id + 1 : 1;

    // 🔹 Create new SingleAdd with auto-incremented id
    const add = new SingleAdd({
      id: nextId,   // ✅ Auto-increment ID
      ...req.body,
    });

    await add.save();
    // await addUserLogs({ ... });

    res.status(201).json(add);
  } catch (err) {
    handleError(res, "Error creating SingleAdd:", err);
  }
};


export const updateSingleAdd = async (req, res) => {
  try {
    const updatedAdd = await SingleAdd.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedAdd) return res.status(404).json({ error: "SingleAdd not found" });
    // await addUserLogs({ ... });
    res.json({ message: "SingleAdd updated successfully", add: updatedAdd });
  } catch (err) {
    handleError(res, "Error updating SingleAdd:", err);
  }
};

export const getAllSingleAdds = async (req, res) => {
  try {
    let filter = {};
    let limit = null;

    if (req.query.status === "isActive") {
      filter.status = "Active";
      limit = 1; // equivalent to SQL LIMIT 1
    } else {
      filter.status = { $ne: "Deleted" };
    }

    // MongoDB query
    let query = SingleAdd.find(filter).sort({ id: -1 });
    if (limit) {
      query = query.limit(limit);
    }

    const results = await query.lean();

    return res.status(200).json({
      error: false,
      message: "List Fetched successfully.",
      results,
      popups: null // you didn't define how popups is fetched
    });

  } catch (error) {
    console.error("Error fetching single adds:", error);
    return res.status(500).json({
      error: true,
      message: "Internal Server Error"
    });
  }
};


export const getSingleAddById = async (req, res) => {
  try {
    const add = await SingleAdd.findById(req.params.id);
    if (!add) return res.status(404).json({ error: "SingleAdd not found" });
    res.json(add);
  } catch (err) {
    handleError(res, "Error retrieving SingleAdd:", err);
  }
};

export const deleteSingleAdd = async (req, res) => {
  try {
    const result = await SingleAdd.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: "SingleAdd not found" });
    // await addUserLogs({ ... });
    res.json({ message: "SingleAdd deleted successfully" });
  } catch (err) {
    handleError(res, "Error deleting SingleAdd:", err);
  }
};

// ---------- Multiple Add ----------

export const createMultipleAdd = async (req, res) => {
  try {
    // 🔹 Find the latest id
    const lastAdd = await MultipleAdd.findOne().sort({ id: -1 }).select("id");
    const nextId = lastAdd ? lastAdd.id + 1 : 1;

    // 🔹 Create new record with nextId
    const add = new MultipleAdd({
      id: nextId,
      ...req.body
    });

    await add.save();
    // await addUserLogs({ ... });

    res.status(201).json(add);
  } catch (err) {
    handleError(res, "Error creating MultipleAdd:", err);
  }
};


export const updateMultipleAdd = async (req, res) => {
  try {
    const updatedAdd = await MultipleAdd.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedAdd) return res.status(404).json({ error: "MultipleAdd not found" });
    // await addUserLogs({ ... });
    res.json({ message: "MultipleAdd updated successfully", add: updatedAdd });
  } catch (err) {
    handleError(res, "Error updating MultipleAdd:", err);
  }
};

export const getAllMultipleAdds = async (req, res) => {
  try {
    let filter = {};
    
    if (req.query.status === "isActive") {
      filter.status = "Active";
    } else {
      filter.status = { $ne: "Deleted" }; // not equal to Deleted
    }

    // Fetch from MongoDB, sort by id in descending order
    const results = await MultipleAdd.find(filter).sort({ id: -1 }).lean();

    return res.status(200).json({
      error: false,
      message: "List Fetched successfully.",
      results
    });

  } catch (error) {
    console.error("Error fetching multiple adds:", error);
    return res.status(500).json({
      error: true,
      message: "Internal Server Error"
    });
  }
};

export const getMultipleAddById = async (req, res) => {
  try {
    const add = await MultipleAdd.findById(req.params.id);
    if (!add) return res.status(404).json({ error: "MultipleAdd not found" });
    res.json(add);
  } catch (err) {
    handleError(res, "Error retrieving MultipleAdd:", err);
  }
};

export const deleteMultipleAdd = async (req, res) => {
  try {
    const result = await MultipleAdd.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: "MultipleAdd not found" });
    // await addUserLogs({ ... });
    res.json({ message: "MultipleAdd deleted successfully" });
  } catch (err) {
    handleError(res, "Error deleting MultipleAdd:", err);
  }
};

// ---------- Curated Add ----------

export const createCuratedAdd = async (req, res) => {
  try {
    // 🔹 Find latest id
    const lastAdd = await CuratedAdd.findOne().sort({ id: -1 }).select("id");
    const nextId = lastAdd ? lastAdd.id + 1 : 1;

    // 🔹 Create new curated add with next id
    const add = new CuratedAdd({
      id: nextId,
      ...req.body,
    });

    await add.save();

    // await addUserLogs({ ... });

    res.status(201).json(add);
  } catch (err) {
    handleError(res, "Error creating CuratedAdd:", err);
  }
};


export const updateCuratedAdd = async (req, res) => {
  try {
    const updatedAdd = await CuratedAdd.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedAdd) return res.status(404).json({ error: "CuratedAdd not found" });
    // await addUserLogs({ ... });
    res.json({ message: "CuratedAdd updated successfully", add: updatedAdd });
  } catch (err) {
    handleError(res, "Error updating CuratedAdd:", err);
  }
};

export const getAllCuratedAdds = async (req, res) => {
  try {
    // Step 1: Filter logic
    let filter = {};
    if (req.query.status === "isActive") {
      filter.is_active = true;
    } else {
      filter.status = { $ne: "Deleted" };
    }

    // Step 2: Get curatedadds list
    const curatedDocs = await mongoose.connection.db
      .collection("curatedadds")
      .find(filter)
      .sort({ id: -1 })
      .toArray();

    // Step 3: Fetch products for each curated add (comma-separated product_ids)
    for (let i = 0; i < curatedDocs.length; i++) {
      if (curatedDocs[i].products) {
        // split comma-separated string into array of numbers
        const productIds = curatedDocs[i].products
          .split(",")
          .map(id => Number(id.trim()))
          .filter(id => !isNaN(id));
//console.log("productIds",productIds);
        if (productIds.length > 0) {
          const products = await mongoose.connection.db
            .collection("products")
            .find({ product_id: { $in: productIds } })
            .project({
              _id: 0,
              product_id: 1,
              vendor_article_name: 1,
              sku_code: 1
            })
            .toArray();

          curatedDocs[i].products = products;
        } else {
          curatedDocs[i].products = [];
        }
      } else {
        curatedDocs[i].products = [];
      }
    }

    // Step 4: Group into CURATED and YOURSELF
    const curated = curatedDocs.filter(item => item.type === "CURATED");
    const yourself = curatedDocs.filter(item => item.type === "YOURSELF");

    const resData = {
      CURATED: curated,
      YOURSELF: yourself
    };

    // Step 5: Send response
    return res.status(200).json({
      error: false,
      message: "List Fetched successfully.",
      results: resData
    });

  } catch (error) {
    console.error("Error fetching curated adds:", error);
    return res.status(500).json({
      error: true,
      message: "Internal Server Error"
    });
  }
};




export const getCuratedAddById = async (req, res) => {
  try {
    const add = await CuratedAdd.findById(req.params.id);
    if (!add) return res.status(404).json({ error: "CuratedAdd not found" });
    res.json(add);
  } catch (err) {
    handleError(res, "Error retrieving CuratedAdd:", err);
  }
};

export const deleteCuratedAdd = async (req, res) => {
  try {
    const result = await CuratedAdd.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: "CuratedAdd not found" });
    // await addUserLogs({ ... });
    res.json({ message: "CuratedAdd deleted successfully" });
  } catch (err) {
    handleError(res, "Error deleting CuratedAdd:", err);
  }
};

export const gethomecontent = async (req, res) => {
  try {
    const results = await HomeContent.find().lean();
//console.log("results",results);
    res.status(200).json({
      status: true,
      message: "Home Content Fetched successfully",
      data: results,
    });
  } catch (error) {
    console.error("Error fetching home content:", error);
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};
export const updateHomeContent = async (req, res) => {
  try {
    const { id, name, heading, image, content } = req.body;

    // Basic validation
    if (!heading || !image || !content || !name) {
      return res.status(400).json({ error: "All fields are required." });
    }

    let result, type;

    // 🔹 Check if record exists by name
    const existingContent = await HomeContent.findOne({ name });

    if (existingContent) {
      // Update existing record (use `name` instead of `id` for lookup)
      result = await HomeContent.updateOne(
        { name },
        { $set: { heading, image, content } }
      );
      type = "update-home-content";
    } else {
      // 🔹 Auto-generate next sequential id
      const latestRecord = await HomeContent.findOne().sort({ id: -1 }).limit(1);
      const newId = latestRecord ? latestRecord.id + 1 : 1;

      result = await HomeContent.create({
        id: newId,
        name,
        heading,
        image,
        content,
      });
      type = "add-home-content";
    }

    // 🔹 Log user activity
    const userLogs = {
      user_id: req.user?._id || "",
      payload: JSON.stringify(req.body),
      response: JSON.stringify(result),
      type,
    };
    await addUserLogs(userLogs);

    res.status(200).json({
      message: existingContent
        ? "Home content updated successfully."
        : "Home content added successfully.",
    });
  } catch (error) {
    console.error("Error updating Home content:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};




export const getCuratedAddsBySlug = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 30;
    const startIndex = (page - 1) * pageSize;

    // Fetch paginated curated adds by URL
    const totalItems = await CuratedAdd.countDocuments({ url: req.params.url });
    const result = await CuratedAdd.find({ url: req.params.url })
      .skip(startIndex)
      .limit(pageSize);

    for (let i = 0; i < result.length; i++) {
      // Fetch offer products
      const offerProducts = await OfferProducts.find({ offer_id: Number(result[i].id) });
      const res_data = await Promise.all(
        offerProducts.map(async (offerProd) => {
          // Fetch product by numeric id
          const product = await Product.findOne({ product_id: offerProd.product_id }).lean();
          if (!product) return null;

          // Fetch brand and category manually
          const brand = await Brand.findOne({ id: product.brand }).lean();
          const category = await Category.findOne({ id: product.category }).lean();

          // Map brand and category names
          product.brand_name = brand?.name || "";
          product.category_name = category?.name || "";
          product.category_slug = category?.slug || "";

          // Map images → product_images as array of objects with url, take first element only
          const imagesArray = product.product_images || [];
          // product.product_images =
          //   imagesArray.length > 0 ? [{ image: imagesArray[0] }] : [];

          return product;
        })
      );

      result[i] = result[i].toObject();
      result[i].products = res_data.filter(Boolean);
    }

    res.status(200).json({
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
        currentPage: page,
        itemsPerPage: pageSize,
      },
      products: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

