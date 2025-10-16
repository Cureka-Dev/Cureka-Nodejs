import Popup from "../DB/models/popup.js";

// GET all non-deleted popups
export const listAllPopups = async (req, res) => {
  try {
    const popups = await Popup.find({ status: { $ne: "Deleted" } }).sort({ createdAt: -1 });
    res.status(200).json({ error: false, message: "List fetched successfully", results: popups });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// GET single popup by ID
export const getPopup = async (req, res) => {
  try {
    const popup = await Popup.findById(req.params.id);
    res.status(200).json({ error: false, message: "Popup fetched successfully", results: popup });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// ADD new popup
export const addPopup = async (req, res) => {
  try {
    // 🔹 Check if popup name already exists
    const exists = await Popup.findOne({ name: req.body.name });
    if (exists) {
      return res.status(400).json({ error: true, message: `Popup name "${req.body.name}" is already in use.` });
    }

    // 🔹 Get latest id
    const lastPopup = await Popup.findOne().sort({ id: -1 }).select("id");
    const nextId = lastPopup ? lastPopup.id + 1 : 1;

    // 🔹 Create popup with incremented id
    const popup = new Popup({
      id: nextId,
      ...req.body
    });

    await popup.save();

    res.status(201).json({ error: false, message: "Popup added successfully", data: popup });
  } catch (error) {
    console.error("Add popup error:", error);
    res.status(500).json({ error: true, message: error.message });
  }
};


// EDIT popup
export const editPopup = async (req, res) => {
  try {
    const updated = await Popup.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ error: false, message: "Popup updated successfully", data: updated });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// DELETE popup (hard delete)
export const deletePopup = async (req, res) => {
  try {
    await Popup.findByIdAndDelete(req.params.id);
    res.status(200).json({ error: false, message: "Popup deleted successfully", data: { id: req.params.id } });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};
