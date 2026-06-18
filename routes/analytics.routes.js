const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");

router.get("/summary", async (req, res) => {
try {
const totalMemos =
await prisma.entry.count();


const entries =
  await prisma.entry.findMany({
    include: {
      receiverCompany: true,
      purpose: true,
    },
  });

const monthlyMap = {};
const purposeMap = {};
const companyMap = {};

entries.forEach((entry) => {
  if (!entry.date) return;

  const month =
    new Date(entry.date)
      .toLocaleString(
        "default",
        {
          month: "short",
          year: "numeric",
        }
      );

  monthlyMap[month] =
    (monthlyMap[month] || 0) +
    1;

  const purpose =
    entry.purpose?.name ||
    "Unknown";

  purposeMap[purpose] =
    (purposeMap[purpose] || 0) +
    1;

  const company =
    entry.receiverCompany
      ?.name || "Unknown";

  companyMap[company] =
    (companyMap[company] || 0) +
    1;
});

const volumeByMonth =
  Object.entries(monthlyMap)
    .map(
      ([month, count]) => ({
        month,
        count,
      })
    );

const purposeBreakdown =
  Object.entries(purposeMap)
    .map(
      ([purpose, count]) => ({
        purpose,
        count,
      })
    );

const topCompanies =
  Object.entries(companyMap)
    .map(
      ([company, count]) => ({
        company,
        count,
      })
    )
    .sort(
      (a, b) =>
        b.count - a.count
    )
    .slice(0, 10);

res.json({
  totalMemos,
  volumeByMonth,
  purposeBreakdown,
  topCompanies,
});


} catch (err) {
console.error(err);

res.status(500).json({
  error:
    "Failed to generate analytics",
});


}
});

module.exports = router;
