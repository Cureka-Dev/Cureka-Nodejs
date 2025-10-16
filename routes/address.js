import express from "express";
const router = express.Router();

import {
  addAddrress,
  updateAddress,
  getAddresses,
  deleteAddress
} from "../controllers/addressController.js";

import jwtMiddleware from "../middlewares/jwtMiddleware.js";
import { userType } from "../utils/constants.js";

router.post("/addaddress", jwtMiddleware([userType.USER]), addAddrress);
router.put("/address/:addressId", jwtMiddleware([userType.USER]), updateAddress);
router.get("/address", jwtMiddleware([userType.USER]), getAddresses);
router.put("/deleteAddress/:addressId", jwtMiddleware([userType.USER, userType.ADMIN]), deleteAddress);

export default router;
