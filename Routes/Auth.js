const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const router = express.Router();

const User = require("../Models/User");
const transporter = require("../mailConfig");
const verifyToken = require("../Middlewares/VerifyToken");

router.post("/signup", async (req, res) => {
  const { name, username, email, password, confirmPassword } = req.body;
  try {
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res
        .status(400)
        .json({ status: false, message: "Username not available" });
    }
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res
        .status(400)
        .json({ status: false, message: "Email already used" });
    }

    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ status: false, message: "Passwords do not match" });
    }
    if (password.length < 8) {
      return res.status(400).json({
        status: false,
        message: "Atleast 8 Digits Password is required.",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      username,
      email,
      password: hashedPassword,
    });

    await user.save();
    const token = jwt.sign({ userId: user._id }, process.env.JWT_KEY, {
      expiresIn: "24h",
    });
    const pushToken = await User.findOneAndUpdate(
      { email: email },
      { $set: { token: token } },
      { new: true }
    );
    const emailVerificationLink = `${process.env.APP_URL}/verify-email/${token}`;
    const emailBody = `<div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
    <p style="font-size: 16px; color: #333333;">Dear ${user.name},</p>
    <p style="font-size: 16px; color: #333333;">Welcome to Loglight! We're excited to have you on board.</p>
    <p style="font-size: 16px; color: #333333;">To complete your registration, please verify your email address by clicking the button below:</p>
    <a href="${emailVerificationLink}" style="display: inline-block; text-decoration: none; background-color: #007bff; color: #ffffff; font-size: 24px; font-weight: bold; padding: 10px 20px; border-radius: 5px; margin-top: 10px;">Verify Email</a>
    <p style="font-size: 16px; color: #333333;">If the button above doesn't work, you can also copy and paste the following link into your browser:</p>
    <p style="font-size: 16px; color: #333333;">${emailVerificationLink}</p>
    <p style="font-size: 16px; color: #333333;">Best regards,</p>
    <p style="font-size: 16px; color: #333333;">The Loglight Team</p></div>`;
    await transporter.sendMail({
      from: '"Loglight" <abierta@tawns.tech>',
      to: email,
      subject: "Verify Your Email",
      html: emailBody,
    });
    res.status(201).json({
      status: true,
      message: "Account created successfully. Verification email sent.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, messsage: "Internal server error" });
  }
});
router.post("/login", async (req, res) => {
  try {
    const { username, email, password, ...rest } = req.body;
    if (Object.keys(rest).length > 0) {
      return res.status(400).json({ status: false, message: "Invalid Data" });
    }
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(400).json({
        status: false,
        message: "User not found",
      });
    }
    if (!user.verified) {
      return res.status(400).json({
        status: false,
        message: "Email not Verified, Please Verify Your Email",
      });
    }
    const matchPassword = await bcrypt.compare(password, user.password);
    if (!matchPassword) {
      return res.status(404).json({ status: false, message: "Wrong Password" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_KEY, {
      expiresIn: "24h",
    });
    return res
      .status(200)
      .json({ status: true, message: "Logged in Successfully", token: token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
});
router.post("/verify-email", async (req, res) => {
  try {
    const { token } = req.body;
    const decodedToken = jwt.verify(token, process.env.JWT_KEY);
    const user = await User.findOne({
      _id: decodedToken.userId,
      token: token,
    });
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "Invalid Token",
      });
    }
    const isAlreadyActive = user.verified;
    if (isAlreadyActive) {
      return res.status(409).json({
        status: false,
        message: "Account Already Activated",
      });
    }
    const verifyEmail = await User.findOneAndUpdate(
      { _id: decodedToken.userId, token: token },
      { $set: { verified: true } },
      { new: true }
    );
    if (verifyEmail) {
      return res.status(200).json({
        status: true,
        message: `Email Verified Successfully`,
      });
    }
    return res.status(400).json({
      status: true,
      message: `Email Verification Failed`,
    });
  } catch (error) {
    console.error(error);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        status: false,
        message: "Token Expired",
      });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        status: false,
        message: "Invalid Token",
      });
    }
    return res.status(500).json({
      status: false,
      message: "Something Went Wrong",
    });
  }
});
router.post("/send-otp", async (req, res) => {
  try {
    const { email, ...rest } = req.body;
    if (Object.keys(rest).length > 0) {
      return res.status(400).status({ status: false, message: "Invalid Data" });
    }
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(400).json({
        status: false,
        message: "User not found",
      });
    }
    const currentTimestamp = new Date();
    const twoMinutesAgo = new Date(currentTimestamp.getTime() - 2 * 60 * 1000);
    if (user.otp.lastSent && user.otp.lastSent > twoMinutesAgo) {
      const timeDifference = new Date(
        user.otp.lastSent.getTime() + 2 * 60 * 1000 - currentTimestamp.getTime()
      );
      const remainingMinutes = Math.floor(timeDifference / (1000 * 60));
      const remainingSeconds = Math.floor(
        (timeDifference % (1000 * 60)) / 1000
      );
      const remainingTimeMessage = `Please wait ${remainingMinutes} minutes and ${remainingSeconds} seconds before requesting another OTP`;
      return res.status(429).json({
        status: false,
        message: remainingTimeMessage,
      });
    }

    const otpValue = Math.floor(100000 + Math.random() * 900000);
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 10);
    const saveOtpToDb = await User.findOneAndUpdate(
      { email: email },
      {
        $set: {
          "otp.code": otpValue,
          "otp.expiry": expiryTime,
          "otp.lastSent": currentTimestamp,
        },
      },
      { new: true }
    );
    const emailBody = `<div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
    <p style="font-size: 16px; color: #333333;">Dear ${user.name},</p>
    <p style="font-size: 16px; color: #333333;">We received a request to reset your password. As part of our security measures, we have generated a One-Time Password (OTP) for you:</p>
    <p style="font-size: 24px; font-weight: bold; color: #007bff; margin-top: 10px;">${otpValue}</p>
    <p style="font-size: 16px; color: #333333;">Please note that this OTP is valid for the next 10 minutes. Kindly use it to proceed with your password reset.</p>
    <p style="font-size: 16px; color: #333333;">If you did not initiate this password reset request, please disregard this message.</p>
    <p style="font-size: 16px; color: #333333;">Thank you for your attention to this matter.</p>
    <p style="font-size: 16px; color: #333333;">Best regards,</p>
    <p style="font-size: 16px; color: #333333;">Loglight</p>
</div>
`;
    await transporter.sendMail({
      from: '"Loglight" <abierta@tawns.tech>',
      to: email,
      subject: "OTP - Reset Password",
      html: emailBody,
    });
    return res
      .status(200)
      .json({ status: true, message: "OTP Sent Successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ status: false, message: "Internal Server Error" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(400).json({
        status: false,
        message: "User not found",
      });
    }
    if (user.otp.code != otp) {
      return res.status(400).json({ status: false, message: "Invalid OTP" });
    }
    if (user.otp.expiryTime > new Date()) {
      return res.status(400).json({ status: false, message: "OTP Expired" });
    }
    if (password.length < 8) {
      return res.status(400).json({
        status: false,
        message: "Atleast 8 Digits Password is required.",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.findOneAndUpdate(
      { email: email, "otp.code": otp },
      { $set: { password: hashedPassword } },
      { new: true }
    );
    return res
      .status(200)
      .json({ status: true, message: "Password Reset Successful" });
  } catch (error) {
    return res
      .status(500)
      .json({ status: false, message: "Internal Server Error" });
  }
});

router.post("/get-user", verifyToken, async (req, res) => {
  try {
    const { userId } = req;
    const user = await User.findOne({ _id: userId }).select(
      "name username email profilePic paymentModes transactionCategories"
    );
    if (!user) {
      return res.status(400).json({
        status: false,
        message: "User not found",
      });
    }
    return res
      .status(200)
      .json({ status: false, message: "User Details Fetched", user: user });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
});

module.exports = router;
