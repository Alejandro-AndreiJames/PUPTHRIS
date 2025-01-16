const express = require('express');
const router = express.Router();
const observationScheduleController = require('../controllers/observationScheduleController');
const authenticateJWT = require('../middleware/authMiddleware');

// Apply authentication middleware
router.use(authenticateJWT);

// Define routes
router.post('/', observationScheduleController.createSchedule);
router.get('/', observationScheduleController.getAllSchedules);
router.get('/:id', observationScheduleController.getScheduleById);
router.put('/:id', observationScheduleController.updateSchedule);
router.delete('/:id', observationScheduleController.deleteSchedule);
router.post('/schedules/:scheduleId/evaluation', observationScheduleController.linkEvaluation);
router.get('/schedules/pending', observationScheduleController.getPendingSchedules);
router.get('/faculty/:facultyId/schedules', observationScheduleController.getFacultySchedules);

module.exports = router;
