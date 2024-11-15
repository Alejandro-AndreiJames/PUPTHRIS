const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const EvaluationScore = sequelize.define('EvaluationScore', {
  ScoreID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  EvaluationID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'faculty_evaluations',
      key: 'EvaluationID'
    }
  },
  CriteriaID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'evaluation_criteria',
      key: 'CriteriaID'
    }
  },
  Score: {
    type: DataTypes.DECIMAL(6, 4),
    allowNull: false,
    validate: {
      min: 0,
      max: 100
    }
  }
}, {
  tableName: 'evaluation_scores',
  timestamps: true
});

module.exports = EvaluationScore;
