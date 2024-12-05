const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');

router.post('/', bookController.addBook);
router.put('/:id', bookController.updateBook);
router.get('/:userId?', bookController.getBooks);
router.delete('/:id', bookController.deleteBook);

module.exports = router; 