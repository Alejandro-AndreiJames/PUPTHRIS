const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');

router.get('/credentials', apiController.getAllUserCredentials);
router.get('/departments', apiController.getAllDepartments);
router.get('/user-login', apiController.getAllUserLogin);

module.exports = router;
