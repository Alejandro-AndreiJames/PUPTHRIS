const express = require('express');
const router = express.Router();
const professionalLicenseController = require('../controllers/professionalLicenseController');
const authenticateJWT = require('../middleware/authMiddleware');

router.post('/', authenticateJWT, professionalLicenseController.addProfessionalLicense);
router.put('/:id', authenticateJWT, professionalLicenseController.updateProfessionalLicense);
router.get('/:userId?', authenticateJWT, professionalLicenseController.getProfessionalLicenses);
router.delete('/:id', authenticateJWT, professionalLicenseController.deleteProfessionalLicense);

module.exports = router; 