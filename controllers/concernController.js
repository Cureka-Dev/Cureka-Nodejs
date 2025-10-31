import Concern from "../DB/models/concern.js";
import kebabCase from "lodash/kebabCase.js";
import NodeCache from "node-cache";
import Product from "../DB/models/product.js";
const cache = new NodeCache({ stdTTL: 300 }); // cache for 120 seconds

// Create Concern
export const createConcern = async (req, res) => {
  try {
    const { name, image = "-", description = "-", status = "active" } = req.body;

    // 🔹 Check if already exists (case-insensitive)
    const existing = await Concern.findOne({ name: new RegExp(`^${name}$`, "i") });
    if (existing) {
      return res.status(409).json({ status: false, message: "Concern already exists." });
    }

    // 🔹 Find latest id and increment
    const lastConcern = await Concern.findOne().sort({ id: -1 }).select("id");
    const nextId = lastConcern ? lastConcern.id + 1 : 1;

    // 🔹 Create new concern
    const concern = new Concern({
      id: nextId, // ✅ Auto-increment ID
      name,
      slug: kebabCase(name),
      image,
      description,
      status
    });

    await concern.save();

    res.status(201).json({ status: true, data: concern });
  } catch (err) {
    console.error("Error creating concern:", err);
    res.status(500).json({ status: false, message: err.message });
  }
};


// Get All Concerns
// export const getAllConcerns = async (req, res) => {
//   try {
//     const { status } = req.query; // read from query params

//     const filter = {};
//     if (status && status === "Active") {
//       filter.status = "Active";
//     }

//     const concerns = await Concern.find(filter);
//     res.status(200).json({ status: true, data: concerns });
//   } catch (err) {
//     res.status(500).json({ status: false, message: err.message });
//   }
// };

export const getAllConcerns = async (req, res) => {
  try {
    const { status } = req.query;
    const cacheKey = status ? `concerns_${status}` : "concerns_all";

    // 1️⃣ Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log("🔁 Returning cached concerns");
      return res.status(200).json({ status: true, data: cachedData, cached: true });
    }

    // 2️⃣ Fetch from DB
    const filter = {};
    if (status && status === "Active") {
      filter.status = "Active";
    }

    const concerns = await Concern.find(filter);
    console.log(concerns,"concerns");
    // Get all concern IDs
    const concernIds = concerns.map(c => c.id);
    console.log(concernIds,"concernIds====");
    
    // Count products grouped by concern
    const productCounts = await Product.aggregate([
      { $match: { concern_1: { $in: concernIds } } },
      { $group: { _id: "$concern_1", count: { $sum: 1 } } },
    ]);
    
    console.log(productCounts,"productCounts");
    const countMap = Object.fromEntries(productCounts.map(p => [p._id.toString(), p.count]));
    console.log(countMap,"countMap");
    
    // 4️⃣ Attach count to each concern
    const concernsWithCounts = concerns.map(c => ({
      ...c.toObject(),
      productCount: countMap[c.id?.toString()] || 0,
    }));
    console.log(concernsWithCounts,"concernsWithCounts");
    // 5️⃣ Sort by product count descending
    concernsWithCounts.sort((a, b) => b.productCount - a.productCount);

    // console.log(concernsWithCounts,"concernsWithCounts");
    
    
    // 3️⃣ Save in cache
    cache.set(cacheKey, concernsWithCounts);

    console.log("💾 Cached concerns for key:", cacheKey);
    res.status(200).json({ status: true, data: concernsWithCounts, cached: false });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// Get Single Concern
export const getConcernById = async (req, res) => {
  try {
    const concern = await Concern.findById(req.params.id);
    if (!concern) return res.status(404).json({ status: false, message: "Concern not found" });

    res.status(200).json({ status: true, data: concern });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// Update Concern
export const updateConcern = async (req, res) => {
  try {
    const updated = await Concern.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ status: false, message: "Concern not found" });

    res.status(200).json({ status: true, data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// Delete Concern
export const deleteConcern = async (req, res) => {
  try {
    const deleted = await Concern.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ status: false, message: "Concern not found" });

    res.status(200).json({ status: true, message: "Concern deleted successfully" });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
