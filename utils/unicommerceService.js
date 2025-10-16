import axios from "axios";
import Address from "../DB/models/address.js";
import Product from "../DB/models/product.js";
import User from "../DB/models/user.js";
import Order from "../DB/models/order.js";

// Replace with actual credentials and .env management
const UNICOMMERCE_BASE_URL = "https://cureka.unicommerce.com/services/rest/v1/oms";
const UNICOMMERCE_AUTH_URL = "https://cureka.unicommerce.com/oauth/token";

export const getAccessToken = async () => {
 const tokenOptions = {
    method: "GET",
    // TODO: Cashfree payment url to be stored in .env file
    url: `https://cureka.unicommerce.com/oauth/token?grant_type=password&client_id=my-trusted-client&username=developer2@wedjat.tech&password=Bala.Developer@02`,
  };

  const tokenResponse = await axios.request(tokenOptions);
  //console.log("tokenResponse",tokenResponse);
  return tokenResponse;
  //return data.access_token;
};

export const getAddressByPincode = async (pincode) => {
  const { data } = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`);
  return data[0].PostOffice;
};

export const saveUniCommerse = async (orderData, orderId, products, user_id) => {
  const billingAddr = await Address.findById(orderData.billing_address_id);
  const shippingAddr = await Address.findById(orderData.shipping_address_id);

  // For city/state/country, use getAddressByPincode or fill default
  const [billingPinInfo = {}, shippingPinInfo = {}] = await Promise.all([
    getAddressByPincode(billingAddr.pincode),
    getAddressByPincode(shippingAddr.pincode)
  ]);
  const getPinDetails = (info, fallbackCity, fallbackState, fallbackCountry) =>
    info && info.length
      ? {
          city: info[0].District,
          state: info[0].State,
          country: info[0].Country,
        }
      : {
          city: fallbackCity,
          state: fallbackState,
          country: fallbackCountry,
        };

  const billingDetails = getPinDetails(billingPinInfo, "Hyderabad", "Telangana", "India");
  const shippingDetails = getPinDetails(shippingPinInfo, "Hyderabad", "Telangana", "India");

  // Build products array
  let productsArr = [];
  for (const prod of products) {
    const dbProd = await Product.findById(prod.product_id);
    for (let j = 1; j <= prod.quantity; j++) {
      productsArr.push({
        code: `${prod.product_id}-${j}`,
        shippingMethodCode: "STD",
        itemSku: dbProd.sku_code,
        totalPrice: dbProd.mrp,
        sellingPrice: dbProd.final_price
      });
    }
  }

  const token = await getAccessToken();

  const payload = {
    saleOrder: {
      code: orderId.toString(),
      displayOrderCode: orderId.toString(),
      displayOrderDateTime: Date.now(),
      customerName: "TEST_OPENTEQ-" + shippingAddr.name,
      notificationEmail: shippingAddr.email,
      notificationMobile: shippingAddr.mobile,
      channel: "CUSTOM",
      cashOnDelivery: orderData.is_cod,
      thirdPartyShipping: true,
      addresses: [
        {
          id: shippingAddr._id,
          name: shippingAddr.name,
          addressLine1: shippingAddr.address,
          addressLine2: "",
          city: shippingDetails.city,
          state: shippingDetails.state,
          country: shippingDetails.country,
          pincode: shippingAddr.pincode,
          phone: shippingAddr.mobile,
          email: shippingAddr.email,
        },
        {
          id: billingAddr._id,
          name: billingAddr.name,
          addressLine1: billingAddr.address,
          addressLine2: "",
          city: billingDetails.city,
          state: billingDetails.state,
          country: billingDetails.country,
          pincode: billingAddr.pincode,
          phone: billingAddr.mobile,
          email: billingAddr.email,
        },
      ],
      billingAddress: { referenceId: billingAddr._id },
      shippingAddress: { referenceId: shippingAddr._id },
      saleOrderItems: productsArr,
      currencyCode: "INR",
      totalDiscount: orderData.discount || 0,
      totalShippingCharges: orderData.shippingCharge || 0,
      totalCashOnDeliveryCharges: "0",
      totalGiftWrapCharges: "0",
      totalStoreCredit: "0",
      totalPrepaidAmount: 0,
      useVerifiedListings: false,
    }
  };

  // Call Unicommerce API
  await axios.post(`${UNICOMMERCE_BASE_URL}/saleOrder/create`, payload, {
    headers: {
      Authorization: "Bearer " + token,
    }
  });
};
