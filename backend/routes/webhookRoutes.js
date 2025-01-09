const express = require("express");
const timeout = require("connect-timeout");
const rateLimit = require("express-rate-limit");
const webhookController = require("../controllers/webhookController");

const router = express.Router();

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: {
    error: "Too many webhook requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  "/faculty",
  timeout("30s"),
  webhookLimiter,
  webhookController.handleFacultyWebhook.bind(webhookController)
);

router.use((err, req, res, next) => {
  if (err.timeout) {
    res.status(408).json({ error: "Request timeout" });
  }
  next(err);
});

module.exports = router;
