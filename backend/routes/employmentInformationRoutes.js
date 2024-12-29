const express = require('express');
const router = express.Router();
const employmentController = require('../controllers/employmentInformationController');
const authenticateJWT = require('../middleware/authMiddleware');

// Protected routes with JWT authentication
router.get('/:userId', authenticateJWT, employmentController.getEmploymentInfo);
router.post('/', authenticateJWT, employmentController.addEmploymentInfo);
router.put('/:userId', authenticateJWT, employmentController.updateEmploymentInfo);
router.delete('/:userId', authenticateJWT, employmentController.deleteEmploymentInfo);

module.exports = router;
