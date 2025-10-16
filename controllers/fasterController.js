import axios from "axios";
import _ from "lodash";
import crypto from "crypto";
import { saveUniCommerse } from "../controllers/orderController.js";
import { addAddress } from "../utils/addressHelpers.js";
import Address from "../DB/models/address.js";
import Product from "../DB/models/product.js";
import Category from "../DB/models/category.js";
import Order from "../DB/models/order.js";
import OrderDetail from "../DB/models/orderDetail.js";
import CustomerAccount from "../DB/models/customers.js";
import Cart from "../DB/models/cart.js";

const { isEmpty } = _;

// -------------------- PRODUCT LIST --------------------
export const productList = async (req, res) => {
  try {
    const productsCount = await Product.countDocuments({ status: "Active" });

    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * pageSize;

    let products = await Product.find({ status: "Active" })
      .select(
        "product_id vendor_article_name brand_size style_group_id detail_angle final_price back_order_quantity status tags description product_type createdAt updatedAt"
      )
      .skip(skip)
      .limit(pageSize)
      .lean();

    // unique by style_group_id
    const unique = [
      ...products
        .reduce((uniq, curr) => {
          if (!uniq.has(curr.style_group_id)) {
            uniq.set(curr.style_group_id, curr);
          }
          return uniq;
        }, new Map())
        .values(),
    ];

    for (let i = 0; i < unique.length; i++) {
      let pId = unique[i].product_id;
      let pImage = await getImageForProduct(pId);

      unique[i].image = { src: pImage };
      unique[i].vendor = "";
      unique[i].handle = "";

      let variantsData = await Product.find({
        style_group_id: unique[i].style_group_id,
        status: "Active",
      })
        .select(
          "product_id vendor_article_name style_group_id final_price description createdAt updatedAt sku_code weight_kg brand_size"
        )
        .lean();

      for (let j = 0; j < variantsData.length; j++) {
        let vImage = await getImageForProduct(variantsData[j].product_id);

        variantsData[j].image = { src: vImage || "" };
        variantsData[j].taxable = true;
        variantsData[j].weight_unit = "KG";
        variantsData[j].grams = (variantsData[j].weight_kg || 0) * 1000;

        delete variantsData[j].brand_size;
        delete variantsData[j].style_group_id;
        delete variantsData[j].inventoryQuantity;
      }

      delete unique[i].brand_size;
      delete unique[i].style_group_id;
      delete unique[i].price;
      delete unique[i].inventoryQuantity;

      unique[i].variants = variantsData;
    }

    let data = {
      total: productsCount,
      products: unique,
    };

    return res.status(200).json({ data });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: true, message: error.message, data: {} });
  }
};

// -------------------- CATEGORIES LIST --------------------
export const categoriesList = async (req, res) => {
  try {
    const totalCategories = await Category.countDocuments({ status: "Active" });

    const page = parseInt(req.query.page) || 0;
    const pageSize = parseInt(req.query.limit) || 100;
    const skip = page * pageSize;

    let categories = await Category.find({ status: "Active" })
      .select("id name description image createdAt updatedAt")
      .skip(skip)
      .limit(pageSize)
      .lean();

    if (categories.length > 0) {
      for (let i = 0; i < categories.length; i++) {
        categories[i].handle = "";
        categories[i].image = { src: categories[i].image };
      }

      let data = {
        total: totalCategories,
        collections: categories,
      };

      return res.status(200).json({ data });
    } else {
      return res
        .status(200)
        .json({ message: "No data Found.", data: {} });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: true, message: error.message, data: {} });
  }
};

// -------------------- PRODUCTS BY CATEGORY --------------------
export const productListByCategory = async (req, res) => {
  try {
    if (!req.query.collection_id) {
      return res
        .status(400)
        .json({ error: true, message: "Please provide collection_id" });
    }

    const productsCount = await Product.countDocuments({
      status: "Active",
      category_id: req.query.collection_id,
    });

    const page = parseInt(req.query.page) || 0;
    const pageSize = parseInt(req.query.limit) || 100;
    const skip = page * pageSize;

    let products = await Product.find({
      status: "Active",
      category_id: req.query.collection_id,
    })
      .select(
        "product_id vendor_article_name brand_size style_group_id detail_angle final_price back_order_quantity status tags description product_type createdAt updatedAt"
      )
      .skip(skip)
      .limit(pageSize)
      .lean();

    const unique = [
      ...products
        .reduce((uniq, curr) => {
          if (!uniq.has(curr.style_group_id)) {
            uniq.set(curr.style_group_id, curr);
          }
          return uniq;
        }, new Map())
        .values(),
    ];

    if (unique.length > 0) {
      for (let i = 0; i < unique.length; i++) {
        let pId = unique[i].product_id;
        let pImage = await getImageForProduct(pId);

        unique[i].image = { src: pImage };
        unique[i].vendor = "";
        unique[i].handle = "";

        let variantsData = await Product.find({
          style_group_id: unique[i].style_group_id,
          status: "Active",
        })
          .select(
            "product_id vendor_article_name style_group_id final_price description createdAt updatedAt sku_code weight_kg brand_size"
          )
          .lean();

        for (let j = 0; j < variantsData.length; j++) {
          let vImage = await getImageForProduct(variantsData[j].product_id);

          variantsData[j].image = { src: vImage || "" };
          variantsData[j].taxable = true;
          variantsData[j].weight_unit = "KG";
          variantsData[j].grams = (variantsData[j].weight_kg || 0) * 1000;

          delete variantsData[j].brand_size;
          delete variantsData[j].style_group_id;
          delete variantsData[j].inventoryQuantity;
        }

        delete unique[i].brand_size;
        delete unique[i].style_group_id;
        delete unique[i].price;
        delete unique[i].inventoryQuantity;

        unique[i].variants = variantsData;
      }

      let data = {
        total: productsCount,
        products: unique,
      };

      return res.status(200).json({ data });
    } else {
      return res
        .status(200)
        .json({ error: false, message: "No data Found.", data: {} });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: true, message: error.message, data: {} });
  }
};

// -------------------- FASTER CHECKOUT --------------------
export const fasterCheckout = async (req, res) => {
  try {
    const date = new Date();
    let oId = req.body.order_id;

    // check duplicate
    const existingOrder = await Order.findOne({ shiprocket_id: oId }).select("id");
    if (existingOrder) {
      return res.status(200).json({
        success: "duplicate",
        message: "Order already exists. This operation can only be performed once.",
        orderId: existingOrder.id,
      });
    }

    const payload = { order_id: oId, timestamp: date.toISOString() };
    const message = JSON.stringify(payload);

    const hmac = crypto.createHmac("sha256", process.env.HMAC_KEY);
    hmac.update(message);
    const hash = hmac.digest("Base64");

    const options = {
      method: "POST",
      url: "https://checkout-api.shiprocket.com/api/v1/custom-platform-order/details",
      headers: {
        "X-Api-Key": process.env.XKEY,
        "X-Api-HMAC-SHA256": hash,
        "Content-Type": "application/json",
      },
      data: payload,
    };

    const response = await axios.request(options);
    const orderDataResp = response.data.result;
    const phone = orderDataResp.phone;
//console.log("phone",phone);
    let user = await CustomerAccount.findOne({ mobile_number: phone });
    let uId;

    if (user) {
      uId = user.id;
    } else {
      const customerName = `${orderDataResp.shipping_address.first_name} ${orderDataResp.shipping_address.last_name}`;
      user = await CustomerAccount.create({
        first_name: customerName,
        email: orderDataResp.shipping_address.email,
        mobile_number: phone,
      });
      uId = user.id;
    }
    // 🔹 Get latest id from Address collection
    const latestAddress = await Address.findOne().sort({ id: -1 }).lean();
    const newId = latestAddress ? latestAddress.id + 1 : 1;
    const { first_name, last_name, email, phone: mobile, line1, pincode, landmark, city, state } = orderDataResp.shipping_address;
    const addressData = {
      id:newId,
      user_id: uId,
      name: `${first_name} ${last_name}`,
      email,
      mobile,
      address: line1,
      pincode,
      address_type: "Home",
      landmark,
      city,
      state,
    };
    const sdata = await addAddress(addressData);

    const couponCodes = orderDataResp.coupon_codes.join(", ");
    const isCod = orderDataResp.payment_type === "CASH_ON_DELIVERY";
    const latestOrder = await Order.findOne().sort({ id: -1 }).select("id");
      const nextId = latestOrder ? latestOrder.id + 1 : 1;
    const orderData = {
      id:nextId,
      user_id: uId,
      shipping_address_id: sdata,
      billing_address_id: sdata,
      subtotal: orderDataResp.total_amount_payable,
      discount: orderDataResp.total_discount,
      coupon_code: couponCodes,
      gift_wrapping: false,
      transaction_id: "1234567890",
      is_cod: isCod,
      order_placed_status: "PLACED",
      shippingCharge: orderDataResp.cod_charges,
      shiprocket_id: oId,
    };

    const newOrder = await Order.create(orderData);

    const pro = orderDataResp.cart_data.items;
    for (let i = 0; i < pro.length; i++) {
      const product = await Product.findOne({ product_id: pro[i].variant_id }).lean();
//console.log("pro[i]",product);
      await OrderDetail.create({
        order_id: newOrder.id,
        product_id: product.product_id,
        quantity: pro[i].quantity,
        price: product.final_price,
      });

      pro[i].sku_code = product.sku_code;
      pro[i].product_id = product.product_id;
    }

    const products = pro.map(({ variant_id, ...rest }) => ({
      product_id: variant_id,
      ...rest,
    }));
//console.log("uId",uId);
    await saveUniCommerse(orderData, newOrder.id, products, uId);

    await Cart.deleteMany({ user_id: uId });

    return res.status(200).json({
      success: true,
      orderId: newOrder.id,
      data: orderDataResp,
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

// -------------------- HELPER: GET IMAGE --------------------
const getImageForProduct = async (productId) => {
  const product = await Product.findOne({ product_id: productId })
    .select("images")
    .lean();

  if (product && product.product_images && product.product_images.length > 0) {
    return product.product_images[0].image; // adjust field based on schema
  }
  return "";
};
