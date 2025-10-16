import SellWithUs from "../DB/models/sellWithUs.js"; 
import { subscriptionsEmail } from "../emails/sellWithUs.js";
import { sendEmail } from "../middlewares/emailService.js";

export const createSellRequest = async (req, res) => {
  try {
    const {
      full_name,
      mobile,
      email,
      annual_business_volume,
      no_of_products,
      current_catalog_link,
      brand_name,
      categories,
      message,
    } = req.body;

    // 🔹 Validate inputs
    if (
      !full_name ||
      !mobile ||
      !email ||
      !annual_business_volume ||
      !no_of_products ||
      !brand_name ||
      !categories ||
      !message
    ) {
      return res.status(400).json({
        error: true,
        message: "All required fields must be provided.",
      });
    }

    // 🔹 Check duplicates (email & mobile)
    const existing = await SellWithUs.findOne({ $or: [{ email }, { mobile }] });

    if (existing) {
      return res.status(200).json({
        error: true,
        message:
          existing.email === email
            ? "Email already Exists"
            : "Mobile Number already Exists",
        results: [],
      });
    }

    // 🔹 Find latest ID
    const latestDoc = await SellWithUs.findOne().sort({ id: -1 }).lean();
    const newId = latestDoc ? latestDoc.id + 1 : 1;

    // 🔹 Send Email
    const templateData = { name: "User" };
    const mailTemplate = await subscriptionsEmail(templateData);

    const data = {
      to: email,
      subject: "Join Our Platform and Amplify Your Sales Potential",
      html: mailTemplate,
    };
    await sendEmail(data);

    // 🔹 Save record in MongoDB with incremented ID
    const newRequest = await SellWithUs.create({
      id: newId,
      full_name,
      mobile,
      email,
      annual_business_volume,
      no_of_products,
      current_catalog_link: current_catalog_link || null,
      brand_name,
      categories,
      message,
    });

    return res.status(201).json({
      message: "Sell Request added successfully",
      error: false,
      //latestId: newId,
      data: newRequest,
    });
  } catch (error) {
    console.error("Error creating sell request:", error);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};


export const getAll = async (req, res) => {
  try {
    const result = await SellWithUs.find().sort({ createdAt: -1 });
    return res.status(200).json({
      error: false,
      message: "List Fetched successfully.",
      results: result,
    });
  } catch (error) {
    console.error("Error fetching requests:", error);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};
