const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/add', userController.addUser); // Add a user
/**
 * @route GET /api/users
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 10)
 * @query {number} campusId - Optional campus ID filter
 */
router.get('/', userController.getUsers); // Get all users
router.get('/:id', userController.getUserById); // Get user by ID
router.put('/:id/toggle-active', userController.toggleUserActiveStatus); // New route
router.get('/campuses', authMiddleware, (req, res, next) => {
  console.log('GET /campuses route hit');
  userController.getCampuses(req, res, next);
});
router.get('/:userId/current-campus', authMiddleware, (req, res, next) => {
  console.log(`GET /users/${req.params.userId}/current-campus route hit`);
  userController.getCurrentUserCampus(req, res, next);
});
router.put('/update-campus', authMiddleware, userController.updateUserCampus);

module.exports = router;
