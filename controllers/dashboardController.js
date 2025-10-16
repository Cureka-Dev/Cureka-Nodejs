import mongoose from "mongoose";
import _ from "lodash";
const { isEmpty } = _;

// Import your models
import Order from "../DB/models/order.js";
import Customer from "../DB/models/customers.js";
import Product from "../DB/models/product.js";
import Category from "../DB/models/category.js";
import Brand from "../DB/models/brand.js";
import Concern from "../DB/models/concern.js";

export const dashboardCount = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const dateFilter = start_date && end_date ? {
            created_at: { $gte: new Date(start_date), $lte: new Date(end_date) }
        } : {};

        // Total sales & income
        const agg = await Order.aggregate([
            { $match: { order_placed_status: "PLACED", ...dateFilter } },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: 1 },
                    totalIncome: { $sum: "$subtotal" }
                }
            }
        ]);
        let results = agg.length ? agg[0] : { totalSales: 0, totalIncome: 0 };
        if (!results.totalIncome) results.totalIncome = 0;

        // Current day sales
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const currentDaySales = await Order.countDocuments({
            created_at: { $gte: today, $lt: tomorrow }
        });

        // Visitors
        const visitorsCount = await Customer.countDocuments(dateFilter);

        results.currentDaySales = currentDaySales;
        results.vistorsCount = visitorsCount;

        return res.status(200).json({
            error: false,
            message: "List Fetched successfully.",
            results
        });
    } catch (error) {
        console.error("Error in dashboardCount:", error);
        return res.status(500).json({ error: true, message: "Internal Server Error" });
    }
};

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export const dashboardOverview = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const dateFilter = {};
        if (startDate && endDate) {
            dateFilter.created_at = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // --- Sales Aggregation ---
        const salesAgg = await Order.aggregate([
            { $match: { order_placed_status: "PLACED", ...dateFilter } },
            { $addFields: { createdAtDate: { $toDate: "$created_at" } } },
            {
                $group: {
                    _id: { month: { $month: "$createdAtDate" }, year: { $year: "$createdAtDate" } },
                    sales: { $sum: "$subtotal" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        // --- Visitor Aggregation ---
        const visitorAgg = await Customer.aggregate([
            { $match: { ...dateFilter } },
            { $addFields: { createdAtDate: { $toDate: "$created_at" } } },
            {
                $group: {
                    _id: { month: { $month: "$createdAtDate" }, year: { $year: "$createdAtDate" } },
                    visitorsCount: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        // Map sales + visitors
        const salesMap = {};
        salesAgg.forEach(s => salesMap[`${s._id.year}-${s._id.month}`] = s.sales);

        const visitorsMap = {};
        visitorAgg.forEach(v => visitorsMap[`${v._id.year}-${v._id.month}`] = v.visitorsCount);

        // --- Build full 12-month overview ---
        const now = new Date();
        const currentYear = now.getFullYear();
        const allMonths = [];

        for (let y of [currentYear, currentYear - 1]) {
            for (let m = 1; m <= 12; m++) {
                allMonths.push({ year: y, month: m });
            }
        }

        const totalEarnings = allMonths.map(({ year, month }) => ({
            month: monthNames[month - 1],
            year,
            sales: (salesMap[`${year}-${month}`] || 0).toFixed(2)
        }));

        const salesOverview = allMonths.map(({ year, month }) => ({
            month: monthNames[month - 1],
            year,
            sales: (salesMap[`${year}-${month}`] || 0).toFixed(2),
            visitorsCount: visitorsMap[`${year}-${month}`] || 0
        }));

        // -----------------------------
        // Category wise counts (JOIN with products)
        // -----------------------------
const categoryAgg = await Order.aggregate([
  { $match: { order_placed_status: "PLACED" } },
  { $unwind: "$items" },

  // Lookup product
  {
    $lookup: {
      from: "products",
      localField: "items.product_id",
      foreignField: "_id",
      as: "product"
    }
  },
  { $unwind: "$product" },

  // ✅ Category lookup (safe string/number match)
  {
    $lookup: {
      from: "categories",
      let: { catId: "$product.category_id" },
      pipeline: [
        {
          $match: {
            $expr: {
              $or: [
                { $eq: ["$id", "$$catId"] }, // both numbers
                { $eq: [{ $toString: "$id" }, { $toString: "$$catId" }] } // string vs number
              ]
            }
          }
        }
      ],
      as: "category"
    }
  },
  { $unwind: "$category" },

  // ✅ Brand lookup (safe string/number match)
  {
    $lookup: {
      from: "brands",
      let: { brandId: "$product.brand_id" },
      pipeline: [
        {
          $match: {
            $expr: {
              $or: [
                { $eq: ["$id", "$$brandId"] },
                { $eq: [{ $toString: "$id" }, { $toString: "$$brandId" }] }
              ]
            }
          }
        }
      ],
      as: "brand"
    }
  },
  { $unwind: "$brand" },

  // Group by category & brand
  {
    $group: {
      _id: {
        category: "$category.name",
        brand: "$brand.name"
      },
      value: { $sum: 1 }
    }
  },
  { $sort: { value: -1 } }
]);

console.log("categoryAgg", categoryAgg);

        console.log("categoryAgg", categoryAgg);
        const top5CategoryWiseData = categoryAgg.slice(0, 5).map(c => ({
            key: c.id,
            value: c.value
        }));

        const categoryByData = categoryAgg.map(c => ({
            key: c.id,
            value: c.value
        }));

        // -----------------------------
        // Brand wise counts
        // -----------------------------
        const brandAgg = await Order.aggregate([
            { $match: { order_placed_status: "PLACED" } },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    localField: "items.product_id",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },

            // ✅ Lookup brand by brand number
            {
                $lookup: {
                    from: "brands",
                    localField: "product.brand",   // product.brand is a number
                    foreignField: "id",            // make sure brands collection has `id: Number`
                    as: "brand"
                }
            },
            { $unwind: "$brand" },

            // ✅ Group by brand name
            {
                $group: {
                    _id: "$brand.name",   // group by brand name
                    value: { $sum: 1 }
                }
            },
            { $sort: { value: -1 } }
        ]);

        // ✅ Format result
        const brandByData = brandAgg.map(b => ({
            key: b._id,   // brand name
            value: b.value
        }));

        console.log("brandByData", brandByData);



        // -----------------------------
        // Concern wise counts
        // -----------------------------
        const concernAgg = await Order.aggregate([
            { $unwind: "$products" },
            {
                $lookup: {
                    from: "products",
                    localField: "products.product_id",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },

            // Collect all concern numbers into an array
            {
                $project: {
                    concerns: {
                        $setUnion: [
                            [{ $ifNull: ["$product.concern_1", null] }],
                            [{ $ifNull: ["$product.concern_2", null] }],
                            [{ $ifNull: ["$product.concern_3", null] }]
                        ]
                    }
                }
            },
            { $unwind: "$concerns" },

            // Remove nulls
            { $match: { concerns: { $ne: null } } },

            // Group by concern number
            {
                $group: {
                    _id: "$concerns",   // <-- concern id
                    value: { $sum: 1 }
                }
            },

            // Lookup concern names
            {
                $lookup: {
                    from: "concerns",         // concerns collection
                    localField: "_id",        // concern id
                    foreignField: "id",       // <-- adjust if _id is ObjectId in concerns collection
                    as: "concern"
                }
            },
            { $unwind: "$concern" },

            {
                $project: {
                    key: "$concern.name",   // concern name
                    value: 1
                }
            },
            { $sort: { value: -1 } }
        ]);

        // Final result
        const concernData = concernAgg.map(c => ({
            key: c.key,   // concern name
            value: c.value
        }));

        // --- Response ---
        res.json({
            error: false,
            message: "List Fetched successfully.",
            results: {
                totalEarnings,
                salesOverview,
                top5CategoryWiseData,
                categoryByData,
                brandByData,
                concernData
            }
        });

    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).json({
            error: true,
            message: "Error fetching dashboard data",
            details: error.message
        });
    }
};


// Helpers
function monthName(monthNumber) {
    return [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ][monthNumber - 1];
}

async function monthWiseData(data) {
    let idsToCheck = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    let idMap = new Map(data.map(obj => [obj.month, obj]));
    let resultArray = idsToCheck.map(id => {
        if (idMap.has(id)) {
            return idMap.get(id);
        } else if (data[0]) {
            if (isEmpty(data[0].visitorsCount)) {
                return { month: id, year: data[0].year, visitorsCount: 0 };
            } else {
                return { month: id, year: data[0].year, sales: 0 };
            }
        }
    }).filter(Boolean);
    return resultArray;
}

async function getTop5GroupsByCount(arr, key) {
    const groupCounts = arr.reduce((acc, obj) => {
        const groupKey = obj[key];
        if (!acc[groupKey]) acc[groupKey] = 0;
        acc[groupKey]++;
        return acc;
    }, {});
    const sorted = Object.keys(groupCounts).sort((a, b) => groupCounts[b] - groupCounts[a]);
    return sorted.slice(0, 5).reduce((acc, k) => {
        acc[k] = groupCounts[k];
        return acc;
    }, {});
}

async function getGroupsByCount(arr, key) {
    return arr.reduce((acc, obj) => {
        const groupKey = obj[key];
        if (!acc[groupKey]) acc[groupKey] = 0;
        acc[groupKey]++;
        return acc;
    }, {});
}
