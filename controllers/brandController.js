import Brands from '../DB/models/brand.js';
import { generateUniqueCode } from '../utils/codeUtils.js';
import { status } from '../utils/constants.js';
import { addUserLogs } from '../utils/common.js';

const createOrFetchBrand = async (req, res) => {
  try {
    const { name,image,description } = req.body;

    if (!name) {
      return res.status(400).json({ status: false, message: 'Brand name is required' });
    }

    // 🔹 Check if brand already exists (case insensitive)
    let brand = await Brands.findOne({ name: new RegExp(`^${name}$`, 'i') });

    if (brand) {
      return res.json({ status: true, message: 'Brand already exists', data: brand });
    }

    // 🔹 Find latest brand id
    const latestBrand = await Brands.findOne().sort({ id: -1 }).select("id");
    const nextId = latestBrand ? latestBrand.id + 1 : 1;

    // 🔹 Generate unique code for brand
    const code = generateUniqueCode(name);

    // 🔹 Create new brand with sequential id
    const newBrand = new Brands({
      id: nextId,
      name,
      image: image || "default.jpg", // fallback if not provided
      description: description || "No description provided",
      status: status.active,
      code
    });

    await newBrand.save();

    // 🔹 Log user activity
    const userLogs = {
      user_id: req.user.id || null,
      payload: JSON.stringify(req.body),
      response: JSON.stringify(newBrand),
      type: 'createBrand'
    };
    await addUserLogs(userLogs);

    res.status(201).json({ status: true, message: 'Brand created', data: newBrand });
  } catch (error) {
    console.error('Create brand error:', error);
    res.status(500).json({ status: false, message: 'Internal Server Error' });
  }
};


const getAllBrands = async (req, res) => {
  try {
    const brands = await Brands.find().sort({ createdAt: -1 });
    res.json({ status: true, message: 'Brands fetched', data: brands });
  } catch (error) {
    console.error('Fetch brands error:', error);
    res.status(500).json({ status: false, message: 'Internal Server Error' });
  }
};

const getBrandById = async (req, res) => {
  try {
    const brand = await Brands.findById(req.params.id);
    if (!brand) return res.status(404).json({ status: false, message: 'Brand not found' });

    res.json({ status: true, data: brand });
  } catch (error) {
    console.error('Get brand by ID error:', error);
    res.status(500).json({ status: false, message: 'Internal Server Error' });
  }
};

const updateBrand = async (req, res) => {
  try {
    const brand = await Brands.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!brand) return res.status(404).json({ status: false, message: 'Brand not found' });

    res.json({ status: true, message: 'Brand updated', data: brand });
  } catch (error) {
    console.error('Update brand error:', error);
    res.status(500).json({ status: false, message: 'Internal Server Error' });
  }
};

const deleteBrand = async (req, res) => {
  try {
    const brand = await Brands.findByIdAndDelete(req.params.id);
    if (!brand) return res.status(404).json({ status: false, message: 'Brand not found' });

    res.json({ status: true, message: 'Brand deleted' });
  } catch (error) {
    console.error('Delete brand error:', error);
    res.status(500).json({ status: false, message: 'Internal Server Error' });
  }
};

export {
  createOrFetchBrand,
  getAllBrands,
  getBrandById,
  updateBrand,
  deleteBrand
};
