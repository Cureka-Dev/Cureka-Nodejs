import axios from "axios";
import _ from "lodash";
import moment from "moment";
import Order from "../DB/models/order.js";
import OrderDetail from "../DB/models/orderDetail.js";
import Product from "../DB/models/product.js";
import User from "../DB/models/customers.js";
import Address from "../DB/models/address.js";
import { orderCancel, orderInfo } from "../emails/subscriptions.js";
import { sendEmail } from "../middlewares/emailService.js";
import { addUserLogs, timeAgo } from "../utils/common.js";
import { getAccessToken } from "../utils/unicommerceService.js";
import mongoose from "mongoose";
import ShippingCharge from "../DB/models/shippingCharge.js";
import UnicommerceResponse from "../DB/models/unicommerseLogs.js";
// Helper for address by pincode (API unchanged)
const getAddressByPincode = async (pincode) => {
  const res = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`);
  return res.data[0].PostOffice;
};

// --- Order Controller ---
const orderController = {
  // User places an order

  placeOrder: async (req, res) => {
    try {
      const user_id = req.user.id;
      const { orderData, products } = req.body;

      if (!products || products.length === 0)
        return res.status(400).json({ error: "Please select at least one Product" });

      // 🔹 Validate products
      for (let i = 0; i < products.length; i++) {
        const prod = await Product.findOne({ product_id: products[i].product_id });
        if (!prod || prod.back_order_quantity === 0)
          return res.status(400).json({ error: "No Stock Available" });
        if (products[i].quantity > prod.back_order_quantity)
          return res.status(400).json({ error: `Available quantity: ${prod.back_order_quantity}` });
        if (
          products[i].quantity < prod.min_order_quantity ||
          products[i].quantity > prod.max_order_quantity
        )
          return res.status(400).json({
            error: `Select Quantity between ${prod.min_order_quantity} and ${prod.max_order_quantity}`,
          });

        products[i].mrp = prod.mrp;
        products[i].product_name = prod.vendor_article_name;
        products[i].final_price = prod.final_price;
      }

      // 🔹 Generate next order id
      const latestOrder = await Order.findOne().sort({ id: -1 }).select("id");
      const nextId = latestOrder ? latestOrder.id + 1 : 1;
      orderData.id = nextId;
      orderData.products = products;
      //console.log("orderData",orderData);
      // 🔹 Save main order
      const order = new Order({
        ...orderData,
        user_id,
        order_placed_status:
          orderData.is_cod || orderData.is_wallet_option ? "PLACED" : "Pending Payment",
      });
      await order.save();

      // 🔹 Save order details
      const orderDetailsDocs = products.map((p) => ({
        order_id: nextId,
        product_id: p.product_id,
        quantity: p.quantity,
        price: p.final_price,
        total: p.quantity * p.final_price,
      }));
      //console.log("orderDetailsDocs",orderDetailsDocs);
      let aDetails = await OrderDetail.insertMany(orderDetailsDocs);
      //console.log("aDetails",aDetails);
      // 🔹 User logs
      await addUserLogs({
        user_id,
        payload: JSON.stringify(req.body),
        response: JSON.stringify({ order_id: order._id, message: "Order placed successfully." }),
        type: "placeOrder",
      });

      // 🔹 Wallet update
      const user = await User.findOne({ id: Number(user_id) }).select(
        "-wallet_balance -is_admin"
      );
      if (orderData.walletMoneyUsed > 0) {
        user.wallet_balance -= orderData.walletMoneyUsed;
        await user.save();
      }

      // 🔹 Email notification
      if (orderData.is_cod || (orderData.subtotal === 0 && orderData.is_wallet_option)) {
        if (user.email) {
          const mailTemplate = await orderInfo({
            OrderID: order.id, // custom numeric id
            products,
            Subtotal: orderData.subtotal,
            Discount: orderData.discount || 0,
            appliedCoupons: orderData.coupon_code || "",
            paymentMethod: orderData.is_cod ? "COD" : "Online",
            shippingCharge: orderData.shippingCharge,
            Total: Math.round(
              orderData.subtotal +
              orderData.shippingCharge -
              (orderData.discount || 0)
            ),
          });
          await sendEmail({
            to: user.email,
            subject: "Order Information",
            html: mailTemplate,
          });
        }
      }

      res
        .status(201)
        .json({ order_id: order.id, message: "Order placed successfully." });
    } catch (error) {
      console.error("Error placing order:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  // Get all orders for user
  getOrders: async (req, res) => {
    try {
      const userId = req.user.id;
      //console.log("userId--orders",req.user);
      //let orders = await Order.find({ user_id: userId }).sort({ created_at: -1 });
      const orders = await getOrderDetails(userId);
      //console.log("orders",orders);
      // orders = orders.map(order => ({
      //   ...order,
      //   time: moment(order.created_at).fromNow(),
      // }));
      res.status(200).json(orders);
    } catch (error) {
      console.log("error", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  // Get a single order for user
  getOrder: async (req, res) => {
    try {
      const userId = req.user.id;
      const orderId = req.params.orderId;
      const order = await Order.findOne({ _id: orderId, user_id: userId });
      if (!order) return res.status(404).json({ error: "Order not found" });
      res.status(200).json(order);
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  // Cancel Order
  cancelOrder: async (req, res) => {
    try {
      const userId = Number(req.user.id); // ✅ ensure numeric
      const { orderId, cancellationReason } = req.body;

      // ✅ cancel order
      const order = await Order.findOneAndUpdate(
        { id: Number(orderId) },
        { order_placed_status: "Cancelled" },
        { new: true }
      );

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // ✅ get user once
      const user = await User.findOne({ id: userId });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // ✅ refund wallet if used
      if (order.walletMoneyUsed > 0) {
        user.wallet_balance += order.walletMoneyUsed;
        await user.save();
        // Optionally: log wallet transaction
      }

      // ✅ send cancellation email
      const mailTemplate = await orderCancel({
        OrderID: order.id,
        status: "Cancelled",
        cancellationReason,
      });

      await sendEmail({
        to: user.email,
        subject: "Order Cancellation",
        html: mailTemplate,
      });

      res.status(200).json({ message: "Order cancelled successfully." });
    } catch (error) {
      console.error("cancelOrder error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  // ADMIN: Update order details (sample)
  updateAdminOrderDetails: async (req, res) => {
    try {
      const { orderId } = req.params;   // numeric id from route param
      const updateData = req.body;

      const updatedOrder = await Order.findOneAndUpdate(
        { id: Number(orderId) },       // ✅ match numeric "id"
        updateData,
        { new: true }
      );

      if (!updatedOrder) {
        return res.status(404).json({ error: "Order not found." });
      }

      res.status(200).json({
        order_id: Number(orderId),
        message: "Order updated successfully."
      });
    } catch (error) {
      console.error("error", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },


  // Update Order Status (simple)
  updateStatus: async (req, res) => {
    try {
      const orderId = Number(req.params.orderId); // convert to number if needed

      // MongoDB update (similar to SQL UPDATE)
      let response = await Order.updateOne(
        { id: orderId }, // filter by order ID
        { $set: { order_placed_status: req.body.status } } // update status
      );

      // check modifiedCount similar to affectedRows
      if (response.modifiedCount === 1) {
        res.status(200).json({ message: "Order Status Updated succesfully", response });
      } else {
        res.status(404).json({ error: "Order not found" });
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  getAdminOrders: async (req, res) => {
    try {
      //console.log("req.user", req.user);
      const userId = req.user.id;
      const orders = await getAdminOrderDetails(req);
      //console.log("orders", orders);
      for (let i = 0; i < orders.length; i++) {
        orders[i].time = await timeAgo(orders.created_at);
      }
      orders.sort((a, b) => Number(b.order_id) - Number(a.order_id));
      res.status(200).json(orders);
    } catch (error) {
      console.error("Error fetching user products:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
  // ========== Unicommerce Order Info ==========
  getUnicommerseOrderInfo: async (req, res) => {
    try {
      const orderId = req.params.orderId;

      // 🔹 Fetch order from MongoDB
      const order = await Order.findOne({ id: Number(orderId) }).lean();
      //console.log("order",order);
      if (!order) {
        return res.status(404).json({ error: "Order not found in DB" });
      }

      // 🔹 Get Unicommerce Access Token
      const tokenResponse = await getAccessToken();
      //console.log("tokenResponse",tokenResponse);
      // 🔹 Call Unicommerce API
      const response = await axios.post(
        "https://cureka.unicommerce.com/services/rest/v1/oms/saleorder/get",
        { code: orderId },
        {
          headers: { Authorization: "Bearer " + tokenResponse.data.access_token },
        }
      );
      //console.log("response",response);
      if (response.data.successful === true) {
        res.status(200).send(response.data);
      } else {
        res.status(404).json({ error: "Order not found in Unicommerce" });
      }
    } catch (error) {
      console.error("Error fetching Unicommerce order info:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
  adminPlaceOrder: async (req, res) => {
    try {
      let { orderData, products, billingAddress, shippingAddress, mobile_number, isAddressSame } = req.body;
      let user_id;
      let shipping_address_id;
      let billing_address_id;

      // ✅ Check if user exists
      let user = await User.findOne({ mobile_number }).lean();

      if (!user) {
        // ✅ Create new user
        const newUser = new User({
          mobile_number,
          email: shippingAddress.email || null,
        });
        const savedUser = await newUser.save();
        user_id = savedUser._id;
      } else {
        user_id = user.id;
      }
      //console.log("user_id",user_id);
      orderData.user_id = user_id;

      // ✅ Add addresses
      if (isAddressSame) {
        const addressData = {
          user_id,
          name: shippingAddress.name,
          email: shippingAddress.email,
          mobile: shippingAddress.mobile,
          address: shippingAddress.address,
          pincode: shippingAddress.pincode,
          address_type: shippingAddress.address_type,
          landmark: shippingAddress.landmark,
          city: shippingAddress.city,
          state: shippingAddress.state,
        };

        const savedAddress = await addAddress(addressData); // assume this returns _id
        orderData.shipping_address_id = savedAddress;
        orderData.billing_address_id = savedAddress;
      } else {
        // ✅ Shipping address
        const shippingData = {
          user_id,
          name: shippingAddress.name,
          email: shippingAddress.email,
          mobile: shippingAddress.mobile,
          address: shippingAddress.address,
          pincode: shippingAddress.pincode,
          address_type: shippingAddress.address_type,
          landmark: shippingAddress.landmark,
          city: shippingAddress.city,
          state: shippingAddress.state,
        };
        const savedShipping = await addAddress(shippingData);
        orderData.shipping_address_id = savedShipping;

        // ✅ Billing address
        const billingData = {
          user_id,
          name: billingAddress.name,
          email: billingAddress.email,
          mobile: billingAddress.mobile,
          address: billingAddress.address,
          pincode: billingAddress.pincode,
          address_type: billingAddress.address_type,
          landmark: billingAddress.landmark,
          city: billingAddress.city,
          state: billingAddress.state,
        };
        const savedBilling = await addAddress(billingData);
        orderData.billing_address_id = savedBilling;
      }

      // ✅ Place order
      const orderId = await addOrder(orderData, products, user_id, req.body); // keep your existing function
      res.status(201).json({ order_id: orderId, message: "Order placed successfully." });
    } catch (error) {
      console.error("Error placing order:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
  shippingCharges: async (req, res) => {
    try {
      let getRespose = await ShippingCharge.find().lean();
      res.status(200).json({ message: "Data fetched successfully.", data: getRespose });
    } catch (error) {
      console.error("Error fetching shipping charges:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
  getAdminOrdersById: async (req, res) => {
    try {
      //console.log("req.user", req.user);
      const userId = req.user.id;
      let orderId = req.params.orderId;
      const orders = await getAdminOrderDetailsById(orderId);
      //console.log("orders", orders);
      for (let i = 0; i < orders.length; i++) {
        orders[i].time = await timeAgo(orders.created_at);
      }
      //orders.sort((a, b) => Number(b.order_id) - Number(a.order_id));
      res.status(200).json(orders);
    } catch (error) {
      console.error("Error fetching user products:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
  getUniInvoice: async (req, res) => {
    try {
      //console.log("req.user", req.user);
      //const userId = req.user.userId;
      let payload = {
        code: req.params.orderId
      };
      console.log("payload", payload);
      let tokenResponse = await getAccessToken();
      const options = {
        method: "POST",
        // TODO: Cashfree payment url to be stored in .env file
        url: "https://cureka.unicommerce.com/services/rest/v1/oms/saleorder/get",
        headers: {
          Authorization: "Bearer " + tokenResponse.data.access_token,
        },
        data: payload,
      };
      //console.log("options",options);
      const response = await axios.request(options);
      //console.log("response",response);
      if (response.data.successful == true) {
        //res.status(200).json(response.data);
        //if data call inovice API
        let res1 = response.data;
        console.log("res1", res1);
        let invcode = res1?.saleOrderDTO?.shippingPackages[0]?.invoiceCode;
        let facility = res1?.saleOrderDTO?.saleOrderItems[0]?.facilityCode;
        //console.log(facility);
        const options2 = {
          method: "GET",
          // TODO: Cashfree payment url to be stored in .env file
          url: "https://cureka.unicommerce.com/services/rest/v1/oms/invoice/show?invoiceCodes=" + invcode,
          headers: {
            Authorization: "Bearer " + tokenResponse.data.access_token,
            facility: facility
          },
          responseType: 'arraybuffer'
        };
        console.log("options2", options2);
        const invresponse = await axios.request(options2);
        res.set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="invoice.pdf"' // This prompts the user to download the file
        });

        res.send(invresponse.data); // Send the PDF data

      } else {
        res.status(404).json({ error: "Order not found" });
      }
    } catch (error) {
      console.error("Error fetching user products:", error);
      res.status(500).json({ error: "Something Went Wrong. Please Try again" });
    }

  },
};
export const getOrderDetails = async (userId) => {
  try {
    const orders = await Order.aggregate([
      {
        $match: {
          user_id: userId,
          order_placed_status: { $ne: "Pending Payment" }
        }
      },

      // 🔹 Join shipping address
      {
        $lookup: {
          from: "addresses",
          localField: "shipping_address_id",
          foreignField: "id",
          as: "shipping_address"
        }
      },
      { $unwind: { path: "$shipping_address", preserveNullAndEmptyArrays: true } },

      // 🔹 Join billing address
      {
        $lookup: {
          from: "addresses",
          localField: "billing_address_id",
          foreignField: "id",
          as: "billing_address"
        }
      },
      { $unwind: { path: "$billing_address", preserveNullAndEmptyArrays: true } },

      // 🔹 Join customer details
      {
        $lookup: {
          from: "customers",
          localField: "user_id",
          foreignField: "id",
          as: "userDetails"
        }
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },

      // 🔹 Join orderdetails (items)
      {
        $lookup: {
          from: "orderdetails",
          localField: "id",          // order.id
          foreignField: "order_id",  // orderdetails.order_id
          as: "items"
        }
      },
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },

      // 🔹 Join products
      {
        $lookup: {
          from: "products",
          localField: "items.product_id",
          foreignField: "product_id",
          as: "productData"
        }
      },
      { $unwind: { path: "$productData", preserveNullAndEmptyArrays: true } },

      // 🔹 Add computed field: use order.id as product_id if older than 1 month
      {
        $addFields: {
          computed_product_id: {
            $cond: [
              {
                $lt: [
                  { $toDate: "$created_at" },
                  {
                    $dateSubtract: {
                      startDate: "$$NOW",
                      unit: "month",
                      amount: 1
                    }
                  }
                ]
              },
              "$id", // order id for orders older than 1 month
              "$productData.product_id" // normal product id
            ]
          }
        }
      },

      // 🔹 Group back into order
      {
        $group: {
          _id: "$_id",
          order_id: { $first: "$id" },
          user_id: { $first: "$user_id" },
          shipping_address: { $first: "$shipping_address" },
          billing_address: { $first: "$billing_address" },
          subtotal: { $first: "$subtotal" },
          discount: { $first: "$discount" },
          coupon_code: { $first: "$coupon_code" },
          gift_wrapping: { $first: "$gift_wrapping" },
          transaction_id: { $first: "$transaction_id" },
          is_cod: { $first: "$is_cod" },
          order_placed_status: { $first: "$order_placed_status" },
          created_at: { $first: "$created_at" },
          first_name: { $first: "$userDetails.first_name" },
          walletMoneyUsed: { $first: "$walletMoneyUsed" },
          is_wallet_option: { $first: "$is_wallet_option" },
          shippingCharge: { $first: "$shippingCharge" },
          trackInfo: { $first: "$trackInfo" },

          // collect products
          products: {
            $push: {
              product_id: "$computed_product_id", // ✅ conditional product id
              product_name: "$productData.vendor_article_name",
              product_price: "$productData.mrp",
              slug: "$productData.slug",
              url: "$productData.url",
              final_price: "$productData.final_price",
              quantity: "$items.quantity",
              product_images: "$productData.product_images"
            }
          }
        }
      },

      { $sort: { created_at: -1 } }
    ]);

    // 🔹 Parse trackInfo safely
    return orders.map(order => ({
      ...order,
      trackInfo: order.trackInfo ? JSON.parse(order.trackInfo) : {}
    }));
  } catch (err) {
    console.error("Error in getOrderDetails Mongo:", err);
    throw err;
  }
};






export const getAdminOrderDetails = async (req) => {
  try {
    const orders = await Order.aggregate([
      // ✅ Match first
      {
        $match: {
          order_placed_status: { $ne: "Pending Payment" }
        }
      },

      // ✅ Sort and limit BEFORE lookups to avoid timeouts
      { $sort: { created_at: -1 } },
      { $limit: 10 },

      // shipping address
      {
        $lookup: {
          from: "addresses",
          localField: "shipping_address_id",
          foreignField: "id",
          as: "shipping_address"
        }
      },
      { $unwind: { path: "$shipping_address", preserveNullAndEmptyArrays: true } },

      // billing address
      {
        $lookup: {
          from: "addresses",
          localField: "billing_address_id",
          foreignField: "id",
          as: "billing_address"
        }
      },
      { $unwind: { path: "$billing_address", preserveNullAndEmptyArrays: true } },

      // customer details
      {
        $lookup: {
          from: "customers",
          localField: "user_id",
          foreignField: "id",
          as: "userDetails"
        }
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },

      // order details
      {
        $lookup: {
          from: "orderdetails",
          localField: "id",
          foreignField: "order_id",
          as: "items"
        }
      },

      // products
      {
        $lookup: {
          from: "products",
          localField: "items.product_id",
          foreignField: "product_id",
          as: "products"
        }
      },

      // ✅ Shape final document
      {
        $project: {
          _id: 0,
          order_id: "$id",
          user_id: 1,
          shipping_address: 1,
          billing_address: 1,
          subtotal: 1,
          discount: 1,
          coupon_code: 1,
          gift_wrapping: 1,
          transaction_id: 1,
          is_cod: 1,
          order_placed_status: 1,
          created_at: 1,
          first_name: "$userDetails.first_name",
          walletMoneyUsed: 1,
          is_wallet_option: 1,
          shippingCharge: 1,
          trackInfo: 1,
          products: {
            $map: {
              input: "$items",
              as: "item",
              in: {
                product_id: "$$item.product_id",
                quantity: "$$item.quantity",
                details: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$products",
                        as: "p",
                        cond: { $eq: ["$$p.product_id", "$$item.product_id"] }
                      }
                    },
                    0
                  ]
                }
              }
            }
          }
        }
      }
    ]);

    // Parse trackInfo safely
    return orders.map(order => ({
      ...order,
      trackInfo: order.trackInfo ? JSON.parse(order.trackInfo) : {}
    }));

  } catch (err) {
    console.error("Error in getAdminOrderDetails:", err);
    throw err;
  }
};

export const saveUniCommerse = async (orderData, orderId, products, user_id) => {
  try {
    //console.log("user_id",user_id);
    // 🔹 Fetch billing & shipping addresses
    const billingResults = await Address.findOne({ id: orderData.billing_address_id }).lean();
    const shippingResults = await Address.findOne({ id: orderData.shipping_address_id }).lean();

    if (!billingResults || !shippingResults) {
      throw new Error("Billing or Shipping address not found");
    }

    // 🔹 Get address details by pincode
    const billingAdd = await getAddressByPincode(billingResults.pincode);
    const shippingAdd = await getAddressByPincode(shippingResults.pincode);

    const bState = billingAdd?.[0]?.State || "Telangana";
    const bCity = billingAdd?.[0]?.District || "Hyderabad";
    const bCountry = billingAdd?.[0]?.Country || "India";

    const sState = shippingAdd?.[0]?.State || "Telangana";
    const sCity = shippingAdd?.[0]?.District || "Hyderabad";
    const sCountry = shippingAdd?.[0]?.Country || "India";

    // 🔹 Build products array
    const productsArr = [];
    for (let i = 0; i < products.length; i++) {
      const productData = await Product.findOne({ id: products[i].product_id }).lean();

      if (!productData) continue;

      if (products[i].quantity > 1) {
        for (let j = 1; j <= products[i].quantity; j++) {
          productsArr.push({
            code: `${products[i].product_id}-${j}`,
            shippingMethodCode: "STD",
            itemSku: productData.sku_code,
            totalPrice: productData.mrp,
            sellingPrice: productData.final_price,
          });
        }
      } else {
        productsArr.push({
          code: products[i].product_id.toString(),
          shippingMethodCode: "STD",
          itemSku: productData.sku_code,
          totalPrice: productData.mrp,
          sellingPrice: productData.final_price,
        });
      }
    }

    // 🔹 Generate access token
    const tokenResponse = await getAccessToken();

    // 🔹 Build payload
    const payload = {
      saleOrder: {
        code: orderId,
        displayOrderCode: orderId,
        displayOrderDateTime: Date.now(),
        customerName: "TEST_OPENTEG-" + shippingResults.name,
        notificationEmail: shippingResults.email,
        notificationMobile: shippingResults.mobile,
        channel: "CUSTOM",
        cashOnDelivery: orderData.is_cod,
        thirdPartyShipping: true,
        addresses: [
          {
            id: orderData.shipping_address_id,
            name: shippingResults.name,
            addressLine1: shippingResults.address,
            addressLine2: "",
            city: sCity,
            state: sState,
            country: sCountry,
            pincode: shippingResults.pincode,
            phone: shippingResults.mobile,
            email: shippingResults.email,
          },
          {
            id: orderData.billing_address_id,
            name: billingResults.name,
            addressLine1: billingResults.address,
            addressLine2: "",
            city: bCity,
            state: bState,
            country: bCountry,
            pincode: billingResults.pincode,
            phone: billingResults.mobile,
            email: billingResults.email,
          },
        ],
        billingAddress: {
          referenceId: orderData.billing_address_id,
        },
        shippingAddress: {
          referenceId: orderData.shipping_address_id,
        },
        saleOrderItems: productsArr,
        currencyCode: "INR",
        totalDiscount: orderData.discount,
        totalShippingCharges: orderData.shippingCharge,
        totalCashOnDeliveryCharges: "0",
        totalGiftWrapCharges: "0",
        totalStoreCredit: "0",
        totalPrepaidAmount: 0,
        useVerifiedListings: false,
      },
    };

    console.log("payload", JSON.stringify(payload));

    // 🔹 Send request to Unicommerce
    const response = await axios.post(
      "https://cureka.unicommerce.com/services/rest/v1/oms/saleOrder/create",
      payload,
      {
        headers: {
          Authorization: "Bearer " + tokenResponse.data.access_token,
        },
      }
    );

    console.log("response", response.data);

    // 🔹 Fetch the latest document to get the latest numeric id
    const latestDoc = await UnicommerceResponse.findOne().sort({ id: -1 }).lean();

    // 🔹 Determine the next numeric id
    const nextId = latestDoc ? latestDoc.id + 1 : 1;

    // 🔹 Save new document with numeric id
    await UnicommerceResponse.create({
      userId: user_id,
      orderId,
      id: nextId, // numeric incrementing id
      response: JSON.stringify(response.data),
      payload: JSON.stringify(payload),
    });

  } catch (error) {
    console.error("Error in saveUniCommerse:", error);
  }
};

const addAddress = async (data) => {
  try {
    const {
      user_id,
      name,
      email,
      mobile,
      address,
      pincode,
      address_type,
      landmark,
      city,
      state,
    } = data;

    const newAddress = new Address({
      user_id,
      name,
      email,
      mobile,
      address,
      pincode,
      address_type,
      landmark,
      city,
      state,
    });

    const savedAddress = await newAddress.save();
    return savedAddress._id; // return MongoDB ObjectId instead of insertId
  } catch (error) {
    console.error("Error in addAddress:", error);
    throw error;
  }
};
export const addOrder = async (orderData, products, user_id, body) => {
  try {
    // ✅ Normalize product array: convert `id` → `product_id`
    const normalizedProducts = products.map((p) => {
      const { id, ...rest } = p;
      return { ...rest, product_id: id };
    });


    // 🔹 Find the latest id
    const lastOrderId = await Order.findOne().sort({ id: -1 }).select("id");
    const nextId = lastOrderId ? lastOrderId.id + 1 : 1;

    // ✅ Create order in MongoDB with incremented id
    const newOrder = new Order({
      ...orderData,
      id: nextId, // assign auto-incremented id
      user_id,
      products: normalizedProducts,
      type: "order" // normal orders
    });

    const savedOrder = await newOrder.save();
    const orderId = savedOrder.id; // return the numeric id

    // ✅ Add user logs
    const userLogs = {
      user_id,
      payload: JSON.stringify(body),
      response: JSON.stringify({ order_id: orderId, message: "Order placed successfully." }),
      type: "adminPlaceOrder",
    };
    await addUserLogs(userLogs);

    // ✅ Return orderId to maintain original response
    return orderId;

    // Optional: Email logic can stay as comments
  } catch (error) {
    console.error("Error in addOrder:", error);
    throw error;
  }
};
export const getAdminOrderDetailsById = async (orderId) => {
  try {
    const orders = await Order.aggregate([
      {
        $match: {
          id: Number(orderId),
          order_placed_status: { $ne: "Pending Payment" }
        }
      },

      // shipping address
      {
        $lookup: {
          from: "addresses",
          localField: "shipping_address_id",
          foreignField: "id",
          as: "shipping_address"
        }
      },
      { $unwind: { path: "$shipping_address", preserveNullAndEmptyArrays: true } },

      // billing address
      {
        $lookup: {
          from: "addresses",
          localField: "billing_address_id",
          foreignField: "id",
          as: "billing_address"
        }
      },
      { $unwind: { path: "$billing_address", preserveNullAndEmptyArrays: true } },

      // order details
      {
        $lookup: {
          from: "orderdetails",
          localField: "id",
          foreignField: "order_id",
          as: "items"
        }
      },
      { $unwind: "$items" },

      // products
      {
        $lookup: {
          from: "products",
          localField: "items.product_id",
          foreignField: "product_id",
          as: "product"
        }
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },

      // // ✅ add only 1 product image
      // {
      //   $addFields: {
      //     product_images: {
      //       $cond: [
      //         { $gt: [{ $size: { $ifNull: ["$product.product_images", []] } }, 0] },
      //         [
      //           {
      //             id: 1,
      //             image: { $arrayElemAt: ["$product.product_images", 0] },
      //             pid: "$product.product_id"
      //           }
      //         ],
      //         [] // if no images
      //       ]
      //     }
      //   }
      // },

      // shape final
      {
        $project: {
          _id: 0,
          id: "$items.id",
          order_id: "$id",
          product_id: "$items.product_id",
          quantity: "$items.quantity",
          created_at: "$items.created_at",
          updated_at: "$items.updated_at",
          final_price: "$items.final_price",
          product_name: "$product.vendor_article_name",
          product_price: "$product.final_price",
          product_images: "$product.product_images", // ✅ include generated images
          shipping_address_id: 1,
          billing_address_id: 1,
          subtotal: 1,
          discount: 1,
          coupon_code: 1,
          is_cod: 1,
          shippingCharge: 1,
          gift_wrapping: 1,
          walletMoneyUsed: 1,
          is_wallet_option: 1,
          trackInfo: 1,
          order_placed_status: 1,

          // ✅ expand full billing address
          billing_address: {
            id: "$billing_address.id",
            user_id: "$billing_address.user_id",
            name: "$billing_address.name",
            email: "$billing_address.email",
            mobile: "$billing_address.mobile",
            address: "$billing_address.address",
            landmark: "$billing_address.landmark",
            pincode: "$billing_address.pincode",
            address_type: "$billing_address.address_type",
            other_title: "$billing_address.other_title",
            city: "$billing_address.city",
            state: "$billing_address.state",
            status: "$billing_address.status"
          },

          // ✅ expand full shipping address
          shipping_address: {
            id: "$shipping_address.id",
            user_id: "$shipping_address.user_id",
            name: "$shipping_address.name",
            email: "$shipping_address.email",
            mobile: "$shipping_address.mobile",
            address: "$shipping_address.address",
            landmark: "$shipping_address.landmark",
            pincode: "$shipping_address.pincode",
            address_type: "$shipping_address.address_type",
            other_title: "$shipping_address.other_title",
            city: "$shipping_address.city",
            state: "$shipping_address.state",
            status: "$shipping_address.status"
          },

          // ✅ keep time field
    time: {
  $concat: [
    {
      $toString: {
        $dateDiff: {
          startDate: { $toDate: "$created_at" },
          endDate: "$$NOW",
          unit: "second"
        }
      }
    },
    " seconds ago"
  ]
},
        }
      }
    ]);

    if (!orders.length) return null;

    // ✅ parse trackInfo if string
    const response = orders.map(order => ({
      ...order,
      trackInfo: order.trackInfo ? JSON.parse(order.trackInfo) : null
    }));

    return response;
  } catch (err) {
    console.error("Error in getAdminOrderDetailsById:", err);
    throw err;
  }
};









export default orderController;
