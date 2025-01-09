const express = require("express");
const oauthController = require("../controllers/oauthController");

const rateLimit = require("express-rate-limit");
const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

router.use(limiter);
router.get("/authorize", oauthController.authorize);
router.post("/login", oauthController.login);
router.post("/authorize", oauthController.authorize);
router.post("/token", oauthController.token);
router.get("/validate", oauthController.validateToken);
router.get("/client/:clientId", oauthController.getClientInfo);

module.exports = router;
