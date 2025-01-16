const express = require('express');
const router = express.Router();
const { generateFacultyProfilePdf } = require('../controllers/facultyProfilePdfController');
const authenticateJWT = require('../middleware/authMiddleware');

// Route to generate faculty profile PDF
router.get('/generate', authenticateJWT, generateFacultyProfilePdf);

module.exports = router;
