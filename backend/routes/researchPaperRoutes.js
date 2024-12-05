const express = require('express');
const router = express.Router();
const researchPaperController = require('../controllers/researchPaperController');
const authenticateJWT = require('../middleware/authMiddleware');

router.post('/', authenticateJWT, researchPaperController.addResearchPaper);
router.put('/:id', authenticateJWT, researchPaperController.updateResearchPaper);
router.get('/:userId?', authenticateJWT, researchPaperController.getResearchPapers);
router.delete('/:id', authenticateJWT, researchPaperController.deleteResearchPaper);

module.exports = router; 