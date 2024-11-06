const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

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
  PeriodID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'academic_periods',
      key: 'PeriodID'
    }
  },
  CourseSection: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  NumberOfRespondents: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  TotalScore: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    validate: {
      min: 0,
      max: 100
    }
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
