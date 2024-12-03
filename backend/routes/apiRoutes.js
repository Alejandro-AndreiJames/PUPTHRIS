const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');

router.get('/credentials/:id', apiController.getUserCredentials);

module.exports = router;
