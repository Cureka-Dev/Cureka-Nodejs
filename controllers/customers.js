import Customers from '../DB/models/customers.js';
import { sendSMS } from '../middlewares/smsService.js';
import { userType } from '../utils/constants.js';
import { generateToken } from '../utils/jwt.js';
import * as otpUtils from '../utils/otp.js';
import { addUserLogs } from '../utils/common.js';
import bcrypt from 'bcryptjs';
import wpHash from 'wordpress-hash-node';

const sendOTPViaSMS = async (Customers) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const mobileNumber = Customers.mobile_number;

  // Save OTP and expiration time
  Customers.otp = otp;
  Customers.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
  await Customers.save();

  const smsPayload = {
    var1: 'otp',
    var2: otp,
    var3: 'Products'
  };

  await sendSMS(mobileNumber, smsPayload);
};

const sendOtp = async (req, res) => {
  try {
    const { mobile_number } = req.body;

    if (!mobile_number) {
      return res.status(400).json({ status: false, message: 'mobile_number is required' });
    }

    const mobileNumberRegex = /^\d{10}$/;
    if (!mobileNumberRegex.test(mobile_number)) {
      return res.status(400).json({ status: false, message: 'Invalid mobile_number format. Must be a 10-digit number' });
    }

    let customer = await Customers.findOne({ mobile_number });

    if (customer) {
      // 🔹 Update OTP if already exists
      customer.otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
      customer.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // expires in 5 min
      await customer.save();
    } else {
      // 🔹 Find last inserted id
      const lastCustomer = await Customers.findOne().sort({ id: -1 }).lean();
      const nextId = lastCustomer ? lastCustomer.id + 1 : 1;

      // 🔹 Create new customer
      customer = new Customers({
        id: nextId,
        mobile_number,
        otp: Math.floor(100000 + Math.random() * 900000).toString(),
        otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
      await customer.save();
    }

    // 🔹 Send OTP via SMS
    await sendOTPViaSMS(customer);

    res.json({ status: true, message: 'OTP sent successfully', customer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: 'Internal Server Error' });
  }
};


  const verifyOTP = async (req, res) => {
    try {
      const { mobile_number, otp } = req.body;
  
      if (!mobile_number || !otp) {
        return res.status(400).json({ message: 'mobile_number and otp are required' });
      }
  
      const customer = await Customers.findOne({ mobile_number });
  
      if (!customer) {
        return res.status(401).json({ message: 'Invalid mobile_number' });
      }
  
      const isOTPValid = otpUtils.verifyOTP(otp, customer.otp, customer.otpExpiresAt);
  
      if (!isOTPValid) {
        return res.status(401).json({ message: 'Invalid or expired OTP' });
      }
  
      // Clear OTP fields
      customer.otp = undefined;
      customer.otpExpiresAt = undefined;
      await customer.save(); // Corrected this line
  
      const token = generateToken(customer, userType.USER); // Use actual user/customer
  
      const response = {
        status: true,
        message: 'OTP verified',
        data: {
          access_token: token
        }
      };
  console.log("customer",customer);
      const userLogs = {
        user_id: customer.id, // Fixed from undefined `user.id`
        payload: JSON.stringify(req.body),
        response: JSON.stringify(response),
        type: "verifyOTP"
      };
  
      await addUserLogs(userLogs);
      res.json(response);
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
  };
  

const loginEmail = async (req, res) => {
  try {
    const { data, password } = req.body;

    if (!data || !password) {
      return res.status(400).json({ message: 'Email/Customersname and password are required' });
    }

    const Customers = await Customers.findOne({
      $or: [{ email: data }, { Customersname: data }]
    });

    if (!Customers || !Customers.password) {
      return res.status(401).json({ message: 'Invalid email/Customersname or password' });
    }

    let isValid = false;

    if (Customers.password.startsWith('$P$')) {
      isValid = wpHash.CheckPassword(password, Customers.password);
    } else {
      isValid = await bcrypt.compare(password, Customers.password);
    }

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid email/Customersname or password' });
    }

    const token = generateToken(Customers, CustomersType.Customers);
    const response = {
      status: true,
      message: 'Customers verified',
      data: {
        access_token: token
      }
    };

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: 'Internal Server Error' });
  }
};

// ✅ Update account details (MongoDB with custom `id` field)
const updateAccountDetails = async (req, res) => {
  try {
    //console.log("req.user", req.user);
    const userId = req.user.id;  // stored from auth middleware

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const { first_name, last_name, email, mobile_number } = req.body;

    // ✅ check if mobile_number already exists for another user
    if (mobile_number) {
      const existingUser = await Customers.findOne({
        mobile_number,
        id: { $ne: userId }, // exclude current user
      });

      if (existingUser) {
        return res.status(400).json({ error: "Mobile Number already exists" });
      }
    }

    // ✅ update using custom `id` field, not `_id`
    const updatedUser = await Customers.findOneAndUpdate(
      { id: userId },
      {
        $set: {
          first_name,
          last_name,
          email,
          mobile_number,
        },
      },
      {
        new: true,
        runValidators: true,
        projection: {
          password: 0,
          is_admin: 0,
          wallet_balance: 0,
          _id: 0, // remove Mongo _id completely
        },
      }
    ).lean();

    if (!updatedUser) {
      return res.status(404).json({ error: "User details not found" });
    }

    res.status(200).json({
      message: "User updated successfully",
      userDetails: updatedUser,
    });
  } catch (err) {
    console.error("Error updating account details:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getUserDetails = async (req, res) => {
  try {
    const userId = req.user?.id;   // ✅ only use id, no _id
    //console.log("req.user", req.user);

    if (!userId) {
      return res.status(400).json({ status: false, message: "userId required" });
    }

    // ✅ Find user by custom "id" field (not _id)
    const user = await Customers.findOne({ id: userId }); // ✅ remove _id completely

    if (!user) {
      return res.status(404).json({ status: false, message: "User details not found" });
    }

    res.status(200).json({
      status: true,
      message: "Account details fetched successfully",
      userDetails: user
    });
  } catch (err) {
    console.error("Error getting account details:", err);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};


export { sendOtp, verifyOTP, loginEmail,updateAccountDetails };
