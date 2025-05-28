const User = require("../models/account/User");
const Retail = require("../models/item/Retail");
const Produce = require("../models/item/Produce");

// Add a favourite item
exports.addFavourite = async (req, res) => {
  try {
    const { userId } = req.params;
    const { itemId, kind } = req.body;

    if (!["Retail", "Produce"].includes(kind)) {
      return res.status(400).json({ error: "Invalid item kind." });
    }

    const ItemModel = kind === "Retail" ? Retail : Produce;
    const item = await ItemModel.findById(itemId);
    if (!item) return res.status(404).json({ error: "Item not found." });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    const alreadyExists = user.favourites.some(
      (fav) => fav.itemId.toString() === itemId && fav.kind === kind
    );
    if (alreadyExists) {
      return res.status(400).json({ error: "Item already in favourites." });
    }

    user.favourites.push({ itemId, kind });
    await user.save();

    res.status(200).json({ message: "Favourite added successfully." });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// Get all favourite items
exports.getFavourites = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ error: "User not found." });

    const favourites = await Promise.all(
      user.favourites.map(async (fav) => {
        const Model = fav.kind === "Retail" ? Retail : Produce;
        const item = await Model.findById(fav.itemId).lean();
        return item ? { ...item, kind: fav.kind } : null;
      })
    );

    res.status(200).json({ favourites: favourites.filter(Boolean) });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// Get favourite items filtered by uniId
exports.getFavouritesByUni = async (req, res) => {
  try {
    const { userId } = req.params;
    const { uniId } = req.query;

    if (!uniId) {
      return res.status(400).json({ error: "Missing 'uniId' in query." });
    }

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ error: "User not found." });

    const filteredFavourites = await Promise.all(
      user.favourites.map(async (fav) => {
        const Model = fav.kind === "Retail" ? Retail : Produce;
        const item = await Model.findOne({ _id: fav.itemId, uniId }).lean();
        return item ? { ...item, kind: fav.kind } : null;
      })
    );

    res.status(200).json({
      favourites: filteredFavourites.filter(Boolean),
    });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};
