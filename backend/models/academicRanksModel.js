const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const User = require('./userModel');

const AcademicRank = sequelize.define('AcademicRank', {
  AcademicRankID: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  UserID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true, // Ensure only one rank per user
    references: {
      model: User,
      key: 'UserID',
    },
  },
  Rank: {
    type: DataTypes.ENUM(
      'Instructor I', 'Instructor II', 'Instructor III',
      'Assistant Professor I', 'Assistant Professor II', 'Assistant Professor III', 'Assistant Professor IV',
      'Associate Professor I', 'Associate Professor II', 'Associate Professor III', 'Associate Professor IV', 'Associate Professor V',
      'Professor I', 'Professor II', 'Professor III', 'Professor IV', 'Professor V', 'Professor VI'
    ),
    allowNull: false,
  },
  UpdatedAt: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    allowNull: false,
  },
}, {
  tableName: 'academicranks',
  timestamps: true,
  updatedAt: 'UpdatedAt',
  createdAt: false, // We don't need CreatedAt since we're only tracking the current rank
});

module.exports = AcademicRank;