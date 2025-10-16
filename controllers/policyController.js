import Policy from "../DB/models/policy.js";
import { addUserLogs } from "../utils/common.js"; // Assuming you have this

// ✅ Create or Update (Upsert) Policy
export const upsertPolicy = async (req, res) => {
  try {
    const { policyContent, policyName } = req.body;
    const { policySlug } = req.params;

    if (!policySlug || !policyContent) {
      return res.status(400).json({
        error: "Bad request",
        message: "All fields are required",
      });
    }

    // 🔹 Find the latest id
    const lastPolicy = await Policy.findOne().sort({ id: -1 }).select("id");
    const nextId = lastPolicy ? lastPolicy.id + 1 : 1;

    // 🔹 Upsert logic (assign id only when inserting)
    const policy = await Policy.findOneAndUpdate(
      { policy_slug: policySlug },
      {
        $set: {
          policy_slug: policySlug,
          policy_name: policyName,
          policy_content: policyContent,
        },
        $setOnInsert: { id: nextId }, // ✅ Auto-increment id only on insert
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Log user action
    const userLogs = {
      user_id: "", // replace with logged-in user id if available
      payload: JSON.stringify(req.body),
      response: JSON.stringify({
        id: policy.id, // ✅ using custom sequential id
        policyName,
        policySlug,
        policyContent,
        action: "inserted/updated",
      }),
      type: "addPolicies",
    };
    await addUserLogs(userLogs);

    res.status(200).json({
      id: policy.id, // ✅ return sequential id
      policyName: policy.policy_name,
      policySlug: policy.policy_slug,
      policyContent: policy.policy_content,
      action: "inserted/updated",
    });
  } catch (err) {
    console.error("Error upserting policy:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// ✅ Get Policy by Slug (or create empty)
export const getPolicyBySlug = async (req, res) => {
  try {
    const { policySlug } = req.params;

    if (!policySlug) {
      return res.status(400).json({
        error: "Bad request",
        message: "All fields are required",
      });
    }

    let policy = await Policy.findOne({ policy_slug: policySlug });

    if (!policy) {
      // Create empty record if not found
      policy = new Policy({
        policy_slug: policySlug,
        policy_name: "",
        policy_content: "",
      });
      await policy.save();
    }

    res.status(200).json({
      id: policy._id,
      policy_slug: policy.policy_slug,
      policy_name: policy.policy_name,
      policy_content: policy.policy_content,
    });
  } catch (err) {
    console.error("Error retrieving policy:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
