const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');
const User = require('./userModel');

const ResearchPaper = sequelize.define('ResearchPaper', {
  ResearchID: {
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
  Authors: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  PublicationDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  ReferenceLink: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  DocumentPath: {
    type: DataTypes.STRING(500),
    allowNull: true
  }
});

module.exports = ResearchPaper; 