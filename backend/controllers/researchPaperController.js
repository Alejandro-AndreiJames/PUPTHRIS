const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const ResearchPaper = require('../models/researchPaperModel');
const s3Client = require('../config/s3.config');
const { S3_BUCKET_NAME } = process.env;
const User = require('../models/userModel');
const { Op } = require('sequelize');


const storage = multer.memoryStorage();
const upload = multer({ storage });

exports.addResearchPaper = [
  upload.single('document'),
  async (req, res) => {
    try {
      const researchData = req.body;
      researchData.UserID = req.user.userId;

      // Handle file upload to S3 if a file is provided
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
    const { userId } = req.params;
    const userRoles = req.user.roles;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const viewMode = req.query.viewMode || 'all';
    const offset = (page - 1) * limit;
    
    console.log('Request params:', {
      requestedUserId: userId,
      currentUserId: req.user.userId,
      userRoles: userRoles,
      page,
      limit,
      search,
      viewMode
    });

    let whereClause = {};
    
    // Handle viewMode filtering
    if (viewMode === 'personal') {
      whereClause.UserID = req.user.userId;
    } else {
      // Only add CollegeCampusID to where clause if it exists
      if (req.user.CollegeCampusID) {
        whereClause.CollegeCampusID = req.user.CollegeCampusID;
      }
    }

    // Add search conditions if search term exists
    if (search) {
      whereClause = {
        ...whereClause,
        [Op.or]: [
          { Title: { [Op.like]: `%${search}%` } },
          { Authors: { [Op.like]: `%${search}%` } }
        ]
      };
    }

    console.log('Where clause:', whereClause);

    const { count, rows } = await ResearchPaper.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        attributes: ['UserID', 'Surname', 'FirstName', 'MiddleName', 'NameExtension', 'Email'],
        as: 'User'
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