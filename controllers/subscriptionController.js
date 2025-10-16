import _ from "lodash";
import { subscriptionsEmail } from "../emails/sellWithUs.js";
import { connectWithUsEmail } from "../emails/connectWithUs.js";
import { sendEmail } from "../middlewares/emailService.js";
import { Subscription } from "../DB/models/subscription.js";
import { ConnectWithUs  } from "../DB/models/connectWithUs.js";

const { isEmpty } = _;

// 🔹 Auto-increment helper
async function getNextId(model) {
  const lastDoc = await model.findOne().sort({ id: -1 }).lean();
  return lastDoc ? lastDoc.id + 1 : 1;
}

// ✅ Add subscription
export const addSubscriptions = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || isEmpty(email)) {
      return res.status(400).json({
        message: "Please provide Email",
        error: true,
      });
    }

    const existing = await Subscription.findOne({ email });
    if (existing) {
      return res.status(200).json({
        error: true,
        message: "You are already subscribed",
        results: [],
      });
    }

    // Send email
    const templateData = { name: "User" };
    const mailTemplate = await subscriptionsEmail(templateData);
    await sendEmail({
      to: email,
      subject: "Welcome to Cureka",
      html: mailTemplate,
    });

    // Insert new subscription
    const newId = await getNextId(Subscription);
    const newSubscription = await Subscription.create({ id: newId, email });

    res.status(201).json({
      message: "Subscriptions added successfully",
      error: false,
      data: newSubscription,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: true, message: error.message });
  }
};

// ✅ Get all subscriptions
export const getAllSubscriptions = async (req, res) => {
  try {
    const result = await Subscription.find().sort({ id: -1 }).lean();
    return res.status(200).json({
      error: false,
      message: "List Fetched successfully.",
      results: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: true, message: error.message });
  }
};

// ✅ Add connect with us
export const connectWithUs = async (req, res) => {
  try {
    const { name, email, mobile, subject, message } = req.body;

    const newId = await getNextId(ConnectWithUs);
    const newRecord = await ConnectWithUs.create({
      id: newId,
      name,
      email,
      mobile,
      subject,
      message,
    });

    // Send email
    const templateData = { name: "User" };
    const mailTemplate = await connectWithUsEmail(templateData);
    await sendEmail({
      to: email,
      subject: "Welcome to Cureka",
      html: mailTemplate,
    });

    res.status(201).json({
      message: "Request added successfully",
      error: false,
      data: newRecord,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal Server Error to connectWithUs" });
  }
};

// ✅ Get all connect-with-us records
export const getAllConnectWithUs = async (req, res) => {
  try {
    const result = await ConnectWithUs.find().sort({ id: -1 }).lean();
    return res.status(200).json({
      error: false,
      message: "List Fetched successfully.",
      results: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal Server Error to connectWithUsGetAll" });
  }
};
