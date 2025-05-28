const express = require("express");
const router = express.Router();
const {
  getFavourites,
  getFavouritesByUni,
  toggleFavourite,
} = require("../controllers/favouritesController");

router.get("/:userId", getFavourites);
router.get("/:userId/uni", getFavouritesByUni);
router.patch("/:userId/:itemId/:kind", toggleFavourite);

module.exports = router;
