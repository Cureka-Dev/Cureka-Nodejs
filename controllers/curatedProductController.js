import CuratedProduct from "../DB/models/curatedProduct.js";
import { addUserLogs } from "../utils/common.js";
import Product from "../DB/models/product.js";

// ✅ List curated products
export const listCuratedProducts = async (req, res) => {
  try {
    const products = await CuratedProduct.find({ flag: 0 }).select("-_id -__v");
    res.status(200).json({ message: "Curated products list", data: products });
  } catch (err) {
    res.status(500).json({ error: "Error fetching curated products", errorMessage: err.message });
  }
};

// ✅ Insert curated product
export const insertCuratedProduct = async (req, res) => {
  try {
    const { name, image, slug_name, status } = req.body;

    const curated = new CuratedProduct({ name, image, slug_name, status });
    await curated.save();

    const response = { message: "Data Inserted Successfully", data: curated.id };

    await addUserLogs({
      user_id: "",
      payload: JSON.stringify(req.body),
      response: JSON.stringify(response),
      type: "insertCuratedProduct"
    });

    res.status(200).json(response);
  } catch (err) {
    res.status(500).json({ error: "Error inserting curated product", errorMessage: err.message });
  }
};

// ✅ Fetch curated product by id
export const fetchCuratedProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await CuratedProduct.findOne({ id, flag: 0 }).select("-_id -__v");

    if (!product) return res.status(404).json({ error: "Curated product not found" });

    res.status(200).json({ message: "Curated product fetched successfully", data: product });
  } catch (err) {
    res.status(500).json({ error: "Error fetching curated product", errorMessage: err.message });
  }
};

// ✅ Delete curated product (soft delete using flag)
export const deleteCuratedProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await CuratedProduct.findOneAndUpdate(
      { id, flag: 0 },
      { flag: 1 },
      { new: true }
    );

    if (!product) return res.status(404).json({ error: "Curated product not found" });

    res.status(200).json({ message: "Curated product deleted successfully", data: product });
  } catch (err) {
    res.status(500).json({ error: "Error deleting curated product", errorMessage: err.message });
  }
};

// ✅ Update curated product
export const updateCuratedProduct = async (req, res) => {
  try {
    const { id, name, image, slug_name, status } = req.body;

    const product = await CuratedProduct.findOneAndUpdate(
      { id, flag: 0 },
      { name, image, slug_name, status },
      { new: true }
    );

    if (!product) return res.status(404).json({ error: "Curated product not found" });

    const response = { message: "Curated product updated successfully", data: { id } };

    await addUserLogs({
      user_id: "",
      payload: JSON.stringify(req.body),
      response: JSON.stringify(response),
      type: "updateCuratedProduct"
    });

    res.status(200).json(response);
  } catch (err) {
    res.status(500).json({ error: "Error updating curated product", errorMessage: err.message });
  }
};

// products API to use for coupons and curated products ADD
export const fetchProductOptions = async (req, res) => {
  try {
    const curatedProduct = await Product.find({}, {
      vendor_article_name: 1,
      product_id: 1,
      sku_code: 1,
      final_price: 1,
      id: 1,
      _id: 0   // ✅ exclude Mongo _id
    });

    if (!curatedProduct || curatedProduct.length === 0) {
      return res.status(404).json({ error: "Something went wrong" });
    }

    const response = {
      message: "Products fetched successfully",
      data: curatedProduct
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching products:", error);
    const response = {
      error: "Error occurred while fetching Products",
      errorMessage: error.message
    };
    res.status(500).json(response);
  }
};
export const export_product = async (req, res) => {
  try {
    const { list } = req.body;

    if (!list || !Array.isArray(list) || list.length === 0) {
      return res.status(400).json({ error: "Please provide valid column list" });
    }

    let columns = [...list];
    const pipeline = [];

    // 🔹 Lookup for category
    if (columns.includes("category_id")) {
      pipeline.push({
        $lookup: {
          from: "categories",
          localField: "category_id",
          foreignField: "id",
          as: "category",
        },
      });
      pipeline.push({ $unwind: { path: "$category", preserveNullAndEmptyArrays: true } });
      columns[columns.indexOf("category_id")] = "category.name";
    }

    // 🔹 Lookup for subcategory
    if (columns.includes("sub_category_id")) {
      pipeline.push({
        $lookup: {
          from: "subcategories",
          localField: "sub_category_id",
          foreignField: "id",
          as: "subcategory",
        },
      });
      pipeline.push({ $unwind: { path: "$subcategory", preserveNullAndEmptyArrays: true } });
      columns[columns.indexOf("sub_category_id")] = "subcategory.name";
    }

    // 🔹 Lookup for sub-subcategory
    if (columns.includes("sub_sub_category_id")) {
      pipeline.push({
        $lookup: {
          from: "subsubcategories",
          localField: "sub_sub_category_id",
          foreignField: "id",
          as: "subsubcategory",
        },
      });
      pipeline.push({ $unwind: { path: "$subsubcategory", preserveNullAndEmptyArrays: true } });
      columns[columns.indexOf("sub_sub_category_id")] = "subsubcategory.name";
    }

    // 🔹 Lookup for brand
    if (columns.includes("brand")) {
      pipeline.push({
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "id",
          as: "brandData",
        },
      });
      pipeline.push({ $unwind: { path: "$brandData", preserveNullAndEmptyArrays: true } });
      columns[columns.indexOf("brand")] = "brandData.name";
    }

    // 🔹 Lookups for concerns
    for (let i = 1; i <= 3; i++) {
      const key = `concern_${i}`;
      if (columns.includes(key)) {
        pipeline.push({
          $lookup: {
            from: "concerns",
            localField: key,
            foreignField: "id",
            as: `concern${i}`,
          },
        });
        pipeline.push({ $unwind: { path: `$concern${i}`, preserveNullAndEmptyArrays: true } });
        columns[columns.indexOf(key)] = `concern${i}.name`;
      }
    }

    // 🔹 Final projection
    const project = {};
    columns.forEach((col) => {
      project[col.replace(/\./g, "_")] = `$${col}`;
    });

    pipeline.push({ $project: project });

    // 🔹 Run aggregation
    const fetchlist = await Product.aggregate(pipeline);

    if (!fetchlist || fetchlist.length === 0) {
      return res.status(404).json({ error: "No products found" });
    }

    res.status(200).json({
      message: "Product data fetched successfully",
      data: fetchlist,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error occurred while exporting the product columns",
      errorMessage: error.message,
    });
  }
};
