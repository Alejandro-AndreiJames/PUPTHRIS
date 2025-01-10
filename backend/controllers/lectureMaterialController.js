const multer = require('multer');
const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const LectureMaterial = require('../models/lectureMaterialModel');
const s3Client = require('../config/s3.config');
const { S3_BUCKET_NAME } = process.env;
const User = require('../models/userModel');
const BasicDetails = require('../models/basicDetailsModel');
const { Op } = require('sequelize');

const storage = multer.memoryStorage();
const upload = multer({ storage });

exports.addLectureMaterial = [
  upload.single('file'),
  async (req, res) => {
    try {
      const lectureData = req.body;
      lectureData.UserID = req.user.userId;

      if (req.file) {
        const fileName = `lecture-materials/${Date.now()}_${req.file.originalname}`;
        const params = {
          Bucket: S3_BUCKET_NAME,
          Key: fileName,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        };

        await s3Client.send(new PutObjectCommand(params));
        lectureData.FilePath = fileName;
      }

      const newLectureMaterial = await LectureMaterial.create(lectureData);
      res.status(201).json(newLectureMaterial);
    } catch (error) {
      console.error('Error adding lecture material:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
];

exports.updateLectureMaterial = [
  upload.single('file'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const lecture = await LectureMaterial.findOne({ 
        where: { LectureID: id, UserID: req.user.userId } 
      });

      if (!lecture) {
        return res.status(404).json({ error: 'Lecture material not found' });
      }

      if (req.file) {
        // Delete old file if exists
        if (lecture.FilePath) {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: lecture.FilePath
          }));
        }

        // Upload new file
        const fileName = `lecture-materials/${Date.now()}_${req.file.originalname}`;
        await s3Client.send(new PutObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: fileName,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        }));
        updates.FilePath = fileName;
      }

      await lecture.update(updates);
      res.status(200).json(lecture);
    } catch (error) {
      console.error('Error updating lecture material:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
];

exports.getLectureMaterials = async (req, res) => {
  try {
    const { userId } = req.params;
    const userRoles = req.user.roles;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;
    
    console.log('Request params:', {
      requestedUserId: userId,
      currentUserId: req.user.userId,
      userRoles: userRoles,
      page,
      limit,
      search
    });

    let whereClause = {};
    
    // If not admin/superadmin, or if specific userId is requested
    if (!userRoles.includes('admin') && !userRoles.includes('superadmin')) {
      whereClause.UserID = req.user.userId;
    } else if (userId) {
      whereClause.UserID = userId;
    }

    // Add search conditions
    if (search) {
      whereClause = {
        ...whereClause,
        [Op.or]: [
          { Title: { [Op.like]: `%${search}%` } },
          { Description: { [Op.like]: `%${search}%` } }
        ]
      };
    }

    console.log('Where clause:', whereClause);

    const { count, rows } = await LectureMaterial.findAndCountAll({
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
    
    console.log('Found materials:', count);

    res.status(200).json({
      currentPage: page,
      totalPages,
      totalItems: count,
      itemsPerPage: limit,
      items: rows
    });
  } catch (error) {
    console.error('Error getting lecture materials:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteLectureMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const lecture = await LectureMaterial.findOne({ 
      where: { LectureID: id, UserID: req.user.userId } 
    });

    if (!lecture) {
      return res.status(404).json({ error: 'Lecture material not found' });
    }

    if (lecture.FilePath) {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: lecture.FilePath
      }));
    }

    await lecture.destroy();
    res.status(200).json({ message: 'Lecture material deleted successfully' });
  } catch (error) {
    console.error('Error deleting lecture material:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}; 