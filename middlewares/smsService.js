import axios from "axios";
import http from "https";

const sendSMS = async (mobileNumber, message) => {
  console.log("message", message);
  let data = {
    "template_id": process.env.SMS_TEMPLATE_ID,
    "realTimeResponse":process.env.SMS_SENDERID,
    "recipients": [
      {
        "mobiles": "91"+mobileNumber,
        "var": message.var2
      }
    ]
  };
  //console.log("data", JSON.stringify(data));
  var options = {
    method: 'POST',
    url: 'https://control.msg91.com/api/v5/flow',
    headers: {
      authkey: process.env.SMS_AUTH_KEY,
      accept: 'application/json',
      'content-type': 'application/json'
    },
    data: JSON.stringify(data)
  };
  //console.log("options", options);
  axios.request(options).then(function (response) {
    //console.log("1", response.data);
  }).catch(function (error) {
    console.error("error", error);
  });
}

export { sendSMS };

