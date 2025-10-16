import moment from 'moment';
import User from '../DB/models/adminUsers.js';
import Role from '../DB/models/roles.js';
import { addUserLogs } from '../utils/common.js';
import RolePermission from '../DB/models/rolePermission.js';
import WalletTransaction from '../DB/models/WalletTransaction.js';
import Address from '../DB/models/address.js';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt.js';
import { userType } from '../utils/constants.js';
import Customers from '../DB/models/customers.js';
import { adminForgetPassword } from "../emails/subscriptions.js";
import { sendEmail } from "../middlewares/emailService.js";
import user from '../DB/models/user.js';
// Get account details
export const getAccountDetails = async (req, res) => {
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

// export const getAccountDetails = async (req, res) => {
//   try {
//     const userId = req.user?.id || req.user?._id?.toString(); // ✅ always return as "id"

//     if (!userId) {
//       return res.status(400).json({ error: "userId required" });
//     }

//     res.status(200).json({ id: userId });
//   } catch (err) {
//     console.error("Error getting account details:", err);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };


// Update account details
export const updateAccountDetails = async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const { first_name, last_name, email, mobile_number } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { first_name, last_name, email, mobile_number },
      { new: true, runValidators: true }
    );

    if (!updatedUser) return res.status(404).json({ error: 'User details not found' });

    res.status(200).json({ message: 'User updated successfully' });
  } catch (err) {
    console.error('Error updating account details:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Email or Mobile Number already exists' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ Get all users with roles
export const userDetails = async (req, res) => {
  try {
    // Get all users (excluding wallet_balance and is_admin fields)
    const users = await User.find({})
      .sort({ _id: -1 })
      .select("-wallet_balance -is_admin");

    if (!users.length) {
      return res.status(404).json({ error: "User details not found" });
    }

    // Collect user IDs
    const userIds = users.map((u) => u.id);

    // Fetch roles for these users
    const roles = await RolePermission.find({ user_id: { $in: userIds } });

    // Map roles by user_id
    const rolesMap = roles.reduce((acc, role) => {
      const userId = role.user_id.toString();
      if (!acc[userId]) acc[userId] = [];
      acc[userId].push(role);
      return acc;
    }, {});

    // Attach roles to each user
    const results = users.map((user) => ({
      ...user.toObject(),
      roles: rolesMap[user.id?.toString()] || [],
    }));

    res.status(200).json({
      error: false,
      message: "Users fetched successfully",
      results,
    });
  } catch (err) {
    console.error("Error getting user details:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const listAllEmployees = async (req, res) => {
  try {
    const employees = await User.find({ is_admin: false }).sort({ id: -1 });
    const employeeIds = employees.map(emp => emp.id);
    const roles = await RolePermission.find({ user_id: { $in: employeeIds } });

    const rolesMap = roles.reduce((acc, role) => {
      const userId = role.user_id.toString();
      if (!acc[userId]) acc[userId] = [];
      acc[userId].push(role);
      return acc;
    }, {});

    const results = employees.map(emp => ({
      ...emp.toObject(),
      roles: rolesMap[emp._id.toString()] || [],
    }));

    res.status(200).json({
      error: false,
      message: 'List fetched successfully.',
      results,
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};
export const addEmployee = async (req, res) => {
  const { email, first_name, last_name, password, roles, status, created_by, mobile_number } = req.body;

  try {
    // 🔹 Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: true, message: `Email ${email} is already in use.` });
    }

    // 🔹 Get latest employee id (ensure it's a number)
    const lastUser = await User.findOne().sort({ id: -1 }).select("id");
    const lastId = lastUser && !isNaN(lastUser.id) ? Number(lastUser.id) : 0;
    const nextId = lastId + 1;

    // 🔹 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔹 Create new employee with auto-increment id
    const newUser = new User({
      id: nextId,   // ✅ Auto-increment id
      email,
      first_name,
      last_name,
      password: hashedPassword,
      status,
      created_by,
      is_admin: false,
      mobile_number
    });

    const savedUser = await newUser.save();

    // 🔹 Assign roles (attach user_id reference)
    if (roles && roles.length > 0) {
      const rolePermissions = roles.map(role => ({
        ...role,
        user_id: savedUser.id,
      }));

      await RolePermission.insertMany(rolePermissions);
    }

    res.status(201).json({
      error: false,
      message: "Employee added successfully.",
      data: savedUser,
    });
  } catch (error) {
    console.error("Error adding employee:", error);
    res.status(500).json({ error: true, message: error.message });
  }
};

export const editEmployee = async (req, res) => {
  const { id } = req.params; // this is numeric id
  const { email, first_name, last_name, roles, status, updated_by } = req.body;

  try {
    // 🔹 Ensure id is a number
    const numericId = Number(id);
    if (isNaN(numericId)) {
      return res.status(400).json({ error: true, message: "Invalid employee ID." });
    }

    // 🔹 Update employee by numeric id
    const updatedUser = await User.findOneAndUpdate(
      { id: numericId },   // ✅ use numeric id instead of _id
      { email, first_name, last_name, status, updated_by },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: true, message: "Employee not found." });
    }

    // 🔹 Remove old roles
    await RolePermission.deleteMany({ user_id: updatedUser.id });

    // 🔹 Insert new roles
    if (roles && roles.length > 0) {
      const rolePermissions = roles.map(role => ({
        ...role,
        user_id: updatedUser.id, // use Mongo _id reference here
      }));

      await RolePermission.insertMany(rolePermissions);
    }

    res.status(200).json({
      error: false,
      message: "Employee details updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error editing employee:", error);
    res.status(500).json({ error: true, message: error.message });
  }
};

export const deleteEmployee = async (req, res) => {
  const { id } = req.params;

  try {
    const numericId = Number(id);
    if (isNaN(numericId)) {
      return res.status(400).json({ error: true, message: "Invalid employee id." });
    }

    // 🔹 Delete user by custom numeric id
    const deletedUser = await User.findOneAndDelete({ id: numericId });

    if (!deletedUser) {
      return res.status(404).json({ error: true, message: "Employee not found." });
    }

    // 🔹 Delete related role permissions by MongoDB _id reference
    await RolePermission.deleteMany({ user_id: deletedUser.id });

    res.status(200).json({
      error: false,
      message: "Employee deleted successfully.",
      data: { id: numericId },
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

export const getEmployee = async (req, res) => {
  const { id } = req.params;

  try {
    // Convert id to Number because your schema stores `id` as a Number
    const employee = await User.findOne({ id: Number(id) });

    if (!employee) {
      return res.status(404).json({ error: true, message: 'Employee not found.' });
    }

    const roles = await RolePermission.find({ user_id: Number(id) });

    res.status(200).json({
      error: false,
      message: 'Employee retrieved successfully.',
      data: { ...employee.toObject(), roles },
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

export const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: true,
      message: "Email and password are required",
    });
  }

  try {
    // 🔹 Find user by email
    const admin = await User.findOne({ email });
    console.log("admin", admin);
    if (!admin) {
      return res.status(404).json({
        login: false,
        msg: "User Email Not Exists",
      });
    }

    // 🔹 Compare password
    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.status(401).json({
        login: false,
        msg: "Wrong Password",
      });
    }

    // 🔹 Save login log
    const userLog = {
      user_id: admin.id, // ✅ numeric id
      payload: JSON.stringify(req.body),
      response: JSON.stringify({ login: true, userEmail: email }),
      type: "adminLogin",
    };
    await addUserLogs(userLog);

    req.user = admin;

    // 🔹 Fetch all roles directly (no RolePermission check)
    const roleData = await Role.aggregate([
      {
        $match: { status: "Active" }
      },
      {
        $project: {
          _id: 0,          // hide MongoDB _id (optional)
          roleId: "$id",   // alias "id" → "roleId"
          name: 1,         // keep name
          status: 1,      // keep status
          created_by: 1,
          created_at: 1
        }
      }
    ]);

    // 🔹 Generate JWT
    const token = generateToken(admin, userType.ADMIN);

    return res.status(200).json({
      login: true,
      is_admin: admin.is_admin,
      userEmail: email,
      roles: roleData,
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      error: true,
      message: "Internal server error",
    });
  }
};

// ✅ Add funds to wallet (number-based IDs)
export const addwallet = async (req, res) => {
  try {
    const { txn_type, phone, amount, userId, transaction_id, order_id } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const numericUserId = Number(userId);

    // 🔹 Fetch user
    const user = await Customers.findOne({ id: numericUserId });
    //console.log("user found:", user);
    if (!user) return res.status(404).json({ error: "User not found" });

    // 🔹 Safely convert balances to numbers
    const opening_balance = Number(user.wallet_balance || 0);
    const final_amount = opening_balance + Number(amount || 0);

    // 🔹 Find last wallet transaction
    const lastTxn = await WalletTransaction.findOne().sort({ id: -1 });
    const nextId = lastTxn ? lastTxn.id + 1 : 1;

    // 🔹 Create transaction
    const transaction = new WalletTransaction({
      id: nextId,
      user_id: numericUserId,
      opening_balance,
      transaction_type: txn_type,
      amount: Number(amount || 0),
      final_amount,
      transaction_id,
      description: "TOP UP",
      payment_status: "SUCCESS",
      txn_date: moment().toDate(),
      order_id: Number(order_id || 0)
    });
    await transaction.save();

    // 🔹 Update user wallet balance directly
    user.wallet_balance = final_amount;
    await user.save(); // ✅ guaranteed update
    //console.log("final_amount updated:", final_amount);

    res.status(200).json({
      message: "Wallet Updated Successfully",
      data: transaction.id,
      final_wallet_balance: final_amount,
    });

  } catch (err) {
    console.error("Error adding funds to wallet:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};




export const walletTxns = async (req, res) => {
  try {
    console.log("req.user", req.user);

    const userId = Number(req.user.id); // ✅ ensure numeric type
    if (!userId) return res.status(400).json({ error: 'userId required' });

    // Build query but don't execute yet
    const query = WalletTransaction.find({
      user_id: userId,
      payment_status: 'SUCCESS',
    }).sort({ txn_date: -1 });

    // Log the raw query filter and options
    console.log("MongoDB query filter:", query.getQuery());
    console.log("MongoDB query options:", query.getOptions());

    // Execute query
    const transactions = await query;

    console.log("Transactions found:", transactions.length);
    console.log("Transactions data:", transactions);

    res.status(200).json({
      message: 'Wallet Transactions',
      txns: transactions,
    });
  } catch (err) {
    console.error('Error fetching wallet transactions:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};



// Get wallet transactions for admin
export const adminwalletTxns = async (req, res) => {
  try {
    const transactions = await WalletTransaction.find({})
      .populate('user_id', 'first_name last_name mobile_number')
      .sort({ txn_date: -1 });

    res.status(200).json({ message: 'Wallet Transactions', txns: transactions });
  } catch (err) {
    console.error('Error fetching admin wallet transactions:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get wallet amount
export const walletamount = async (req, res) => {
  try {
    const userId = Number(req.user.id); // ✅ ensure numeric type
    if (!userId) return res.status(400).json({ error: 'userId required' });

    // 🔹 Find user by numeric 'id' field (not _id)
    const user = await Customers.findOne({ id: userId }).select('id wallet_balance');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const walletBalance = Number(user.wallet_balance || 0);

    res.status(200).json({
      message: 'Wallet Balance',
      user_id: Number(user.id), // ✅ id as number
      wallet_balance: walletBalance
    });
  } catch (err) {
    console.error('Error fetching wallet amount:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};



// Get user details by mobile number
export const userDetailsAddress = async (req, res) => {
  try {
    const mobile_number = req.params.mobile_number;
    const user = await Customers.findOne({ mobile_number }).select('-wallet_balance -is_admin');
    if (!user) return res.status(404).json({ error: 'User details not found' });

    const addresses = await Address.find({ mobile: mobile_number, status: 'Active' });
    res.status(200).json({ message: 'User fetched successfully', result: { ...user.toObject(), address: addresses } });
  } catch (err) {
    console.error('Error fetching user details by mobile number:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // 🔹 Find admin by email
    const admin = await User.findOne({ email });
    if (!admin) {
      return res.status(404).json({ success: false, message: "Email not found in the database." });
    }

    // 🔹 Generate token
    const token = Math.random().toString(36).substr(2, 10);

    // 🔹 Update admin with token (optional: add expiry)
    admin.token = token;
    admin.tokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour expiry (optional)
    await admin.save();

    // 🔹 Prepare email
    const tempData = { email, token };
    const mailTemplate = await adminForgetPassword(tempData);

    const mailData = {
      to: email,
      subject: "Password Reset Link",
      html: mailTemplate,
    };

    // 🔹 Send email
    await sendEmail(mailData);

    return res.status(200).json({
      success: true,
      message: "Reset password link sent to your email address.",
    });
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.query;
    const { password, confirmPassword } = req.body;

    // 🔹 Validation
    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ error: "Token and password are required." });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Password and confirmPassword should match." });
    }

    // 🔹 Find admin by token
    const admin = await User.findOne({ token });
    if (!admin) {
      return res.status(404).json({ error: "Token expired or invalid. Please try again." });
    }

    // 🔹 Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 🔹 Update password & clear token
    admin.password = hashedPassword;
    admin.token = "";
    admin.tokenExpiry = null; // optional if you added expiry in forgotPassword
    await admin.save();

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

