const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/dashboard-data', dashboardController.getDashboardData);
router.get('/user-dashboard-data/:userId', dashboardController.getUserDashboardData);
router.get('/upcoming-birthdays', dashboardController.getUpcomingBirthdays);
router.get('/age-group-data', dashboardController.getAgeGroupData);
router.get('/profile-completion/:userId', dashboardController.getProfileCompletion);
router.get('/government-id-counts', authMiddleware, dashboardController.getGovernmentIdCounts);
router.get('/female-users', authMiddleware, dashboardController.getFemaleUsers);
router.get('/male-users', authMiddleware, dashboardController.getMaleUsers);
router.get('/faculty-users', authMiddleware, dashboardController.getFacultyUsers);
router.get('/staff-users', authMiddleware, dashboardController.getStaffUsers);
router.get('/doctorate-users', authMiddleware, dashboardController.getDoctorateUsers);
router.get('/masters-users', authMiddleware, dashboardController.getMastersUsers);
module.exports = router;
