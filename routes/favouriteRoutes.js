const express = require("express");
const router = express.Router();
const {
  addFavourite,
  getFavourites,
  getFavouritesByUni,
} = require("../controllers/favouritesController");

router.post("/:userId", addFavourite);
router.get("/:userId", getFavourites);
router.get("/:userId/uni", getFavouritesByUni);

module.exports = router;
