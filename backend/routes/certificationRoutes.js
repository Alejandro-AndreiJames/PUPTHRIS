const express = require('express');
const router = express.Router();
const certificationController = require('../controllers/certificationController');
const authenticateJWT = require('../middleware/authMiddleware');

router.get('/:userId', authenticateJWT, certificationController.getCertifications);
router.post('/', authenticateJWT, certificationController.addCertification);
router.put('/:id', authenticateJWT, certificationController.updateCertification);
router.delete('/:id', authenticateJWT, certificationController.deleteCertification);

module.exports = router;
