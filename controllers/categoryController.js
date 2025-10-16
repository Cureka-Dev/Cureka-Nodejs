import kebabCase from 'lodash/kebabCase.js';
import Category from '../DB/models/category.js';
import SubCategory from '../DB/models/subCategory.js';
import SubSubCategory from '../DB/models/subSubCategory.js';
import SubSubSubCategory from '../DB/models/subSubSubCategory.js';
import { generateUniqueCategoryCode, generateUniqueCode } from '../utils/codeUtils.js';
import category from '../DB/models/category.js';
import subCategory from '../DB/models/subCategory.js';

// Model mapping for different category levels
const categoryModels = [Category, SubCategory, SubSubCategory, SubSubSubCategory];

// Create a category item, whether it's a category or any subcategory level
export const createCategoryItem = async (req, res) => {
  try {
    const { name, image, description, category, subCategory, subSubCategory, metaTitle, metaDescription,bannerImage } = req.body;

    let model = null;

    if (category && subCategory && subSubCategory) {
      model = SubSubSubCategory;
    } else if (category && subCategory) {
      model = SubSubCategory;
    } else if (category) {
      model = SubCategory;
    } else {
      model = Category;
    }

    // 🔹 Find latest id for the selected model
    const latestItem = await model.findOne().sort({ id: -1 }).select("id");
    const nextId = latestItem ? latestItem.id + 1 : 1;

    const slug = kebabCase(name);
    const code = await generateUniqueCategoryCode(name);

    const newItem = new model({
      id: nextId, // ✅ add sequential id
      name,
      image,
      description,
      slug,
      code,
      metaTitle,
      metaDescription,
      bannerImage,
      ...(category && { category }),
      ...(subCategory && { subCategory }),
      ...(subSubCategory && { subSubCategory }),
    });

    await newItem.save();
    res.status(201).json({ status: true, data: newItem });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};


// Get all categories without populate
export const getAllCategoryItems = async (req, res) => {
  try {
    const categories = await Category.find(); // no populate

    res.status(200).json({ status: true, data: categories });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// Update category item by ID (generic for all categories/subcategories)

export const updateCategoryItem = async (req, res) => {
  try {
    const { id } = req.params; // numeric id from URL
    const { name, image, description, category, subCategory, subSubCategory, metaTitle, metaDescription,bannerImage } = req.body;

    // Convert id param to number (since schema defines `id` as Number)
    const numericId = Number(id);

    // 🔹 Find the item by custom numeric id field
    let item =
      (await Category.findOne({ id: numericId })) ||
      (await SubCategory.findOne({ id: numericId })) ||
      (await SubSubCategory.findOne({ id: numericId })) ||
      (await SubSubSubCategory.findOne({ id: numericId }));
    //console.log("item",item);
    if (!item) {
      return res.status(404).json({ status: false, message: "Item not found" });
    }

    // 🔹 Update the item
    item.name = name || item.name;
    item.image = image || item.image;
    item.description = description || item.description;
    item.category = category || item.category;
    item.subCategory = subCategory || item.subCategory;
    item.subSubCategory = subSubCategory || item.subSubCategory;
    item.slug = kebabCase(name || item.name);
    item.metaTitle = metaTitle || item.metaTitle;
    item.metaDescription = metaDescription || item.metaDescription;
    item.bannerImage = bannerImage || item.bannerImage;

    await item.save();

    res.status(200).json({ status: true, data: item });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// Delete category item by ID (generic for all categories/subcategories)
export const deleteCategoryItem = async (req, res) => {
  try {
    const { id } = req.params; // client must send type
    let type = req.query.type;
    const numericId = parseInt(id, 10); // ✅ convert string → number

    // Map category types to their respective models
    const modelMap = {
      category: Category,
      subcategory: SubCategory,
      subsubcategory: SubSubCategory,
      subsubsubcategory: SubSubSubCategory,
    };

    const Model = modelMap[type?.toLowerCase()];
    if (!Model) {
      return res.status(400).json({ status: false, message: "Invalid category type" });
    }

    const item = await Model.findOneAndDelete({ id: numericId });

    if (!item) {
      return res.status(404).json({ status: false, message: "Item not found" });
    }

    res.status(200).json({ status: true, message: `${type} deleted successfully` });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};


export const getNestedCategories = async (req, res) => {
  try {
    const statusActive = "Active";

    const results = await Category.aggregate([
      { $match: { status: statusActive } },
      {
        $lookup: {
          from: "subcategories",
          localField: "id",
          foreignField: "category_id",
          pipeline: [
            { $match: { status: statusActive } },
            {
              $lookup: {
                from: "subsubcategories",
                localField: "id", // sub_category.id
                foreignField: "sub_category_id",
                pipeline: [
                  { $match: { status: statusActive } },
                  {
                    $lookup: {
                      from: "subsubsubcategories",
                      localField: "id", // sub_sub_category.id
                      foreignField: "sub_sub_category_id",
                      pipeline: [
                        { $match: { status: statusActive } },
                        {
                          $project: {
                            name: 1, // ✅ added original name
                            sub_sub_sub_category_id: "$id",
                            sub_sub_sub_category_name: "$name",
                            sub_sub_sub_category_image: "$image",
                            sub_sub_sub_category_description: "$description",
                            sub_sub_sub_category_status: "$status",
                            sub_sub_sub_category_slug: "$slug",
                            sub_sub_sub_category_code: "$code",
                            sub_sub_sub_category_created_at: "$created_at",
                            sub_sub_sub_category_updated_at: "$updated_at"
                          }
                        }
                      ],
                      as: "sub_sub_sub_categories"
                    }
                  },
                  {
                    $project: {
                      name: 1, // ✅ added original name
                      sub_sub_category_id: "$id",
                      sub_sub_category_name: "$name",
                      sub_sub_category_image: "$image",
                      sub_sub_category_description: "$description",
                      sub_sub_category_status: "$status",
                      sub_sub_category_slug: "$slug",
                      sub_sub_category_code: "$code",
                      sub_sub_category_created_at: "$created_at",
                      sub_sub_category_updated_at: "$updated_at",
                      sub_sub_sub_categories: 1
                    }
                  }
                ],
                as: "sub_sub_categories"
              }
            },
            {
              $project: {
                name: 1, // ✅ added original name
                sub_category_id: "$id",
                sub_category_name: "$name",
                sub_category_image: "$image",
                sub_category_description: "$description",
                sub_category_status: "$status",
                sub_category_slug: "$slug",
                sub_category_code: "$code",
                sub_category_created_at: "$created_at",
                sub_category_updated_at: "$updated_at",
                sub_sub_categories: 1
              }
            }
          ],
          as: "sub_categories"
        }
      },
      {
        $project: {
          name: 1, // ✅ added original name
          category_id: "$id",
          category_name: "$name",
          category_image: "$image",
          category_description: "$description",
          category_status: "$status",
          category_nav_link: "$nav_link",
          category_slug: "$slug",
          category_code: "$code",
          category_created_at: "$created_at",
          category_updated_at: "$updated_at",
          sub_categories: 1
        }
      }
    ]);

    res.status(200).json({ categories: results });
  } catch (err) {
    console.error("Error retrieving nested categories:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// Function to get all sub-categories
export const getSubCategories = async (req, res) => {
  try {
    const results = await SubCategory.aggregate([
      {
        $lookup: {
          from: "categories",               // collection name in MongoDB
          localField: "category_id",        // field in sub_categories
          foreignField: "id",               // field in categories
          as: "categoryData"
        }
      },
      { $unwind: { path: "$categoryData", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          id: 1,
          name: 1,
          slug: 1,
          image: 1,
          category: 1,
          category_name: "$categoryData.name",
          category_slug: "$categoryData.slug",
          bannerImage: 1,
          metaTitle: 1,
          metaDescription: 1,
          status: 1,
          description:1
        }
      },
      { $sort: { id: -1 } }
    ]);

    res.status(200).json(results);
  } catch (err) {
    console.error("Error retrieving sub_categories:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Function to get all sub-sub-categories
export const getSubSubCategories = async (req, res) => {
  try {
    const results = await SubSubCategory.aggregate([
      {
        $lookup: {
          from: "categories",                  // categories collection
          localField: "category",           // field in sub_sub_categories
          foreignField: "id",                  // numeric id in categories
          as: "categoryData"
        }
      },
      { $unwind: { path: "$categoryData", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "subcategories",              // sub_categories collection
          localField: "subCategory",       // field in sub_sub_categories
          foreignField: "id",                  // numeric id in sub_categories
          as: "subCategoryData"
        }
      },
      { $unwind: { path: "$subCategoryData", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          id: 1,
          name: 1,
          slug: 1,
          category:1,
          subCategory:1,
          category_id: 1,
          sub_category_id: 1,
          category_name: "$categoryData.name",
          category_slug: "$categoryData.slug",
          sub_category_name: "$subCategoryData.name",
          sub_category_slug: "$subCategoryData.slug",
          bannerImage: 1,
          metaTitle: 1,
          metaDescription: 1,
          status: 1,
          description:1,
          image:1,
        }
      },
      { $sort: { id: -1 } }
    ]);

    res.status(200).json(results);
  } catch (err) {
    console.error("Error retrieving sub_sub_categories:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};









