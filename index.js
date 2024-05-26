const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const rateLimit = require("express-rate-limit");
const path = require("path");
const cors = require("cors");
const authRoutes = require("./Routes/Auth");
const txnRoutes = require("./Routes/Transactions");

const app = express();
dotenv.config();
const PORT = process.env.PORT || 5001;

app.use(bodyParser.json());
var corsOptions = {
  origin: ["http://localhost:3000", "http://192.168.1.7:3000"],
  optionsSuccessStatus: 200,
};
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);
app.use(express.static(path.join(__dirname, "public")));
app.use(cors(corsOptions));

mongoose.connect(process.env.DB_URL, {
  useUnifiedTopology: true,
});

mongoose.connection.on("connected", () => {
  console.log("Connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

app.use("/auth", authRoutes);
app.use("/txn", txnRoutes);

app.listen(PORT, (req, res) => {
  console.log("Server is up and Running");
});
