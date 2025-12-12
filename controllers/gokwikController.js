import axios from "axios";
import Product from "../DB/models/product.js";
import Order from "../DB/models/order.js";
import OrderDetail from "../DB/models/orderDetail.js";
import User from "../DB/models/customers.js";
import Address from "../DB/models/address.js";



// Validation helper functions
const validatePaymentMethod = (method) => {
  const validMethods = ['cod', 'prepaid', 'pp-cod'];
  return validMethods.includes(method);
};

const validateAddress = (address) => {
  if (!address) return true; // Optional field
  
  const requiredFields = ['pincode', 'city', 'state', 'first_name', 'last_name', 'address', 'email', 'phone'];
  return requiredFields.every(field => address[field]);
};

const validatePaymentDetails = (paymentDetails) => {
  if (!paymentDetails) return false;
  
  const { payment_method, payment_amount, payment_id } = paymentDetails;
  
  if (!payment_method || !validatePaymentMethod(payment_method)) {
    return false;
  }
  
  if (typeof payment_amount !== 'number' || payment_amount <= 0) {
    return false;
  }
  
  if (!payment_id) {
    return false;
  }
  
  return true;
};

// Generate order ID (you can customize this)
const generateOrderId = () => {
  return 'ORD' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
};
// Helper: Save address only if provided
// const saveAddressIfProvided = async (addressData, customer_phone) => {
//   if (!addressData) return null; // address optional

//   // Validate only if provided
//   if (!validateAddress(addressData)) return null;
  
  
//   const doc = new Address({
//     userId: customer_phone,
//     name: `${addressData.first_name || ""} ${addressData.last_name || ""}`.trim(),
//     email: addressData.email || "",
//     mobile: addressData.phone || "",
//     address: addressData.address || "",
//     landmark: addressData.landmark || "",
//     pincode: addressData.pincode || "",
//     city: addressData.city || "",
//     state: addressData.state || "",
//     status: "Active"
//   });
//   console.log(doc,"-=-=-=-=-=-=-=-doc=-=-=-=-=-=-=-");
//   await doc.save();
//   onsole.log(doc,"-=-=-=-=-=-=-=-doc121=-=-=-=-=-=-=-");
//   return doc.id;
// };


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
    console.log(newAddress,"=-=-=-=-=-=-=newAddress=-=-=-=-==-=-==-");
    
    const savedAddress = await newAddress.save();
    return savedAddress.id; // return MongoDB ObjectId instead of insertId
  } catch (error) {
    console.error("Error in addAddress:", error);
    throw error;
  }
};


const gokwikController = {

// FINAL createOrder CONTROLLER
// ===========================================
createOrder: async (req, res) => {
  try {
    const {
      cart_id,
      payment_details,
      shipping_address,
      billing_address,
      customer_phone,
      meta_data
    } = req.body;
    let user_id;

    console.log("Incoming Data:", req.body);

    // Required fields
    if (!cart_id) {
      return res.status(400).json({
        status: "error",
        message: "cart_id is required"
      });
    }

    if (!customer_phone) {
      return res.status(400).json({
        status: "error",
        message: "customer_phone is required"
      });
    }

    // Validate payment details
    if (!validatePaymentDetails(payment_details)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid payment details"
      });
    }

    // Check duplicate order
    const existingOrder = await Order.findOne({ cart_id });
    if (existingOrder) {
      return res.status(409).json({
        status: "error",
        message: "Order with this cart_id already exists",
        order_id: existingOrder.id
      });
    }
     let user = await User.findOne({ mobile_number : customer_phone}).lean();
     console.log(user,"-=-=-=-=-user=-=-=-=-");
     if (!user) {
        try {
          const newUser = new User({
            mobile_number:customer_phone,
            email: shipping_address?.email || null,
          });
          const savedUser = await newUser.save();
          user_id = savedUser.id;
          console.log("Saved User",savedUser);
          
        } catch (err) {
          // ⚠️ Handle duplicate email edge case safely
          if (err.code === 11000 && err.keyPattern?.email) {
            const existingUser = await User.findOne({
              email: shipping_address?.email,
            }).lean();
            user_id = existingUser?.id;
            console.log("existingUser User",existingUser);
          } else {
            throw err;
          }
        }
      } else {
        user_id = user.id;
      }
      // const isAddressSameFn = (shipping, billing) => {
      //     if (!shipping || !billing) return false;

      //     return (
      //       shipping.first_name === billing.first_name &&
      //       shipping.last_name === billing.last_name &&
      //       shipping.email === billing.email &&
      //       shipping.phone === billing.phone &&
      //       shipping.address === billing.address &&
      //       shipping.landmark === billing.landmark &&
      //       shipping.pincode === billing.pincode &&
      //       shipping.city === billing.city &&
      //       shipping.state === billing.state
      //     );
      //   };

      // var shipping_address_id;
      // var billing_address_id;
      // const isAddressSame = isAddressSameFn(shipping_address, billing_address);
      //   const billing = billing_address || shipping_address;

      // // ✅ Add addresses
      // if (isAddressSame) {
      //   const addressData = {
      //     user_id,
      //     name: shipping_address.first_name + " " + shipping_address.last_name,
      //     email: shipping_address.email,
      //     mobile: shipping_address.phone,
      //     address: shipping_address.address,
      //     pincode: shipping_address.pincode,
      //     address_type: "shipping",
      //     landmark: shipping_address.landmark,
      //     city: shipping_address.city,
      //     state: shipping_address.state,
      //   };
      //   console.log("Address-=--=-If",addressData);
        
      //   const savedAddress = await addAddress(addressData); // assume this returns _id
      //   shipping_address_id = savedAddress;
      //   billing_address_id = savedAddress;
      // } else {
      //   // ✅ Shipping address
      //   const shippingData = {
      //     user_id,
      //     name: shipping_address.first_name + " " + shipping_address.last_name,
      //     email: shipping_address.email,
      //     mobile: shipping_address.phone,
      //     address: shipping_address.address,
      //     pincode: shipping_address.pincode,
      //     address_type: "shipping",
      //     landmark: shipping_address.landmark,
      //     city: shipping_address.city,
      //     state: shipping_address.state,
      //   };
      //   console.log("Address-=--=-Else",shippingData);
      //   const savedShipping = await addAddress(shippingData);
      //   shipping_address_id = savedShipping;
      //   console.log(billing_address,"billing_address");
        
      //   // ✅ Billing address
      //   const billingData = {
      //     user_id,
      //     name: billing_address.first_name + " " + billing_address.last_name,
      //     email: billing_address.email,
      //     mobile: billing_address.mobile,
      //     address: billing_address.address,
      //     pincode: billing_address.pincode,
      //     address_type: "billing",
      //     landmark: billing_address.landmark,
      //     city: billing_address.city,
      //     state: billing_address.state,
      //   };
      //   const savedBilling = await addAddress(billingData);
      //   billing_address_id = savedBilling;
      // }
      const isAddressSameFn = (shipping, billing) => {
        if (!shipping || !billing) return false; // cannot be same if any one missing

        const fields = ["first_name", "last_name", "email", "phone", "address", "landmark", "pincode", "city", "state"];

        return fields.every(f => shipping[f] === billing[f]);
      };


      // Build safe fallback objects
        const shipping = shipping_address || null;
        const billing  = billing_address  || null;

        const isAddressSame = isAddressSameFn(shipping, billing);

        let shipping_address_id = null;
        let billing_address_id  = null;

        // CASE 1: NO ADDRESS AT ALL (rare but safe)
        if (!shipping && !billing) {
          throw new Error("No address provided");
        }

        // CASE 2: BOTH SAME
        if (shipping && billing && isAddressSame) {
          const addressData = {
            user_id,
            name: shipping.first_name + " " + shipping.last_name,
            email: shipping.email,
            mobile: shipping.phone,
            address: shipping.address,
            pincode: shipping.pincode,
            address_type: "shipping",
            landmark: shipping.landmark,
            city: shipping.city,
            state: shipping.state,
          };

          const saved = await addAddress(addressData);
          shipping_address_id = saved;
          billing_address_id = saved;
        }

        // CASE 3: BOTH AVAILABLE BUT DIFFERENT
        else if (shipping && billing) {
          // save shipping
          const savedShipping = await addAddress({
            user_id,
            name: shipping.first_name + " " + shipping.last_name,
            email: shipping.email,
            mobile: shipping.phone,
            address: shipping.address,
            pincode: shipping.pincode,
            address_type: "shipping",
            landmark: shipping.landmark,
            city: shipping.city,
            state: shipping.state,
          });
          shipping_address_id = savedShipping;

          // save billing
          const savedBilling = await addAddress({
            user_id,
            name: billing.first_name + " " + billing.last_name,
            email: billing.email,
            mobile: billing.phone || billing.mobile,
            address: billing.address,
            pincode: billing.pincode,
            address_type: "billing",
            landmark: billing.landmark,
            city: billing.city,
            state: billing.state,
          });
          billing_address_id = savedBilling;
        }

        // CASE 4: ONLY SHIPPING RECEIVED
        else if (shipping) {
          const savedShipping = await addAddress({
            user_id,
            name: shipping.first_name + " " + shipping.last_name,
            email: shipping.email,
            mobile: shipping.phone,
            address: shipping.address,
            pincode: shipping.pincode,
            address_type: "shipping",
            landmark: shipping.landmark,
            city: shipping.city,
            state: shipping.state,
          });

          shipping_address_id = savedShipping;
          billing_address_id = savedShipping; // optional → use same
        }

        // CASE 5: ONLY BILLING RECEIVED
        else if (billing) {
          const savedBilling = await addAddress({
            user_id,
            name: billing.first_name + " " + billing.last_name,
            email: billing.email,
            mobile: billing.phone || billing.mobile,
            address: billing.address,
            pincode: billing.pincode,
            address_type: "billing",
            landmark: billing.landmark,
            city: billing.city,
            state: billing.state,
          });

          shipping_address_id = savedBilling;
          billing_address_id = savedBilling;
        }

      console.log("User Id ",user_id);
      console.log("User shipping_address_id ",shipping_address_id);
      console.log("User billing_address_id ",billing_address_id);
      console.log("User cart_id ",cart_id);
      console.log("User payment_details ",payment_details);
      console.log("User meta_data ",meta_data);
      const lastOrderId = await Order.findOne().sort({ id: -1 }).select("id");
     const nextId = lastOrderId ? lastOrderId.id + 1 : 1;

    // Create new order
    const order = new Order({
      id:nextId,
      user_id: user_id,
      shipping_address_id: shipping_address_id || null,
      billing_address_id: billing_address_id || null,
      cart_id,
      payment_details,
      meta_data,
      order_placed_status: "Pending Payment",
      created_at: new Date()
    });
    console.log(order,"=-=-=-=Order Data-=-=-=");
    
    // Save order
    await order.save();

    console.log("Order created successfully:", order.id);

    res.status(201).json({
      status: "success",
      order_id: order.id
    });

  } catch (error) {
    console.error("Error creating order:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        status: "error",
        message: "Duplicate entry"
      });
    }

    res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
  
}



}

export default gokwikController;
