import mongoose from "mongoose";
import dotenv from "dotenv";
import logger from "../middlewares/logger.js";
dotenv.config();

async function connectDB() {
    try {
        const connection = await mongoose.connect(process.env.MONGO_URI);
        console.log(`Database Connected!`);
    } catch (error) {
        logger.error("Database connection Error",error)
        console.log(error);
    }
}

export default connectDB;

