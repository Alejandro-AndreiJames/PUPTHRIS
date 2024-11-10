const express = require('express');
const router = express.Router();
const evaluationController = require('../controllers/evaluationController');
const authenticateJWT = require('../middleware/authMiddleware');

// Evaluation submission and retrieval
router.post('/evaluations', authenticateJWT, evaluationController.submitEvaluation);
router.get('/evaluations', authenticateJWT, evaluationController.getFacultyEvaluations);
router.put('/evaluations/:evaluationId', authenticateJWT, evaluationController.updateEvaluation);
// Faculty evaluation history
router.get('/evaluations/faculty/:facultyId/history', authenticateJWT, evaluationController.getFacultyEvaluationHistory);

// Evaluation statistics
router.get('/statistics', authenticateJWT, evaluationController.getEvaluationStatistics);

// Evaluation criteria management
router.get('/criteria', authenticateJWT, evaluationController.getEvaluationCriteria);
router.post('/criteria', authenticateJWT, evaluationController.createEvaluationCriteria);
router.put('/criteria/:criteriaId', authenticateJWT, evaluationController.updateEvaluationCriteria);
router.delete('/criteria/:criteriaId', authenticateJWT, evaluationController.deleteEvaluationCriteria);

// Add this new route
router.delete('/evaluations/:evaluationId', authenticateJWT, evaluationController.deleteEvaluation);

module.exports = router;
