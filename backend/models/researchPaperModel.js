const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const ResearchPaper = sequelize.define('ResearchPaper', {
  ResearchID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  UserID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    // Removed references to avoid duplicate constraints
  },
  Title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  Description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  Authors: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  PublicationDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  ReferenceLink: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  DocumentPath: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  FileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  }
}, {
  tableName: 'ResearchPapers',
  timestamps: true,
  indexes: [
    {
      name: 'research_user_fk',
      fields: ['UserID']
    }
  ]
});

module.exports = ResearchPaper;