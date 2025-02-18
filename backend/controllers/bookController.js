const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const Book = require('../models/bookModel');
const s3Client = require('../config/s3.config');
const { S3_BUCKET_NAME, AWS_REGION } = process.env;
const User = require('../models/userModel');
const BasicDetails = require('../models/basicDetailsModel');
const { Op } = require('sequelize');
const checkStorageLimit = require('../middleware/uploadLimitMiddleware');

const storage = multer.memoryStorage();
const upload = multer({ storage });

exports.addBook = [
  upload.single('document'),
  checkStorageLimit,
  async (req, res) => {
    try {
      // Debug log
      console.log('Received book data:', req.body);
      
      const bookData = {
        ...req.body,
        UserID: req.user.userId,
        FileSize: req.file ? req.file.size : 0
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
        bookData.DocumentPath = fileName;
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
  checkStorageLimit,
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
        updates.DocumentPath = fileName;
        updates.FileSize = req.file.size;
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
      // In personal view, only show user's own books
      whereClause.UserID = req.user.userId;
    } else {
      // In all view, show books from users of the selected campus
      if (!selectedCampusId) {
        return res.status(400).json({ 
          error: 'Campus ID is required for viewing all books' 
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
          { Author: { [Op.like]: `%${search}%` } },
          { Description: { [Op.like]: `%${search}%` } }
        ]
      };
    }

    console.log('Where clause:', whereClause);
    console.log('User where clause:', userWhereClause);

    const { count, rows } = await Book.findAndCountAll({
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
    console.error('Error getting books:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      details: error.message 
    });
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
