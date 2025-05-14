const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Cluster_Accounts } = require("../config/db");
const { Cluster_Item } = require("../config/db");
const Account = Cluster_Accounts.model("Account");
const Item = Cluster_Item.model("Item");

// Create a foodcourt account
exports.createFoodcourt = async (req, res) => {
  try {
    const { email, phone, password, location } = req.body;

    // Check if account already exists
    const existingAccount = await Account.findOne({
      $or: [{ email }, { phone }],
    });
    if (existingAccount) {
      return res
        .status(400)
        .json({ message: "Account with this email or phone already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create foodcourt account
    const foodcourt = new Account({
      type: "foodcourt",
      email,
      phone,
      password: hashedPassword,
      isVerified: true,
      location,
      inventory: [],
    });

    await foodcourt.save();

    res.status(201).json({
      message: "Foodcourt account created successfully",
      foodcourt: {
        id: foodcourt._id,
        email: foodcourt.email,
        location: foodcourt.location,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Error creating foodcourt account",
      error: err.message,
    });
  }
};
