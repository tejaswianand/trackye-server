const mongoose = require("mongoose");

const paymentModeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
});

const transactionCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    token: {
      type: String,
    },
    lastLogin: {
      type: Date,
    },
    lastIP: {
      type: String,
    },
    otp: {
      code: {
        type: String,
      },
      expiry: {
        type: Date,
      },
      lastSent: {
        type: Date,
      },
    },
    profilePic: {
      type: String,
    },
    paymentModes: [paymentModeSchema], // Embedded payment modes
    transactionCategories: [transactionCategorySchema], // Embedded transaction categories
  },
  { timestamps: true }
);

// Define default payment modes and transaction categories
userSchema.statics.getDefaultPaymentModes = function () {
  return ["Cash", "Debit Card", "Credit Card", "UPI"].map((name) => ({ name }));
};

userSchema.statics.getDefaultTransactionCategories = function () {
  return [
    "Food",
    "Shopping",
    "Transportation",
    "Entertainment",
    "Utilities",
    "Healthcare",
  ].map((name) => ({ name }));
};

// Middleware to initialize default payment modes and transaction categories when saving a new user
userSchema.pre("save", async function (next) {
  if (this.isNew) {
    this.paymentModes = this.constructor.getDefaultPaymentModes();
    this.transactionCategories =
      this.constructor.getDefaultTransactionCategories();
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
