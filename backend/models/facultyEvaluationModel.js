const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const FacultyEvaluation = sequelize.define('FacultyEvaluation', {
  EvaluationID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  FacultyID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'UserID'
    }
  },
  EvaluatorID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'UserID'
    }
  },
  AcademicYear: {
    type: DataTypes.STRING(9),
    allowNull: false,
    validate: {
      is: /^\d{4}-\d{4}$/
    }
  },
  Semester: {
    type: DataTypes.ENUM('First Semester', 'Second Semester'),
    allowNull: false
  },
  CourseSection: {
    type: DataTypes.STRING,
    allowNull: false
  },
  NumberOfRespondents: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  TotalScore: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  QualitativeRating: {
    type: DataTypes.ENUM('Poor', 'Fair', 'Satisfactory', 'Very Satisfactory', 'Outstanding'),
    allowNull: false
  },
  CreatedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'UserID'
    }
  }
}, {
  tableName: 'faculty_evaluations',
  timestamps: true
});

module.exports = FacultyEvaluation;
