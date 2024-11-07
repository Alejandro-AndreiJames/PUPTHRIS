const express = require('express');
const router = express.Router();
const academicPeriodController = require('../controllers/academicPeriodController');
const evaluationController = require('../controllers/evaluationController');
const authenticateJWT = require('../middleware/authMiddleware');

// Academic Period routes
router.post('/periods', authenticateJWT, academicPeriodController.createAcademicPeriod);
router.get('/periods', authenticateJWT, academicPeriodController.getAllAcademicPeriods);
router.patch('/periods/:periodId/activate', authenticateJWT, academicPeriodController.setActivePeriod);

// Evaluation routes
router.post('/evaluations', authenticateJWT, evaluationController.submitEvaluation);
router.get('/evaluations', authenticateJWT, evaluationController.getFacultyEvaluations);
router.get('/statistics', authenticateJWT, evaluationController.getEvaluationStatistics);

// Add these new routes for managing evaluation criteria
router.get('/criteria', authenticateJWT, evaluationController.getEvaluationCriteria);
router.post('/criteria', authenticateJWT, evaluationController.createEvaluationCriteria);
router.put('/criteria/:criteriaId', authenticateJWT, evaluationController.updateEvaluationCriteria);
router.delete('/criteria/:criteriaId', authenticateJWT, evaluationController.deleteEvaluationCriteria);

module.exports = router;
