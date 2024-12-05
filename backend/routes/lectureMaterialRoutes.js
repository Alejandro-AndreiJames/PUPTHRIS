const express = require('express');
const router = express.Router();
const lectureMaterialController = require('../controllers/lectureMaterialController');

router.post('/', lectureMaterialController.addLectureMaterial);
router.put('/:id', lectureMaterialController.updateLectureMaterial);
router.get('/:userId?', lectureMaterialController.getLectureMaterials);
router.delete('/:id', lectureMaterialController.deleteLectureMaterial);

module.exports = router; 