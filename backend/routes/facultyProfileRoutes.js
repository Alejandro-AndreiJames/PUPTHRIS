const express = require('express');
const router = express.Router();
const { generateFacultyProfilePdf } = require('../controllers/facultyProfilePdfController');

// Route to generate faculty profile PDF
router.get('/generate', generateFacultyProfilePdf);

module.exports = router;
