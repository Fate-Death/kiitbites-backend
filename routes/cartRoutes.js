// routes/cartRoutes.js
const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");

router.post("/add", cartController.addToCart);
router.post("/remove-one", cartController.removeOne);
router.post("/remove-item", cartController.removeItem);
router.get("/:userId", cartController.getCart);
router.get("/extras/:userId", cartController.getExtras);
router.post("/add-one", cartController.increaseOne);
router.post("/pay/:userId", cartController.placeOrder);
module.exports = router;
