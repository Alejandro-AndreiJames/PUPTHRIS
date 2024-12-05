const multer = require('multer');
const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const LectureMaterial = require('../models/lectureMaterialModel');
const s3Client = require('../config/s3.config');
const { S3_BUCKET_NAME } = process.env;

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
    const userId = req.params.userId || req.user.userId;
    const materials = await LectureMaterial.findAll({ 
      where: { UserID: userId },
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json(materials);
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