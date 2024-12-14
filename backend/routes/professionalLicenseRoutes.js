const express = require('express');
const router = express.Router();
const professionalLicenseController = require('../controllers/professionalLicenseController');
const authenticateJWT = require('../middleware/authMiddleware');

router.post('/', authenticateJWT, professionalLicenseController.addLicense);
router.put('/:id', authenticateJWT, professionalLicenseController.updateLicense);
router.get('/:userId', authenticateJWT, professionalLicenseController.getLicensesByUserId);
router.delete('/:id', authenticateJWT, professionalLicenseController.deleteLicense);

module.exports = router; 