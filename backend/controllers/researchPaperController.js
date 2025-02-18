const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const ResearchPaper = require('../models/researchPaperModel');
const s3Client = require('../config/s3.config');
const { S3_BUCKET_NAME } = process.env;
const User = require('../models/userModel');
const { Op } = require('sequelize');
const checkStorageLimit = require('../middleware/uploadLimitMiddleware');
const Book = require('../models/bookModel');
const LectureMaterial = require('../models/lectureMaterialModel');


const storage = multer.memoryStorage();
const upload = multer({ storage });

exports.addResearchPaper = [
  upload.single('document'),
  checkStorageLimit,
  async (req, res) => {
    try {
      const researchData = {
        ...req.body,
        UserID: req.user.userId,
        FileSize: req.file ? req.file.size : 0
      };

      if (req.file) {
        const fileName = `research-papers/${Date.now()}_${req.file.originalname}`;
        const params = {
          Bucket: S3_BUCKET_NAME,
          Key: fileName,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        };

        await s3Client.send(new PutObjectCommand(params));
        researchData.DocumentPath = fileName;
      }

      const newResearchPaper = await ResearchPaper.create(researchData);
      res.status(201).json(newResearchPaper);
    } catch (error) {
      console.error('Error adding research paper:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
];

exports.updateResearchPaper = [
  upload.single('document'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const research = await ResearchPaper.findOne({ 
        where: { ResearchID: id, UserID: req.user.userId } 
      });

      if (!research) {
        return res.status(404).json({ error: 'Research paper not found' });
      }

      // Handle file upload if new file is provided
      if (req.file) {
        // Delete old file from S3 if it exists
        if (research.DocumentPath) {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: research.DocumentPath
          }));
        }

        // Upload new file
        const fileName = `research-papers/${Date.now()}_${req.file.originalname}`;
        await s3Client.send(new PutObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: fileName,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        }));
        updates.DocumentPath = fileName;
      }

      await research.update(updates);
      res.status(200).json(research);
    } catch (error) {
      console.error('Error updating research paper:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
];

exports.getResearchPapers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const viewMode = req.query.viewMode || 'all';
    const offset = (page - 1) * limit;
    
    // Get the current selected campus from the request header
    const selectedCampusId = parseInt(req.headers['selected-campus-id']) || null;
    
    console.log('Request params:', {
      currentUserId: req.user.userId,
      userRoles: req.user.roles,
      selectedCampusId,
      page,
      limit,
      search,
      viewMode
    });

    let whereClause = {};
    let userWhereClause = {};
    
    if (viewMode === 'personal') {
      // In personal view, only show user's own research papers
      whereClause.UserID = req.user.userId;
    } else {
      // In all view, show research papers from users of the selected campus
      if (!selectedCampusId) {
        return res.status(400).json({ 
          error: 'Campus ID is required for viewing all research papers' 
        });
      }
      userWhereClause.CollegeCampusID = selectedCampusId;
    }

    // Add search conditions if search term exists
    if (search) {
      whereClause = {
        ...whereClause,
        [Op.or]: [
          { Title: { [Op.like]: `%${search}%` } },
          { Authors: { [Op.like]: `%${search}%` } },
          { Abstract: { [Op.like]: `%${search}%` } }
        ]
      };
    }

    console.log('Where clause:', whereClause);
    console.log('User where clause:', userWhereClause);

    const { count, rows } = await ResearchPaper.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        attributes: ['UserID', 'Surname', 'FirstName', 'MiddleName', 'NameExtension', 'Email', 'CollegeCampusID'],
        as: 'User',
        where: userWhereClause // Apply campus filter on the User model
      }],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    const totalPages = Math.ceil(count / limit);
    
    res.status(200).json({
      currentPage: page,
      totalPages,
      totalItems: count,
      itemsPerPage: limit,
      items: rows
    });

  } catch (error) {
    console.error('Error getting research papers:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      details: error.message 
    });
  }
};

exports.deleteResearchPaper = async (req, res) => {
  try {
    const { id } = req.params;
    const research = await ResearchPaper.findOne({ 
      where: { ResearchID: id, UserID: req.user.userId } 
    });

    if (!research) {
      return res.status(404).json({ error: 'Research paper not found' });
    }

    // Delete file from S3 if it exists
    if (research.DocumentPath) {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: research.DocumentPath
      }));
    }

    await research.destroy();
    res.status(200).json({ message: 'Research paper deleted successfully' });
  } catch (error) {
    console.error('Error deleting research paper:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Add an endpoint to check storage usage
exports.getStorageUsage = async (req, res) => {
  try {
    const userId = req.user.userId;
    let totalStorage = 0;

    const [researchPapers, books, lectureMaterials] = await Promise.all([
      ResearchPaper.findAll({ where: { UserID: userId } }),
      Book.findAll({ where: { UserID: userId } }),
      LectureMaterial.findAll({ where: { UserID: userId } })
    ]);

    [...researchPapers, ...books, ...lectureMaterials].forEach(file => {
      if (file.FileSize) {
        totalStorage += file.FileSize;
      }
    });

    res.json({
      totalStorage: totalStorage,
      maxStorage: MAX_STORAGE_PER_USER,
      remainingStorage: MAX_STORAGE_PER_USER - totalStorage,
      usagePercentage: (totalStorage / MAX_STORAGE_PER_USER) * 100,
      readableUsage: `${(totalStorage / (1024 * 1024)).toFixed(2)}MB / ${MAX_STORAGE_PER_USER / (1024 * 1024)}MB`
    });
  } catch (error) {
    console.error('Error getting storage usage:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}; 