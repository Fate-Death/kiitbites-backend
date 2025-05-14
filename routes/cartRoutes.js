// routes/cartRoutes.js
const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");

router.post("/cart/add", cartController.addToCart);
router.post("/cart/remove-one", cartController.removeOne);
router.post("/cart/remove-item", cartController.removeItem);
router.get("/cart/:userId", cartController.getCart);
router.get("/cart/extras/:userId", cartController.getExtras);

module.exports = router;
