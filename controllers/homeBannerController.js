import HomeBanner from '../DB/models/HomeBanner.js';

// Create Home Banner
export const createHomeBanner = async (req, res) => {
  try {
    const { image, category, status, brand, link, position } = req.body;

    if (!image || !status) {
      return res.status(400).json({ error: "Image and Status are required." });
    }

    const banner = new HomeBanner({ image, category, status, brand, link, position });
    const savedBanner = await banner.save();

    res.status(201).json({ id: savedBanner._id });
  } catch (error) {
    console.error("Error creating banner:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// List Home Banners
export const listHomeBanners = async (req, res) => {
  try {
    const banners = await HomeBanner.find().sort({ position: 1 });
    res.status(200).json({
      status: true,
      message: "Home Banners fetched successfully",
      data: banners,
    });
  } catch (error) {
    console.error("Error retrieving banners:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Delete Home Banner
export const deleteHomeBanner = async (req, res) => {
  try {
    const result = await HomeBanner.findByIdAndDelete(req.params.id);

    if (!result) {
      return res.status(404).json({ error: "Home banner not found." });
    }

    res.status(200).json({ message: "Home banner deleted successfully." });
  } catch (error) {
    console.error("Error deleting banner:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Update Home Banner
export const updateHomeBanner = async (req, res) => {
  try {
    const { category, image, status, brand, link, position } = req.body;

    if (!image || !status) {
      return res.status(400).json({ error: "Image and Status are required." });
    }

    const updated = await HomeBanner.findByIdAndUpdate(
      req.params.id,
      { category, image, status, brand, link, position },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Home banner not found." });
    }

    res.status(200).json({ message: "Home banner updated successfully." });
  } catch (error) {
    console.error("Error updating banner:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
