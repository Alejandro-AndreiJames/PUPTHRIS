const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');
const User = require('./userModel');

const LectureMaterial = sequelize.define('LectureMaterial', {
  LectureID: {
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
  Description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ReferenceLink: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  FilePath: {
    type: DataTypes.STRING(500),
    allowNull: true
  }
});

module.exports = LectureMaterial; 