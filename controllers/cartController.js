const mongoose = require("mongoose");
const { Cluster_Accounts, Cluster_Item } = require("../config/db");

//Register schemas from respective clusters
const Account = Cluster_Accounts.model("Account");
const Inventory = Cluster_Item.model("Inventory");
const Item = Cluster_Item.model("Item"); // ⬅️ Needed for correct population
// const Account = require("../models/account/Account");
// const Inventory = require("../models/item/inventory");
// const Item = require("../models/item/Item");
const getFoodCourtIdForItem = async (itemId) => {
  if (!mongoose.Types.ObjectId.isValid(itemId)) return null;

  const inventoryRecord = await Inventory.findOne({ itemId });
  return inventoryRecord ? inventoryRecord.foodCourtId : null;
};

exports.addToCart = async (req, res) => {
  const { userId, itemId, foodCourtId } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(itemId) ||
    !mongoose.Types.ObjectId.isValid(foodCourtId)
  ) {
    return res
      .status(400)
      .json({ error: "Invalid userId, itemId, or foodCourtId" });
  }

  try {
    // Populate with model reference explicitly
    const user = await Account.findById(userId).populate({
      path: "cart.itemId",
      model: Item, // 🔧 Fix: tell Mongoose which model to use
    });

    if (!user || !["user-standard", "user-premium"].includes(user.type)) {
      return res.status(400).json({ error: "Invalid user" });
    }

    const inventory = await Inventory.findOne({ itemId, foodCourtId });
    if (!inventory) {
      return res
        .status(404)
        .json({ error: "Item not available in the specified foodcourt" });
    }

    if (user.cart.length > 0) {
      const firstCartFoodCourtId = foodCourtId;

      const existingItemFoodCourtId = await Inventory.findOne({
        itemId: user.cart[0].itemId._id,
      });

      if (
        !existingItemFoodCourtId ||
        existingItemFoodCourtId.foodCourtId.toString() !== firstCartFoodCourtId
      ) {
        return res.status(409).json({
          error:
            "All items in cart must belong to the same foodcourt. Please clear cart to switch.",
        });
      }
    }

    const totalItems = user.cart.reduce(
      (sum, entry) => sum + entry.quantity,
      0
    );
    if (totalItems >= 5) {
      return res
        .status(403)
        .json({ error: "Cart item limit reached (max 5 items)" });
    }

    const existingItem = user.cart.find(
      (i) => i.itemId && i.itemId._id.toString() === itemId
    );
    if (existingItem) {
      if (existingItem.quantity >= inventory.quantity) {
        return res
          .status(403)
          .json({ error: "Cannot add more than available quantity" });
      }
      existingItem.quantity += 1;
    } else {
      user.cart.push({ itemId, quantity: 1 });
    }

    await user.save();

    // Re-fetch with populated itemId using correct model again
    const updatedUser = await Account.findById(userId).populate({
      path: "cart.itemId",
      model: Item,
    });

    res.json({ message: "Item added to cart", cart: updatedUser.cart });
  } catch (err) {
    console.error("Add to Cart Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ➕ Increase quantity by one
exports.increaseOne = async (req, res) => {
  const { userId, itemId } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(itemId)
  ) {
    return res.status(400).json({ error: "Invalid userId or itemId" });
  }

  try {
    const user = await Account.findById(userId).populate({
      path: "cart.itemId",
      model: Item,
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const cartIndex = user.cart.findIndex(
      (entry) => entry.itemId && entry.itemId._id.toString() === itemId
    );

    if (cartIndex === -1) {
      return res.status(404).json({ error: "Item not in cart" });
    }

    const foodCourtId = await getFoodCourtIdForItem(itemId);
    if (!foodCourtId) {
      return res.status(404).json({ error: "Foodcourt not found for item" });
    }

    const inventory = await Inventory.findOne({ itemId, foodCourtId });
    if (!inventory) {
      return res
        .status(404)
        .json({ error: "Item not available in this foodcourt" });
    }

    const currentQuantity = user.cart[cartIndex].quantity;

    if (currentQuantity >= inventory.quantity) {
      return res
        .status(403)
        .json({ error: "Cannot exceed available stock quantity" });
    }

    const totalItems = user.cart.reduce(
      (sum, entry) => sum + entry.quantity,
      0
    );

    if (totalItems >= 5) {
      return res
        .status(403)
        .json({ error: "Cart item limit reached (max 5 items)" });
    }

    user.cart[cartIndex].quantity += 1;
    await user.save();

    const updatedUser = await Account.findById(userId).populate({
      path: "cart.itemId",
      model: Item,
    });

    res.json({
      message: "Item quantity increased",
      cart: updatedUser.cart,
    });
  } catch (err) {
    console.error("Increase One Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ➖ Remove one quantity
exports.removeOne = async (req, res) => {
  const { userId, itemId } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(itemId)
  ) {
    return res.status(400).json({ error: "Invalid userId or itemId" });
  }

  try {
    const user = await Account.findById(userId).populate({
      path: "cart.itemId",
      model: Item, // 🔧 Fix: tell Mongoose which model to use
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    const index = user.cart.findIndex(
      (i) => i.itemId && i.itemId._id.toString() === itemId
    );
    if (index === -1)
      return res.status(404).json({ error: "Item not in cart" });

    if (user.cart[index].quantity > 1) {
      user.cart[index].quantity -= 1;
    } else {
      user.cart.splice(index, 1);
    }

    await user.save();

    const updatedUser = await Account.findById(userId).populate({
      path: "cart.itemId",
      model: Item, // 🔧 Fix: tell Mongoose which model to use
    });
    res.json({ message: "Item quantity reduced", cart: updatedUser.cart });
  } catch (err) {
    console.error("Remove One Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// 🗑 Remove entire item
exports.removeItem = async (req, res) => {
  const { userId, itemId } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(itemId)
  ) {
    return res.status(400).json({ error: "Invalid userId or itemId" });
  }

  try {
    const user = await Account.findById(userId).populate({
      path: "cart.itemId",
      model: Item, // 🔧 Fix: tell Mongoose which model to use
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    user.cart = user.cart.filter(
      (i) => !(i.itemId && i.itemId._id.toString() === itemId)
    );
    await user.save();

    const updatedUser = await Account.findById(userId).populate({
      path: "cart.itemId",
      model: Item, // 🔧 Fix: tell Mongoose which model to use
    });

    res.json({ message: "Item removed from cart", cart: updatedUser.cart });
  } catch (err) {
    console.error("Remove Item Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// 🛒 Get cart
exports.getCart = async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid userId" });
  }

  try {
    const user = await Account.findById(userId).populate({
      path: "cart.itemId",
      model: Item, // 🔧 Fix: tell Mongoose which model to use
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ cart: user.cart });
  } catch (err) {
    console.error("Get Cart Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// 🍟 Get extras from same foodcourt
exports.getExtras = async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid userId" });
  }

  try {
    const user = await Account.findById(userId);
    if (!user || user.cart.length === 0) {
      return res.status(200).json({ extras: [] });
    }

    const cartItemIds = user.cart.map((entry) => entry.itemId.toString());

    // Fetch inventory entries for all items in cart
    const inventoryRecords = await Inventory.find({
      itemId: { $in: cartItemIds },
    });

    const uniqueFoodCourtIds = [
      ...new Set(inventoryRecords.map((rec) => rec.foodCourtId.toString())),
    ];

    // If cart contains items from multiple foodcourts, clear cart
    if (uniqueFoodCourtIds.length !== 1) {
      user.cart = [];
      await user.save();

      return res.status(200).json({
        extras: [],
        warning: "Cart was cleared due to items from multiple foodcourts.",
      });
    }

    const foodCourtId = uniqueFoodCourtIds[0];

    // Fetch all items from that same foodcourt
    const sameCourtInventory = await Inventory.find({ foodCourtId }).populate(
      "itemId"
    );

    const extras = sameCourtInventory
      .filter((entry) => !cartItemIds.includes(entry.itemId._id.toString()))
      .map((entry) => ({
        item: entry.itemId,
        available: entry.quantity,
      }));

    res.json({ extras });
  } catch (err) {
    console.error("Get Extras Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
