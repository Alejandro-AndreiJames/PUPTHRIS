const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const Book = require('../models/bookModel');
const s3Client = require('../config/s3.config');
const { S3_BUCKET_NAME, AWS_REGION } = process.env;
const User = require('../models/userModel');

const storage = multer.memoryStorage();
const upload = multer({ storage });

exports.addBook = [
  upload.single('document'),
  async (req, res) => {
    try {
      // Debug log
      console.log('Received book data:', req.body);
      
      const bookData = {
        ...req.body,
        UserID: req.user.userId
      };

      // Debug log
      console.log('Processed book data:', bookData);
      
      // Handle file upload to S3 if a file is provided
      if (req.file) {
        const fileName = `books/${Date.now()}_${req.file.originalname}`;
        const params = {
          Bucket: S3_BUCKET_NAME,
          Key: fileName,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        };

        await s3Client.send(new PutObjectCommand(params));
        bookData.DocumentPath = `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${fileName}`;
      }

      const newBook = await Book.create(bookData);
      res.status(201).json(newBook);
    } catch (error) {
      console.error('Error adding book:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
];

exports.updateBook = [
  upload.single('document'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const book = await Book.findOne({ 
        where: { BookID: id, UserID: req.user.userId } 
      });

      if (!book) {
        return res.status(404).json({ error: 'Book not found' });
      }

      // Handle file upload if new file is provided
      if (req.file) {
        // Delete old file from S3 if it exists
        if (book.DocumentPath) {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: book.DocumentPath
          }));
        }

        // Upload new file
        const fileName = `books/${Date.now()}_${req.file.originalname}`;
        await s3Client.send(new PutObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: fileName,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        }));
        updates.DocumentPath = `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${fileName}`;
      }

      await book.update(updates);
      res.status(200).json(book);
    } catch (error) {
      console.error('Error updating book:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
];

exports.getBooks = async (req, res) => {
  try {
    const { userId } = req.params;
    const userRoles = req.user.roles;
    
    const isAdminOrSuperAdmin = userRoles.some(role => 
      ['admin', 'superadmin'].includes(role.toLowerCase())
    );

    let whereClause = {};
    
    if (!isAdminOrSuperAdmin) {
      whereClause.UserID = req.user.userId;
    } else if (userId) {
      whereClause.UserID = userId;
    }

    const books = await Book.findAll({ 
      where: whereClause,
      include: [{
        model: User,
        attributes: ['UserID', 'Email'],
        include: [{
          model: BasicDetails,
          attributes: ['FirstName', 'LastName']
        }]
      }],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json(books);
  } catch (error) {
    console.error('Error getting books:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findOne({ 
      where: { BookID: id, UserID: req.user.userId } 
    });

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Delete file from S3 if it exists
    if (book.DocumentPath) {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: book.DocumentPath
      }));
    }

    await book.destroy();
    res.status(200).json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}; 