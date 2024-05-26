const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const router = express.Router();
const User = require("../Models/User");
const Transaction = require("../Models/Transactions");
const transporter = require("../mailConfig");
const verifyToken = require("../Middlewares/VerifyToken");

router.post("/add", verifyToken, async (req, res) => {
  try {
    console.log("hit");
    const { userId } = req;
    const { type, amount, category, source, date, paymentMode, ...rest } =
      req.body;
    if (Object.keys(rest).length > 0) {
      return res.status(400).status({ status: false, message: "Invalid Data" });
    }
    if (type === "credit") {
      const transaction = new Transaction({
        userId,
        type,
        amount,
        source,
        date,
      });
      await transaction.save();
      res.status(201).json({
        status: true,
        message: "Transaction added successfully",
        transaction,
      });
    } else {
      const transaction = new Transaction({
        userId,
        type,
        amount,
        category,
        paymentMode,
        date,
      });
      await transaction.save();
      res.status(201).json({
        status: true,
        message: "Transaction added successfully",
        transaction,
      });
    }
  } catch (error) {
    console.log(error);
  }
});
router.put("/edit/:id", verifyToken, async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;
    const { amount, category, description, source, date, paymentMode } =
      req.body;

    // Find the transaction by ID and user ID
    const transaction = await Transaction.findOne({ _id: id, userId });

    // If the transaction does not exist, return an error
    if (!transaction) {
      return res
        .status(404)
        .json({ status: false, message: "Transaction not found" });
    }

    // Update transaction fields
    if (amount) {
      transaction.amount = amount;
    }
    if (category) {
      transaction.category = category;
    }
    if (description) {
      transaction.description = description;
    }
    if (source && transaction.type === "credit") {
      transaction.source = source;
    }
    if (date) {
      transaction.date = date;
    }
    if (source && transaction.type === "debit") {
      transaction.paymentMode = paymentMode;
    }

    // Save the updated transaction
    await transaction.save();

    res.json({
      status: true,
      message: "Transaction updated successfully",
      transaction,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, error: "Internal server error" });
  }
});
router.get("/view", verifyToken, async (req, res) => {
  try {
    const { userId } = req;
    const { startDate, endDate, type } = req.query;
    const filter = { userId };
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (type) {
      filter.type = type;
    }
    const transactions = await Transaction.find(filter);
    res.json({ status: true, transactions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, error: "Internal server error" });
  }
});
router.delete("/delete/:id", verifyToken, async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;
    const transaction = await Transaction.findOne({ _id: id, userId });
    if (!transaction) {
      return res
        .status(404)
        .json({ status: false, message: "Transaction not found" });
    }
    await Transaction.findByIdAndDelete(id);
    res.json({ status: true, message: "Transaction deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
});
router.get("/view/:id", verifyToken, async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;

    // Find the transaction by ID and user ID
    const transaction = await Transaction.findOne({ _id: id, userId });

    // If the transaction does not exist, return an error
    if (!transaction) {
      return res
        .status(404)
        .json({ status: false, message: "Transaction not found" });
    }

    res.json({ status: true, transaction });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, error: "Internal server error" });
  }
});

module.exports = router;
