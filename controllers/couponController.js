import Coupon from "../DB/models/coupon.js";
import { addUserLogs } from "../utils/common.js";

// helper to get increment id
const getNextId = async () => {
  const lastCoupon = await Coupon.findOne().sort({ id: -1 }).lean();
  return lastCoupon ? lastCoupon.id + 1 : 1;
};

// ➕ Add Coupon
export const addCoupon = async (req, res) => {
  try {
    const {
      name,
      coupon_code,
      start_date,
      end_date,
      type,
      offer_amount,
      max_user_limit,
      max_order_limit,
      min_order_value,
      image,
      brand,
      category,
      access_role,
      free_qty,
      order_qty,
      product_id
    } = req.body;

    if (!name || !coupon_code || !start_date || !end_date || !type || !offer_amount || max_user_limit === undefined || max_order_limit === undefined || min_order_value === undefined || !access_role) {
      return res.status(400).json({ error: true, message: "Missing required fields" });
    }

    const newId = await getNextId();

    const coupon = await Coupon.create({
      id: newId,
      name,
      coupon_code,
      start_date,
      end_date,
      type,
      offer_amount,
      max_user_limit,
      max_order_limit,
      min_order_value,
      image,
      brand,
      category,
      access_role,
      free_qty,
      order_qty,
      product_id
    });

    await addUserLogs({
      user_id: "",
      payload: JSON.stringify(req.body),
      response: JSON.stringify(coupon),
      type: "addCoupon"
    });

    return res.status(201).json({ error: false, message: "Coupon added successfully", data: coupon });
  } catch (err) {
    console.error("Error adding coupon:", err);
    return res.status(500).json({ error: true, message: err.message });
  }
};

// 📋 Get All Coupons (not deleted)
export const getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({ status: { $ne: "Deleted" } }).select("-_id");
    return res.status(200).json({ error: false, message: "List fetched successfully", results: coupons });
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
};

// ✏️ Edit Coupon
export const editCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findOneAndUpdate(
      { id: Number(id) },
      { $set: req.body },
      { new: true }
    ).select("-_id");

    if (!coupon) {
      return res.status(404).json({ error: true, message: "Coupon not found" });
    }

    await addUserLogs({
      user_id: "",
      payload: JSON.stringify(req.body),
      response: JSON.stringify(coupon),
      type: "editCoupon"
    });

    return res.status(200).json({ error: false, message: "Coupon updated successfully", data: coupon });
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
};

// 🔎 Get Coupon by ID
export const getCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findOne({ id: Number(id) }).select("-_id");

    if (!coupon) return res.status(404).json({ error: true, message: "Coupon not found" });

    return res.status(200).json({ error: false, message: "Coupon detail retrieved", data: coupon });
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
};

// ❌ Delete Coupon (soft delete)
export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findOneAndUpdate(
      { id: Number(id) },
      { $set: { status: "Deleted" } },
      { new: true }
    );

    if (!coupon) return res.status(404).json({ error: true, message: "Coupon not found" });

    await addUserLogs({
      user_id: "",
      payload: JSON.stringify(req.body),
      response: JSON.stringify(coupon),
      type: "deleteCoupon"
    });

    return res.status(200).json({ error: false, message: "Coupon deleted successfully" });
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
};

// 🔎 Get Coupon by Code
export const getCouponByCode = async (req, res) => {
  try {
    const { coupon_code } = req.params;
    const coupon = await Coupon.findOne({ coupon_code, status: { $ne: "Deleted" } }).select("-_id");

    if (!coupon) return res.status(404).json({ error: true, message: "Coupon not found" });

    return res.status(200).json({ error: false, message: "Coupon retrieved", data: coupon });
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
};

// 🟢 Get All Active Coupons
export const getAllActiveCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({ status: "Active" }).select("-_id");
    return res.status(200).json({ error: false, message: "List fetched successfully", results: coupons });
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
};
