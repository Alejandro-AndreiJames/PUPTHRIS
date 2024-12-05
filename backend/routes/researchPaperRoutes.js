const express = require('express');
const router = express.Router();
const researchPaperController = require('../controllers/researchPaperController');

// Ensure these controller methods are correctly defined and exported
router.post('/', researchPaperController.addResearchPaper);
router.put('/:id', researchPaperController.updateResearchPaper);
router.get('/:userId?', researchPaperController.getResearchPapers);
router.delete('/:id', researchPaperController.deleteResearchPaper);

module.exports = router;