const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const Education = sequelize.define('Education', {
  EducationID: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  UserID: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'UserID',
    },
  },
  Level: {
    type: DataTypes.ENUM('Bachelors Degree', 'Post-Baccalaureate', 'Masters', 'Doctoral'),
    allowNull: false,
  },
  NameOfSchool: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  Course: {
    type: DataTypes.STRING(100),
    // Only for Bachelors Degree
  },
  ThesisType: {
    type: DataTypes.ENUM('Thesis', 'Non-Thesis'),
    // Only for Masters and Doctoral
  },
  MeansOfEducationSupport: {
    type: DataTypes.STRING(100),
    // For Post-Baccalaureate, Masters, and Doctoral
  },
  FundingAgency: {
    type: DataTypes.STRING(100),
    // For Post-Baccalaureate, Masters, and Doctoral
  },
  DurationOfFundingSupport: {
    type: DataTypes.STRING(50),
    // For Post-Baccalaureate, Masters, and Doctoral
  },
  UnitsEarned: {
    type: DataTypes.STRING(50),
    // Only for Doctoral
  },
  YearGraduated: {
    type: DataTypes.STRING(4),
    allowNull: false,
  },
}, {
  tableName: 'education',
  timestamps: false,
});

// You might want to add some model validation
Education.beforeValidate((education, options) => {
  // Validation based on education level
  switch (education.Level) {
    case 'Bachelors Degree':
      // Only allow specific fields for Bachelors
      if (!education.Course) throw new Error('Course is required for Bachelors Degree');
      // Clear irrelevant fields
      education.ThesisType = null;
      education.MeansOfEducationSupport = null;
      education.FundingAgency = null;
      education.DurationOfFundingSupport = null;
      education.UnitsEarned = null;
      break;

    case 'Post-Baccalaureate':
      // Clear irrelevant fields and validate required ones
      education.Course = null;
      education.ThesisType = null;
      education.UnitsEarned = null;
      break;

    case 'Masters':
      // Validate thesis type and clear irrelevant fields
      if (!education.ThesisType) throw new Error('Thesis type is required for Masters');
      education.Course = null;
      education.UnitsEarned = null;
      break;

    case 'Doctoral':
      // Validate thesis type and units earned
      if (!education.ThesisType) throw new Error('Thesis type is required for Doctoral');
      if (!education.UnitsEarned) throw new Error('Units earned is required for Doctoral');
      education.Course = null;
      break;
  }
});

module.exports = Education;
