const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');

router.get('/credentials', apiController.getAllUserCredentials);

module.exports = router;
