const Book = require('../models/bookModel');

exports.addBook = async (req, res) => {
  try {
    const bookData = {
      ...req.body,
      UserID: req.user.userId
    };
    const newBook = await Book.create(bookData);
    res.status(201).json(newBook);
  } catch (error) {
    console.error('Error adding book:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const book = await Book.findOne({ 
      where: { BookID: id, UserID: req.user.userId } 
    });

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    await book.update(updates);
    res.status(200).json(book);
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getBooks = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.userId;
    const books = await Book.findAll({ 
      where: { UserID: userId },
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

    await book.destroy();
    res.status(200).json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}; 