const express = require('express');
const router = express.Router();
const lectureMaterialController = require('../controllers/lectureMaterialController');
const authenticateJWT = require('../middleware/authMiddleware');

router.post('/', authenticateJWT, lectureMaterialController.addLectureMaterial);
router.put('/:id', authenticateJWT, lectureMaterialController.updateLectureMaterial);
router.get('/:userId?', authenticateJWT, lectureMaterialController.getLectureMaterials);
router.delete('/:id', authenticateJWT, lectureMaterialController.deleteLectureMaterial);

module.exports = router; 