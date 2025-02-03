const ResearchPaper = require('../models/researchPaperModel');
const Book = require('../models/bookModel');
const LectureMaterial = require('../models/lectureMaterialModel');

// Set storage limit per user (in bytes)
const MAX_STORAGE_PER_USER = 100 * 1024 * 1024; // 100MB in bytes
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file

const checkStorageLimit = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }

    // Check individual file size
    if (req.file.size > MAX_FILE_SIZE) {
      return res.status(413).json({
        error: `File too large. Maximum file size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      });
    }

    const userId = req.user.userId;
    const newFileSize = req.file.size;

    // Calculate current storage usage
    let totalStorage = 0;

    // Get all user's files and sum their sizes
    const [researchPapers, books, lectureMaterials] = await Promise.all([
      ResearchPaper.findAll({ where: { UserID: userId } }),
      Book.findAll({ where: { UserID: userId } }),
      LectureMaterial.findAll({ where: { UserID: userId } })
    ]);

    // Sum up sizes from all file types
    [...researchPapers, ...books, ...lectureMaterials].forEach(file => {
      if (file.FileSize) {
        totalStorage += file.FileSize;
      }
    });

    // Check if new file would exceed limit
    if (totalStorage + newFileSize > MAX_STORAGE_PER_USER) {
      const remainingStorage = MAX_STORAGE_PER_USER - totalStorage;
      return res.status(413).json({
        error: `Storage limit exceeded. You have ${(remainingStorage / (1024 * 1024)).toFixed(2)}MB remaining.`
      });
    }

    // Attach file size to request for later use
    req.fileSize = newFileSize;
    next();
  } catch (error) {
    console.error('Error checking storage limit:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = checkStorageLimit;
