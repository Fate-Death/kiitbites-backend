const express = require("express");
const router = express.Router();
const itemController = require("../controllers/itemController");

// Route Pattern: /api/items/:category
router.post("/:category", itemController.addItem);
router.get("/:category", itemController.getAllItems);
router.put("/:category/:id", itemController.updateItem);
router.delete("/:category/:id", itemController.deleteItem);

module.exports = router;
