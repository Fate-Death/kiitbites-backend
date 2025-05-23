const mongoose = require("mongoose");
const { Cluster_Accounts } = require("../../config/db");

const uniSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  vendors: [
    {
      vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
      isAvailable: { type: String, enum: ["Y", "N"], default: "Y" },
      _id: false,
    },
  ],
});
module.exports = Cluster_Accounts.model("Uni", uniSchema);
