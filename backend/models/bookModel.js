const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');
const User = require('./userModel');

const Book = sequelize.define('Book', {
  BookID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  UserID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'UserID'
    }
  },
  Title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  Author: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  ISBN: {
    type: DataTypes.STRING(13),
    allowNull: true,
    validate: {
      isNumeric: true,
      len: [10, 13]
    }
  },
  Description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

module.exports = Book; 