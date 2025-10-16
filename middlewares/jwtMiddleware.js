// middlewares/jwtMiddleware.js

import jwt from 'jsonwebtoken';
import adminUser from '../DB/models/adminUsers.js';
import logger from '../middlewares/logger.js';
import Customers from "../DB/models/customers.js"; // adjust path


const jwtMiddleware = () => {
  return async (req, res, next) => {
    const jwtSecret = process.env.jwtSecret;

    try {
      const authHeader = req.header("Authorization");
      if (!authHeader) {
        return res.status(401).json({ message: "Authorization header missing" });
      }

      const token = authHeader.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "Token missing from Authorization header" });
      }

      const decoded = jwt.verify(token, jwtSecret);
      //console.log("decoded--mid", decoded);

      const userId = decoded.userId;
      const userType = decoded.user?.userType || decoded.userType; // 🔹 check userType
//console.log("userId",userId);
      // if (!userId) {
      //   return res.status(401).json({ message: "Invalid token payload" });
      // }

      let user;
      //console.log("userType",userType);
      if (userType === "admin") {
       // console.log("1")
        // 🔹 Fetch from AdminUsers collection
        user = await adminUser.findOne({ id: userId });
      } else {
        //console.log("2",userId);
        // 🔹 Default fetch from Customers collection
        user = await Customers.findOne({ id: userId });
        //console.log("user-2",user);
      }

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      //console.log("user--mid", user);

      req.user = user;
      req.userType = userType; // ✅ keep track of user type for later
      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
};


export default jwtMiddleware;
