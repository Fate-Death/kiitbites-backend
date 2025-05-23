const express = require("express");
const router = express.Router();
const controller = require("../controllers/inventoryReportController");

// Create a new report manually (with optional custom items)
router.post("/report", controller.createInventoryReport);

// Get report by foodCourtId and date (auto-generate if needed)
router.get("/report/:foodCourtId", controller.getInventoryReportByDate);

// Get all reports for a given month
router.get("/report/monthly/:foodCourtId", controller.getMonthlyReports);

module.exports = router;
