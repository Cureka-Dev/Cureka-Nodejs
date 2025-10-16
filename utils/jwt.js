import jwt from "jsonwebtoken";
//import { jwtSecret } from "../config/config.js";

export const generateToken = (user, userType) => {
  //console.log("user",user);
  return jwt.sign({ userId: user.id, userType: userType }, process.env.jwtSecret, { expiresIn: "30d" });
};
