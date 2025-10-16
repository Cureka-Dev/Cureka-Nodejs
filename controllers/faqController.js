import Faq from "../DB/models/faq.js";

export const createFaq = async (req, res) => {
  try {
    // 🔹 Find the latest id
    const lastFaq = await Faq.findOne().sort({ id: -1 }).select("id");
    const nextId = lastFaq ? lastFaq.id + 1 : 1;

    // 🔹 Create new FAQ with auto-increment id
    const faq = new Faq({
      id: nextId,   // ✅ Auto-increment id
      ...req.body
    });

    await faq.save();
    res.status(201).json({ status: true, data: faq });
  } catch (err) {
    console.error("Error creating FAQ:", err);
    res.status(500).json({ status: false, error: err.message });
  }
};


export const getFaqs = async (req, res) => {
  try {
    // Fetch only active FAQs, sorted by latest
    const faqs = await Faq.find({ status: "Active" }).sort({ createdAt: -1 });

    // Group by type
    const groupedFaqs = faqs.reduce((acc, faq) => {
      if (!acc[faq.type]) {
        acc[faq.type] = [];
      }
      acc[faq.type].push({
        id: faq.id,   // using `id`, not `_id`
        created_at: faq.createdAt,
        question: faq.question,
        answer: faq.answer,
        type: faq.type,
        status: faq.status,
      });
      return acc;
    }, {});

    res.json(groupedFaqs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const getFaqById = async (req, res) => {
  try {
    const faq = await Faq.findById(req.params.id);
    if (!faq) return res.status(404).json({ message: "FAQ not found" });
    res.json(faq);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateFaq = async (req, res) => {
  try {
    const faqId = Number(req.params.id); // convert string to number
    const faq = await Faq.findOneAndUpdate(
      { id: faqId },   // ✅ query using numeric id
      req.body,
      { new: true }
    );

    if (!faq) {
      return res.status(404).json({ message: "FAQ not found" });
    }

    res.json(faq);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const deleteFaq = async (req, res) => {
  try {
    const faqId = Number(req.params.id); // convert param to number

    const faq = await Faq.findOneAndDelete({ id: faqId }); // ✅ delete by custom id

    if (!faq) {
      return res.status(404).json({ message: "FAQ not found" });
    }

    res.json({ message: "FAQ deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

