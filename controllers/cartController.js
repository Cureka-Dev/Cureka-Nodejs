import Cart from "../DB/models/cart.js";
import Product from "../DB/models/product.js";
import CustomerAccount from "../DB/models/customers.js";
import Wishlist from "../DB/models/wishlistModel.js";
import { addUserLogs } from '../utils/common.js';
import { getFiveMinutesBefore } from "../utils/dateUtils.js"; // Adjust if needed

export const getCart = async (req, res) => {
  try {
    const userId = req.query.userId;
    const tempData = req.header("Tempdata");
   // console.log("tempData", tempData);
    // ✅ Correct match condition
    let matchQuery = {};

    if (userId) {
      matchQuery = {
        $or: [
          { user_id: Number(userId) },
          { tempData }
        ]
      };
    } else if (tempData) {
      matchQuery = { tempData };
    } else {
      return res.status(400).json({
        status: false,
        message: "Either userId or tempdata is required",
      });
    }
    //console.log("matchQuery", matchQuery);
    // 🔹 Fetch cart items
    const cartItems = await Cart.find(matchQuery).lean();

    if (!cartItems.length) {
      return res.status(200).json({
        status: true,
        message: "Cart products fetched successfully",
        data: [],
        likeproducts: [],
        lastproducts: [],
      });
    }

    // 🔹 Collect product IDs
    const productIds = cartItems
      .map((item) => Number(item.product_id))
      .filter((id) => !isNaN(id));

    // 🔹 Fetch product details
    const products = await Product.find(
      { product_id: { $in: productIds } },
      {
        product_id: 1,
        vendor_article_name: 1,
        mrp: 1,
        discount_amount: 1,
        discount_percent: 1,
        final_price: 1,
        product_images: 1,
        category_id: 1,
        url: 1,
        weight_kg: 1,
        packer_name_and_address_with_pincode: 1,
      }
    ).lean();

    // ✅ Map products by product_id
    const productMap = {};
    products.forEach((p) => {
      productMap[p.product_id] = {
        product_name: p.vendor_article_name,
        pid: p.product_id,
        mrp: p.mrp,
        discount_amount: p.discount_amount || 0,
        discount_percent: p.discount_percent || 0,
        final_price: p.final_price,
        product_images: p.product_images || [],
        url: p.url || "",
        weight_kg: p.weight_kg || "",
        packer_name_and_address_with_pincode:
          p.packer_name_and_address_with_pincode || "",
      };
    });

    // 🔹 Build cart response
    const data = cartItems.map((item) => {
      const prod = productMap[item.product_id] || {};
      return {
        id: item.id,
        user_id: item.user_id,
        product_id: item.product_id,
        size: item.size || 0,
        qty: item.qty,
        created_at: item.created_at,
        updated_at: item.updated_at,
        tempData: item.tempData,
        product_name: prod.product_name || "",
        pid: prod.pid || null,
        mrp: prod.mrp || 0,
        discount_amount: prod.discount_amount || 0,
        discount_percent: prod.discount_percent || 0,
        final_price: prod.final_price || 0,
        product_images: prod.product_images || [],
        url: prod.url || "",
        weight_kg: prod.weight_kg || "",
        packer_name_and_address_with_pincode:
          prod.packer_name_and_address_with_pincode || "",
      };
    });

    // 🔹 Collect category IDs
    const cids = [...new Set(products.map((p) => p.category_id))];

    // Common pipeline stages for like & last products
    const commonLookups = [
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "id",
          as: "brandInfo",
        },
      },
      { $unwind: { path: "$brandInfo", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "categories",
          localField: "category_id",
          foreignField: "id",
          as: "categoryInfo",
        },
      },
      { $unwind: { path: "$categoryInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          product_name: "$vendor_article_name",
          url: 1,
          slug: 1,
          category_id: 1,
          category_name: "$categoryInfo.name",
          sub_category_id: 1,
          sub_sub_category_id: 1,
          sub_sub_sub_category_id: 1,
          brand: 1,
          product_images: 1,
          pid: "$product_id",
          id: 1,
          mrp: 1,
          discount_amount: 1,
          discount_percent: 1,
          final_price: 1,
          brand_name: "$brandInfo.name",
          weight_kg: 1,
          packer_name_and_address_with_pincode: 1,
        },
      },
    ];

    // get like products
    const likeprod = await Product.aggregate([
      { $match: { checkout: "YML", category_id: { $in: cids } } },
      ...commonLookups,
    ]);

    // get last products
    const lastprod = await Product.aggregate([
      { $match: { checkout: "LMB", category_id: { $in: cids } } },
      ...commonLookups,
    ]);

    res.status(200).json({
      status: true,
      message: "Cart products fetched successfully",
      data,
      likeproducts: likeprod,
      lastproducts: lastprod,
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};




export const addToCart = async (req, res) => {
  try {
    //console.log("141753",req.user);
    const userId = req.body.userId;
    //console.log("userId",userId);
    const tempData = req.header("Tempdata");
    const { product_id, quantity } = req.body;

    if (!product_id || !quantity) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // ✅ Find product by numeric id
    const product = await Product.findOne({ product_id });
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    if (quantity > product.back_order_quantity) {
      return res.status(400).json({
        error: `Available quantity: ${product.back_order_quantity}`,
      });
    }

    if (
      quantity < product.min_order_quantity ||
      quantity > product.max_order_quantity
    ) {
      return res.status(400).json({
        error: `Select between ${product.min_order_quantity} and ${product.max_order_quantity}`,
      });
    }

    // ✅ Check if product already exists in cart
    const filter = {
      product_id,
      ...(userId ? { user_id: userId } : { tempData }),
    };

    const existing = await Cart.findOne(filter);

    if (existing) {
      existing.qty = quantity;
      await existing.save();

      await addUserLogs({
        user_id: userId,
        payload: JSON.stringify(req.body),
        response: JSON.stringify({ product_id, quantity }),
        type: "updateCart",
      });

      // ✅ Exclude _id from response
      const { _id, ...rest } = existing.toObject();
      return res.status(200).json(rest);
    }

    // ✅ Generate sequential id (latest + 1)
    const latest = await Cart.findOne().sort({ id: -1 }).select("id");
    const newId = latest ? latest.id + 1 : 1;

    const newCart = new Cart({
      id: newId,
      user_id: userId,
      tempData,
      product_id,
      qty: quantity,
    });

    await newCart.save();

    await addUserLogs({
      user_id: userId,
      payload: JSON.stringify(req.body),
      response: JSON.stringify(newCart),
      type: "addCart",
    });

    // ✅ Exclude _id from response
    const { _id, ...rest } = newCart.toObject();
    res.status(200).json(rest);

  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};




export const updateCart = async (req, res) => {
  try {
    const userId = req.body.userId;
    const tempData = req.header("Tempdata");
    let { product_id, quantity } = req.body;

    // ✅ Ensure numeric values
    product_id = Number(product_id);
    quantity = Number(quantity);

    if (!product_id || !quantity) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // ✅ Find product by numeric id
    const product = await Product.findOne({ product_id }).lean();
    if (!product) return res.status(404).json({ error: "Product not found." });

    if (quantity > product.back_order_quantity) {
      return res.status(400).json({ error: `Available quantity: ${product.back_order_quantity}` });
    }

    if (quantity < product.min_order_quantity || quantity > product.max_order_quantity) {
      return res.status(400).json({ error: `Select between ${product.min_order_quantity} and ${product.max_order_quantity}` });
    }

    // ✅ Filter for cart
    const filter = userId
      ? { user_id: userId, product_id }
      : { tempData, product_id };

    // ✅ Check if item exists in cart
    let cartItem = await Cart.findOne(filter);

    if (cartItem) {
      // 🔹 If exists, add the quantity
      cartItem.qty += quantity;

      // ✅ Ensure total does not exceed back_order_quantity
      if (cartItem.qty > product.back_order_quantity) {
        return res.status(400).json({ error: `Available quantity: ${product.back_order_quantity}` });
      }

      await cartItem.save();
    } else {
      // 🔹 If not found, create a new cart item
      const latest = await Cart.findOne().sort({ id: -1 }).select("id");
      const newId = latest ? latest.id + 1 : 1;

      cartItem = new Cart({
        id: newId,
        user_id: userId,
        tempData,
        product_id,
        qty: quantity,
      });

      await cartItem.save();
    }

    await addUserLogs({
      user_id: userId,
      payload: JSON.stringify(req.body),
      response: JSON.stringify(cartItem),
      type: "updateCart",
    });

    res.status(200).json(cartItem);

  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};




export const removeFromCart = async (req, res) => {
  try {
    const cartId = Number(req.params.id); // Cart ID from route params
    const userId = req.user ? Number(req.user.id) : null;

    if (!cartId) {
      return res.status(400).json({ error: "Cart ID is required." });
    }

    // Delete directly by cart ID
    const deleted = await Cart.findOneAndDelete({ id: cartId });

    if (!deleted) {
      return res.status(404).json({ error: "Cart ID not found." });
    }

    // Log action
    await addUserLogs({
      user_id: userId,
      payload: JSON.stringify({ cartId }),
      response: JSON.stringify(deleted),
      type: "removeCart",
    });

    res.status(200).json({ message: "Successfully Removed From Cart." });
  } catch (error) {
    console.error("Error deleting cart:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getAbondedCartList = async (req, res) => {
  try {
    const currentDate = getFiveMinutesBefore();

    const abandonedCarts = await Cart.find({
      created_at: { $lt: currentDate }
    })
      .limit(100)
      .populate({
        path: "product_id",
        model: Product,
        select: "product_id vendor_article_name images",
      })
      .populate({
        path: "user_id",
        model: CustomerAccount,
        select: "first_name last_name mobile_number",
      })
      .lean();

    // Add first product image to each cart item
    for (const cart of abandonedCarts) {
      const images = cart?.product_id?.images || [];
      cart.product_images = images.length > 0 ? [images[0]] : [];
    }

    res.status(200).json({
      status: true,
      message: "abondedCartList fetched successfully",
      data: abandonedCarts,
    });
  } catch (error) {
    console.error("Error fetching abondedCartList:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
export const moveCart = async (req, res) => {
  try {
    const userId = req.user.id; // from JWT
    //console.log("userId",userId);
    const { cartId, product_id } = req.body;

    if (!cartId || !product_id) {
      return res.status(400).json({ error: "User and Cart ID are required." });
    }
    //console.log("product_id",product_id,cartId);
    // ✅ Remove from cart
    const removedCartItem = await Cart.findOneAndDelete({
      id: cartId,
      product_id,
    });

    // if (!removedCartItem) {
    //   return res.status(404).json({ error: "Product not found in cart." });
    // }

    // ✅ Check if already in wishlist
    const existingWishlistItem = await Wishlist.findOne({
      //user_id: userId,
      product_id,
    });

    if (existingWishlistItem) {
      return res.status(200).json({
        message: "Product already exists in wishlist.",
        product_id,
      });
    }

    // ✅ Insert into wishlist
    await Wishlist.create({
      user_id: userId,
      product_id,
    });

    // ✅ Add user logs
    let userLogs = {
      user_id: userId,
      payload: JSON.stringify(req.body),
      response: JSON.stringify({ product_id }),
      type: "move to wishlist",
    };
    await addUserLogs(userLogs);

    return res.status(201).json({
      message: "Product moved to wishlist successfully.",
      product_id,   // 👈 only returning product_id
    });
  } catch (err) {
    console.error("Error in moveCart:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};





