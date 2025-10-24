// controllers/productImportController.js

import ExcelJS from "exceljs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import _ from "lodash";
import Product from "../DB/models/product.js";
import Category from "../DB/models/category.js";
import SubCategory from "../DB/models/subCategory.js";
import SubSubCategory from "../DB/models/subSubCategory.js";
import SubSubSubCategory from "../DB/models/subSubSubCategory.js";
import Brand from "../DB/models/brand.js";
import Concern from "../DB/models/concern.js";
// import ArticleType from "../models/ArticleType.js";
// import StandardSize from "../models/StandardSize.js";
import OfferProduct from "../DB/models/offerProducts.js";
// import ProductImage from "../models/ProductImage.js";
import { requiredColumnsForProductsExcelFile, requiredColumnsForProductImagesExcelFile, requiredColumnsForProductPricesExcelFile, requiredColumnsForOfferProductExcelFile } from "../utils/constants.js";
import csv from "csv-parser";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const validateExcelColumns = (worksheet, requiredColumns) => {
  const headers = worksheet.getRow(1).values.slice(1);
  const missingColumns = requiredColumns.filter(col => !headers.includes(col));
  console.log("missingColumns", missingColumns);
  return missingColumns.length === 0;
};

const readExcelFile = async (filePath) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  return workbook;
};

const cleanString = (input) => {
  return input.toLowerCase().replace(/[^\w\s,]/gi, '').replace(/,/g, '-').replace(/\s+/g, '-').replace(/-+$/, '');
};

const calculateFinalPrice = (mrp, discountAmt, discountPct) => {
  if (discountAmt) return Math.round(mrp - discountAmt);
  if (discountPct) return Math.round(mrp - (mrp * discountPct) / 100);
  return Math.round(mrp);
};

// ✅ Helper to safely get .id or null
//const getIdSafe = (doc) => (doc ? doc.id : null);

// ✅ Helper to safely get .id or return error-friendly message
const getIdSafe = (doc, fieldName, productId) => {
  if (!doc) {
    throw new Error(`Missing reference: ${fieldName} not found for product_id ${productId}`);
  }
  return doc.id;
};

const importProducts = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    console.log(req.file,"Import Product");
    const workbook = await readExcelFile(req.file.path);
    const worksheet = workbook.worksheets[0];

    if (!validateExcelColumns(worksheet, requiredColumnsForProductsExcelFile)) {
      return res.status(400).json({ error: "Excel sheet is missing required columns." });
    }

    const headers = worksheet.getRow(1).values.slice(1);
    const products = [];

    worksheet.eachRow((row, idx) => {
      if (idx === 1) return;
      const obj = {};
      row.eachCell((cell, i) => (obj[headers[i - 1]] = cell.value));
      products.push(obj);
    });
    console.log("Products-=-=-=",products);
    
    for (const p of products) {
      const [
        category,
        subCategory,
        subSubCategory,
        subSubSubCategory,
        brand,
        concern1,
        concern2,
        concern3,
      ] = await Promise.all([
        Category.findOne({ name: p.category }),
        SubCategory.findOne({ name: p.sub_category }),
        SubSubCategory.findOne({ name: p.sub_sub_category }),
        SubSubSubCategory.findOne({ sub_sub_sub_category_name: p.sub_sub_sub_category }),
        Brand.findOne({ name: p.brand }),
        Concern.findOne({ name: p.concern_1 }),
        Concern.findOne({ name: p.concern_2 }),
        Concern.findOne({ name: p.concern_3 }),
      ]);
      console.log("Details",category,
        subCategory,
        subSubCategory,
        subSubSubCategory,
        brand,
        concern1,
        concern2,
        concern3,);
      
      // ✅ Check for missing references and throw error
      const brandId = getIdSafe(brand, "brand", p.product_id);
      const categoryId = getIdSafe(category, "category", p.product_id);
      const subCategoryId = getIdSafe(subCategory, "sub_category", p.product_id);
      const subSubCategoryId = getIdSafe(subSubCategory, "sub_sub_category", p.product_id);
      // const subSubSubCategoryId = getIdSafe(subSubSubCategory, "sub_sub_sub_category", p.product_id);
      let subSubSubCategoryId = null;
      if (p.sub_sub_sub_category) {
        subSubSubCategoryId = getIdSafe(subSubSubCategory, "sub_sub_sub_category", p.product_id);
      }
      const concern1Id = getIdSafe(concern1, "concern_1", p.product_id);
      let concern2Id = null;
      if (p.concern_2) {
        concern2Id = getIdSafe(concern2, "concern_2", p.product_id);
      }
      // const concern2Id = getIdSafe(concern2, "concern_2", p.product_id);
      let concern3Id = null;
      if (p.concern_3) {
        concern3Id = getIdSafe(concern3, "concern_3", p.product_id);
      }
      // const concern3Id = getIdSafe(concern3, "concern_3", p.product_id);

      const final_price = calculateFinalPrice(
        p.mrp,
        p.discount_amount,
        p.discount_percentage
      );
         const latestOfferProductId = await Product.findOne().sort({ id: -1 }).lean();
    const newId = latestOfferProductId ? latestOfferProductId.id + 1 : 1;
      await Product.findOneAndUpdate(
        { product_id: p.product_id },
        {
          id: newId,
          product_id:p.product_id,
          vendor_article_name: p.vendor_article_name,
          slug: cleanString(p.vendor_article_name),
          url: cleanString(p.vendor_article_name),
          brand: brandId,
          category: categoryId,
          sub_category: subCategoryId,
          sub_sub_category: subSubCategoryId,
          sub_sub_sub_category: subSubSubCategoryId,
          concern_1: concern1Id,
          concern_2: concern2Id,
          concern_3: concern3Id,
          price: {
            mrp: p.mrp,
            discount_amount: p.discount_amount,
            discount_percentage: p.discount_percentage,
            final_price,
          },
          faqs: [1, 2, 3, 4, 5, 6, 7]
            .map((i) => ({
              question: p[`faq${i}`],
              answer: p[`faq${i}_a`],
            }))
            .filter((f) => f.question && f.answer),
          status: "Active",
        },
        { upsert: true, new: true }
      );
    }

    res.status(200).json({ message: "Products imported successfully" });
  } catch (err) {
    console.error("❌ Import error:", err.message);
    res.status(400).json({ error: true, message: err.message });
  }
};


const importProductImages = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const workbook = await readExcelFile(req.file.path);
    const worksheet = workbook.worksheets[0];

    if (!validateExcelColumns(worksheet, requiredColumnsForProductImagesExcelFile)) {
      return res.status(400).json({ error: "Excel sheet is missing required columns." });
    }

    const headers = worksheet.getRow(1).values.slice(1);
    const records = [];

    worksheet.eachRow((row, idx) => {
      if (idx === 1) return; // skip header
      const obj = {};
      row.eachCell((cell, i) => {
        let val = cell.value;

        // sanitize "NULL"/empty strings to null
        if (val === "NULL" || val === "null" || val === "" || val === undefined) {
          val = null;
        }

        obj[headers[i - 1]] = val;
      });
      records.push(obj);
    });

    let updated = 0,
      skipped = 0;

    for (const record of records) {
      const { product_id, image, sortOrder, sku_code } = record;

      if (!product_id || !image) {
        console.warn("Skipping invalid image row:", record);
        skipped++;
        continue;
      }

      // Push image directly without fetching full product
      const result = await Product.updateOne(
        { product_id: Number(product_id) },
        {
          $push: {
            product_images: {
              image: String(image),
              sortOrder: sortOrder ? Number(sortOrder) : 1,
              sku_code: sku_code || null,
            },
          },
        }
      );

      if (result.matchedCount === 0) {
        console.warn(`Product not found for product_id: ${product_id}`);
        skipped++;
      } else {
        updated++;
      }
    }

    res.status(200).json({
      message: "Product Images Imported Successfully",
      summary: { updated, skipped },
    });
  } catch (err) {
    console.error("Image import error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};




const importProductPrices = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const workbook = await readExcelFile(req.file.path);
    const worksheet = workbook.worksheets[0];

    if (!validateExcelColumns(worksheet, requiredColumnsForProductPricesExcelFile)) {
      return res.status(400).json({ error: "Excel sheet is missing required columns." });
    }

    const headers = worksheet.getRow(1).values.slice(1);
    const records = [];

    worksheet.eachRow((row, idx) => {
      if (idx === 1) return; // skip header row
      const obj = {};
      row.eachCell((cell, i) => {
        let val = cell.value;

        // Normalize "null"/empty values
        if (val === "NULL" || val === "null" || val === "" || val === undefined) {
          val = null;
        }

        obj[headers[i - 1]] = val;
      });
      records.push(obj);
    });

    let updated = 0, skipped = 0;

    for (const price of records) {
      const productId = Number(price.product_id);
      if (!productId) {
        console.warn("Skipping invalid row:", price);
        skipped++;
        continue;
      }

      const mrp = price.mrp ? Number(price.mrp) : 0;
      const discount_amount = price.discount_amount ? Number(price.discount_amount) : 0;
      const discount_percentage = price.discount_percentage ? Number(price.discount_percentage) : 0;

      const final_price = calculateFinalPrice(mrp, discount_amount, discount_percentage);

      const result = await Product.updateOne(
        { product_id: productId },
        {
          $set: {
            mrp,
            discount_amount,
            discount_percentage,
            final_price,
          },
        }
      );

      if (result.matchedCount === 0) {
        console.warn(`Product not found for product_id: ${productId}`);
        skipped++;
      } else {
        updated++;
      }
    }

    res.status(200).json({
      message: "Product Prices Updated Successfully",
      summary: { updated, skipped },
    });
  } catch (err) {
    console.error("Error in importProductPrices:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


const importOfferProducts = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const offerId = req.body.offer_id;
    if (!offerId) return res.status(400).json({ error: "Offer ID is required" });

    const workbook = await readExcelFile(req.file.path);
    const worksheet = workbook.worksheets[0];
    if (!validateExcelColumns(worksheet, requiredColumnsForOfferProductExcelFile)) {
      return res.status(400).json({ error: "Excel sheet is missing required columns." });
    }

    const headers = worksheet.getRow(1).values.slice(1);
    const records = [];

    worksheet.eachRow((row, idx) => {
      if (idx === 1) return;
      const obj = {};
      row.eachCell((cell, i) => obj[headers[i - 1]] = cell.value);
      records.push(obj);
    });

    for (const record of records) {
      //console.log("ecord.product_id",record.product_id)
      const prod = await Product.findOne({ product_id: record.product_id, sku_code: record.sku_code });
      //console.log("prod",prod);
      if (prod) {
           const latestOfferProductId = await OfferProduct.findOne().sort({ id: -1 }).lean();
    const newId = latestOfferProductId ? latestOfferProductId.id + 1 : 1;
        await OfferProduct.create({ id:newId,offer_id: offerId, product_id: record.product_id });
      }
    }

    res.status(200).json({ message: "Offer Products Imported Successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Generate and return sample Excel file URL
const downloadSampleExcel = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("SampleSheet");

    // 🔹 Add headers row
    worksheet.addRow(requiredColumnsForProductsExcelFile);

    // 🔹 File details
    const fileName = "cureka-products-sample.xlsx";
    const filePath = path.join(__dirname, "../public", fileName);

    // 🔹 Write Excel file
    await workbook.xlsx.writeFile(filePath);

    // 🔹 Build dynamic download URL
    const protocol = req.protocol; // handles http/https
    const host = req.get("host"); // dynamic host
    const downloadUrl = `${protocol}://${host}/files/${fileName}`;

    res.status(200).json({
      error: false,
      message: "Sample Excel file generated successfully",
      downloadUrl,
    });
  } catch (err) {
    console.error("Error generating sample excel:", err);
    res.status(500).json({
      error: true,
      message: "Failed to generate sample file",
    });
  }
};


// Generic helper
const generateSampleFile = async (columns, filename, req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("SampleSheet");
    worksheet.addRow(columns);

    const filePath = path.join(__dirname, "../public", filename);
    await workbook.xlsx.writeFile(filePath);

    const downloadUrl = `https://${req.get("host")}/files/${filename}`;
    res.json({ downloadUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

// Individual endpoints
const downloadSampleProductImageExcel = async (req, res) => {
  await generateSampleFile(
    requiredColumnsForProductImagesExcelFile,
    "cureka-products-images-sample.xlsx",
    req,
    res
  );
};

const downloadSampleProductPriceExcel = async (req, res) => {
  await generateSampleFile(
    requiredColumnsForProductPricesExcelFile,
    "cureka-products-prices-sample.xlsx",
    req,
    res
  );
};

const downloadSampleOfferproductExcel = async (req, res) => {
  await generateSampleFile(
    requiredColumnsForOfferProductExcelFile,
    "cureka-offer-products-sample.xlsx",
    req,
    res
  );
};
const updateProductsFromCSV = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "CSV file is required" });
  }

  const BATCH_SIZE = 500;
  let updates = [];
  let totalRows = 0;
  let updatedCount = 0;
  let upsertedCount = 0;

  try {
    const stream = fs.createReadStream(req.file.path).pipe(csv());

    for await (const row of stream) {
      totalRows++;
      const product_id = Number(row.product_id);
      if (!product_id) continue;

      // Prepare bulk update - include all fields even if empty
      updates.push({
        updateOne: {
          filter: { product_id: product_id },
          update: {
            $set: {
              vendor_article_name: row.vendor_article_name ?? null,
              url: row.url ?? null,
              vendor_sku_code: row.vendor_sku_code ?? null,
              // Add extra fields here as needed, using null if empty
              // price: row.price ? Number(row.price) : null,
              // stock: row.stock ? Number(row.stock) : null,
            },
          },
          upsert: true,
        },
      });

      // Execute batch
      if (updates.length >= BATCH_SIZE) {
        const result = await Product.bulkWrite(updates);
        updatedCount += result.modifiedCount;
        upsertedCount += result.upsertedCount;
        updates = [];
      }
    }

    // Execute remaining batch
    if (updates.length > 0) {
      const result = await Product.bulkWrite(updates);
      updatedCount += result.modifiedCount;
      upsertedCount += result.upsertedCount;
    }

    // Delete uploaded CSV
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      status: true,
      message: "Products updated/inserted successfully",
      totalRows,
      updated: updatedCount,
      upserted: upsertedCount,
    });
  } catch (err) {
    console.error("Error updating products from CSV:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



export {
  importProducts,
  importProductImages,
  importProductPrices,
  importOfferProducts,
  downloadSampleExcel,
  downloadSampleProductImageExcel,
  downloadSampleProductPriceExcel,
  downloadSampleOfferproductExcel,
  updateProductsFromCSV
};
