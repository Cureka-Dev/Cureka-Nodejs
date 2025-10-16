// routes/adminRoutes.js

import { Router } from "express";
import {
  addwallet,
  adminwalletTxns,
  getAccountDetails,
  updateAccountDetails,
  userDetails,
  userDetailsAddress,
  walletamount,
  walletTxns,
  listAllEmployees,
  addEmployee,
  editEmployee,
  deleteEmployee,
  getEmployee,
  adminLogin,
  forgotPassword,
  resetPassword
} from "../controllers/adminUserAccount.js";
import jwtMiddleware from "../middlewares/jwtMiddleware.js";
import * as schema from "../schema.js";
import { validateProductData } from "../utils/common.js";
import { userType } from "../utils/constants.js";

const router = Router();

// Protected Routes (require valid JWT token)
router.get("/getUserDetails", jwtMiddleware([userType.USER]), getAccountDetails);
router.post("/updateUserDetails", jwtMiddleware([userType.USER]), updateAccountDetails);
router.get("/fetchtxns", jwtMiddleware([userType.USER]), walletTxns);
router.get("/fetchwalletamount", jwtMiddleware([userType.USER]), walletamount);

// Public Routes
router.get("/getUsers", userDetails);
router.post("/addfunds", validateProductData(schema.addUserWallet), addwallet);
router.get("/adminfetchtxns", adminwalletTxns);
router.get("/userDetailsAddress/:mobile_number", userDetailsAddress); 
router.get("/getAccountDetails", getAccountDetails);
// Employee Management Routes
router.get("/employees", listAllEmployees);
router.post("/employees", addEmployee);
router.put("/employees/:id", editEmployee);
router.delete("/employees/:id", deleteEmployee);
router.get("/employees/:id", getEmployee);
router.post("/login", adminLogin);
router.post("/forgotPassword", forgotPassword);
router.put("/reset-password", resetPassword);
export default router;
