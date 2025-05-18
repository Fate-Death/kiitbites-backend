const mongoose = require('mongoose');
const { Cluster_Inventory, Cluster_Accounts } = require('../../config/db');

const inventoryReportSchema = new mongoose.Schema({
  foodCourtId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
    validate: {
      validator: async function (value) {
        const account = await Cluster_Accounts.model("Account")
          .findById(value)
          .select("type");

        const allowedTypes = [
          "admin",
          "foodcourt",
          "cafe",
          "canteen",
          "guesthouse",
          "hospitality",
          "main",
        ];

        return account && allowedTypes.includes(account.type);
      },
      message: "foodCourtId must reference an Account with a valid service type.",
    },
  },
  date: { type: Date, default: Date.now },
  entries: [{
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    customName: { type: String }, // Only for user-added items
    openingQty: Number,
    closingQty: Number,
    type: {
      type: String,
      enum: ['retail', 'user'],
      required: function () {
        return !this.customName; // Only required if not a custom item
      },
    }
  }],  
});

// Register the model with the Cluster_Inventory connection
const InventoryReport = Cluster_Inventory.model('InventoryReport', inventoryReportSchema);

module.exports = InventoryReport;
