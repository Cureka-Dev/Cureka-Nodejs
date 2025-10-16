import _ from "lodash";
import ArticalType from "../DB/models/articalType.js";
import StandardSize from "../DB/models/standardSize.js";
import { addUserLogs } from '../utils/common.js';
import mongoose from "mongoose";
const { isEmpty } = _;

// ✅ List all Article Types with Pagination
export const listAllArticalTypes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 30;

    const totalItems = await ArticalType.countDocuments();
    const results = await ArticalType.find()
      .sort({ created_at: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    const totalPages = Math.ceil(totalItems / pageSize);

    res.status(200).json({
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: pageSize,
      },
      results,
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// ✅ Add Article Type
export const addArticalType = async (req, res) => {
  try {
    const { name, status } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        error: true,
        message: "Please give name to create article type",
        data: {},
      });
    }

    const exists = await ArticalType.findOne({ name });
    if (exists) {
      return res.status(400).json({
        error: true,
        message: `This ${name} article name is already taken. Please enter different`,
      });
    }

    // 🔹 Find latest id from same collection
    const lastArtical = await ArticalType.findOne().sort({ id: -1 }).select("id");
    const newId = lastArtical ? lastArtical.id + 1 : 1;

    // 🔹 Create new article with incremented id
    const newArticalType = new ArticalType({ id: newId, name, status });
    const saved = await newArticalType.save();

    // Add user logs
    await addUserLogs({
      user_id: 0,
      payload: JSON.stringify(req.body),
      response: JSON.stringify(saved),
      type: "addArticalType",
    });

    res.status(200).json({
      error: false,
      message: "Article added successfully.",
      data: saved,
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};


// ✅ Edit Article Type by custom numeric id
export const editArticalType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    if (!id) {
      return res.status(400).json({
        error: true,
        message: "Please provide all required parameters (id)",
        data: {},
      });
    }

    const updated = await ArticalType.findOneAndUpdate(
      { id: Number(id) }, // 🔹 use numeric id field
      { name, status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        error: true,
        message: "Article type not found",
      });
    }

    res.status(200).json({
      error: false,
      message: "Article detail updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};


// ✅ Delete Article Type
export const deleteArticalType = async (req, res) => {
  try {
    const id = Number(req.params.id); // Convert to number

    if (!id) {
      return res.status(400).json({
        error: true,
        message: "Please provide the ID of the artical type to delete",
        data: {},
      });
    }

    const deleted = await ArticalType.findOneAndDelete({ id });

    if (!deleted) {
      return res.status(404).json({
        error: true,
        message: "Artical type not found",
        data: {},
      });
    }

    res.status(200).json({
      error: false,
      message: "Artical type deleted successfully",
      data: { id },
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};


//
// ✅ Standard Sizes
//

// List Standard Sizes by artical_type_id
export const listStandardSize = async (req, res) => {
  try {
    const { artical_type_id } = req.query;

    if (!artical_type_id) {
      return res.status(400).json({
        error: true,
        message: "Please provide artical_type_id",
      });
    }

    const results = await StandardSize.find({ artical_type_id });
    res.status(200).json({
      error: false,
      message: "List fetched successfully",
      results,
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// Create Standard Size
export const createStandardSize = async (req, res) => {
  try {
    const { name, status,artical_type_id } = req.body;

    if (!name) {
      return res.status(400).json({
        error: true,
        message: "Please provide name",
      });
    }
// 🔹 Find latest id from same collection
    const lastStadardSise = await StandardSize.findOne().sort({ id: -1 }).select("id");
    const newId = lastStadardSise ? lastStadardSise.id + 1 : 1;
    const newStandard = new StandardSize({ id:newId, name, status,artical_type_id });
    const saved = await newStandard.save();

    res.status(200).json({
      error: false,
      message: "Standard size entry added successfully",
      data: saved,
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// Update Standard Size
export const updateStandardSize = async (req, res) => {
  try {
    const { id } = req.params; // numeric id from URL
    const { name, status } = req.body;

    if (!id || !name) {
      return res.status(400).json({
        error: true,
        message: "Please provide id and name",
      });
    }

    // Convert id to number (if stored as Number in schema)
    const numericId = Number(id);

    const updated = await StandardSize.findOneAndUpdate(
      { id: numericId }, // <-- custom field, not _id
      { name, status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        error: true,
        message: "Standard size entry not found",
      });
    }

    res.status(200).json({
      error: false,
      message: "Standard size entry updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};


// Delete Standard Size
export const deleteStandardSize = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: true,
        message: "Please provide the ID of the standard size to delete",
      });
    }

    // Convert id to number if schema stores it as Number
    const numericId = Number(id);

    const deleted = await StandardSize.findOneAndDelete({ id: numericId });

    if (!deleted) {
      return res.status(404).json({
        error: true,
        message: "Standard size entry not found",
      });
    }

    res.status(200).json({
      error: false,
      message: "Standard size entry deleted successfully",
      data: { id: numericId },
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

