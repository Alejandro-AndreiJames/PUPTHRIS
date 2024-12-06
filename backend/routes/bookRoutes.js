const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const authenticateJWT = require('../middleware/authMiddleware');

router.post('/', authenticateJWT, bookController.addBook);
router.put('/:id', authenticateJWT, bookController.updateBook);
router.get('/:userId?', authenticateJWT, bookController.getBooks);
router.delete('/:id', authenticateJWT, bookController.deleteBook);

module.exports = router; 