import Preference from "../DB/models/preference.js";
import _ from "lodash";
const { isEmpty } = _;

// 📌 List all preferences with pagination
export const listAllPreferences = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 30;

    const totalItems = await Preference.countDocuments();
    const results = await Preference.find()
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .sort({ createdAt: -1 });

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

// 📌 Add new preference
export const addPreference = async (req, res) => {
  try {
    const { name, status } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        error: true,
        message: "Please give name to create preference",
        data: {},
      });
    }

    const existing = await Preference.findOne({ name });
    if (existing) {
      return res.status(400).json({
        error: true,
        message: `This ${name} preference name is already taken. Please enter different.`,
      });
    }

    // 🔹 Find latest id from same collection
    const lastPref = await Preference.findOne().sort({ id: -1 }).select("id");
    const newId = lastPref ? lastPref.id + 1 : 1;

    // 🔹 Create with incremented id
    const newPref = await Preference.create({ id: newId, name, status });

    res.status(200).json({
      error: false,
      message: "Preference added successfully",
      data: newPref,
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};


// 📌 Edit preference
export const editPreference = async (req, res) => {
  try {
    const { name, status } = req.body;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: true,
        message: "Please provide id to update the preference.",
        data: {},
      });
    }

    // Convert id to number (since we’re using auto-increment numeric id)
    const preferenceId = Number(id);

    // 🔹 Update by custom id field
    const updated = await Preference.findOneAndUpdate(
      { id: preferenceId }, 
      { $set: { name, status } }, 
      { new: true } // return updated document
    );

    if (!updated) {
      return res.status(404).json({
        error: true,
        message: "Preference not found with given id.",
        data: {},
      });
    }

    return res.status(200).json({
      error: false,
      message: "Preference updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: true,
      message: error.message,
      data: {},
    });
  }
};


// 📌 Delete preference
export const deletePreference = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: true,
        message: "Please provide the ID of the Preference to delete.",
      });
    }

    // Convert to number (since your IDs are numeric, not ObjectId)
    const numericId = parseInt(id);

    const deletedPref = await Preference.findOneAndDelete({ id: numericId });

    if (!deletedPref) {
      return res.status(404).json({
        error: true,
        message: "Preference not found",
      });
    }

    res.status(200).json({
      error: false,
      message: "Preference deleted successfully",
      data: deletedPref,
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

