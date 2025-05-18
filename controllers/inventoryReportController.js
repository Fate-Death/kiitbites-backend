const mongoose = require("mongoose");
const { Cluster_Inventory, Cluster_Item, Cluster_Accounts } = require("../config/db");

// Models
const Inventory = require("../models/item/inventory");
const InventoryReport = require("../models/inventory/InventoryReport");

// ✅ Re-register Item model in Cluster_Inventory for population
const itemSchema = require("../models/item/Item").schema;
let ItemInInventoryCluster;
try {
  ItemInInventoryCluster = Cluster_Inventory.model("Item");
} catch {
  ItemInInventoryCluster = Cluster_Inventory.model("Item", itemSchema);
}

// ─────────────────────────────────────────────────────────────
// 📌 POST: Create or Update Inventory Report
// ─────────────────────────────────────────────────────────────
exports.createInventoryReport = async (req, res) => {
  try {
    const { foodCourtId, date, customEntries = [] } = req.body;

    const allowedTypes = [
      "admin", "foodcourt", "cafe", "canteen", "guesthouse", "hospitality", "main"
    ];

    const account = await Cluster_Accounts.model("Account").findById(foodCourtId);
    if (!account || !allowedTypes.includes(account.type)) {
      return res.status(400).json({ message: "Invalid or unauthorized foodCourtId" });
    }

    const reportDate = new Date(date);
    reportDate.setUTCHours(0, 0, 0, 0);

    // Fetch inventory items
    const inventoryItems = await Inventory.find({ foodCourtId }).populate("itemId");

    // Prepare retail entries from inventory
    const retailEntries = inventoryItems
      .filter(entry => entry.itemId && entry.itemId.type === "retail")
      .map(entry => ({
        item: entry.itemId._id,
        openingQty: 0,
        closingQty: entry.quantity,
        type: "retail"
      }));

    // Try to fetch previous day's report
    const prevDate = new Date(reportDate);
    prevDate.setUTCDate(reportDate.getUTCDate() - 1);
    const previousReport = await InventoryReport.findOne({ foodCourtId, date: prevDate });

    for (const entry of retailEntries) {
      const match = previousReport?.entries.find(
        e => e.item && e.item.toString() === entry.item.toString()
      );
      entry.openingQty = match ? match.closingQty : entry.closingQty;
    }

    // Check if report already exists
    let existingReport = await InventoryReport.findOne({ foodCourtId, date: reportDate });

    if (existingReport) {
      // Update existing entries
      const entryMap = new Map();

      for (const entry of existingReport.entries) {
        if (entry.item) {
          entryMap.set(entry.item.toString(), entry);
        } else if (entry.customName) {
          entryMap.set(`custom-${entry.customName}`, entry);
        }
      }

      // Merge retail entries
      for (const newEntry of retailEntries) {
        const key = newEntry.item.toString();
        if (entryMap.has(key)) {
          const existing = entryMap.get(key);
          existing.openingQty = newEntry.openingQty;
          existing.closingQty = newEntry.closingQty;
        } else {
          existingReport.entries.push(newEntry);
        }
      }

      // Merge custom entries
      for (const custom of customEntries) {
        const key = `custom-${custom.customName}`;
        if (entryMap.has(key)) {
          const existing = entryMap.get(key);
          existing.openingQty = custom.openingQty;
          existing.closingQty = custom.closingQty;
          existing.type = "user";
        } else {
          existingReport.entries.push({
            customName: custom.customName,
            openingQty: custom.openingQty,
            closingQty: custom.closingQty,
            type: "user",
          });
        }
      }

      await existingReport.save();
      const updated = await InventoryReport.findById(existingReport._id).populate("entries.item");
      return res.status(200).json({ message: "Inventory report updated", report: updated });
    }

    // Create new report
    const finalEntries = [
      ...retailEntries,
      ...customEntries.map(c => ({
        customName: c.customName,
        openingQty: c.openingQty,
        closingQty: c.closingQty,
        type: "user",
      })),
    ];

    const newReport = new InventoryReport({
      foodCourtId,
      date: reportDate,
      entries: finalEntries,
    });

    await newReport.save();
    const populated = await InventoryReport.findById(newReport._id).populate("entries.item");

    res.status(201).json({ message: "Inventory report created", report: populated });
  } catch (err) {
    console.error("Create/Update Report Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// 📌 GET: Get report by date (auto-generate if not exists)
// ─────────────────────────────────────────────────────────────
exports.getInventoryReportByDate = async (req, res) => {
  try {
    const { foodCourtId } = req.params;
    const { date } = req.query;

    const reportDate = new Date(date);
    reportDate.setUTCHours(0, 0, 0, 0);

    let report = await InventoryReport.findOne({
      foodCourtId,
      date: reportDate,
    }).populate("entries.item");

    if (report) {
      return res.status(200).json(report);
    }

    // Auto-generate report if missing
    const inventoryItems = await Inventory.find({ foodCourtId }).populate("itemId");

    const retailEntries = inventoryItems
      .filter(entry => entry.itemId && entry.itemId.type === "retail")
      .map(entry => ({
        item: entry.itemId._id,
        openingQty: 0,
        closingQty: entry.quantity,
        type: "retail",
      }));

    const prevDate = new Date(reportDate);
    prevDate.setUTCDate(reportDate.getUTCDate() - 1);

    const previousReport = await InventoryReport.findOne({ foodCourtId, date: prevDate });

    for (const entry of retailEntries) {
      const match = previousReport?.entries.find(
        e => e.item && e.item.toString() === entry.item.toString()
      );
      entry.openingQty = match ? match.closingQty : entry.closingQty;
    }

    const newReport = new InventoryReport({
      foodCourtId,
      date: reportDate,
      entries: retailEntries,
    });

    await newReport.save();
    const populated = await InventoryReport.findById(newReport._id).populate("entries.item");

    res.status(201).json(populated);
  } catch (err) {
    console.error("Get Report Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// 📌 GET: Get all reports for a given month
// ─────────────────────────────────────────────────────────────
exports.getMonthlyReports = async (req, res) => {
  try {
    const { foodCourtId } = req.params;
    const { month } = req.query;

    const [year, mon] = month.split("-").map(Number);
    const start = new Date(Date.UTC(year, mon - 1, 1));
    const end = new Date(Date.UTC(year, mon, 0, 23, 59, 59));

    const reports = await InventoryReport.find({
      foodCourtId,
      date: { $gte: start, $lte: end },
    }).populate("entries.item");

    res.status(200).json(reports);
  } catch (err) {
    console.error("Get Monthly Reports Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
