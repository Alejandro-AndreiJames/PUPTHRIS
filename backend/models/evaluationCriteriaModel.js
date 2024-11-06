const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const EvaluationCriteria = sequelize.define('EvaluationCriteria', {
  CriteriaID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  CriteriaName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  Description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  Weight: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    validate: {
      min: 0,
      max: 100
    }
  }
}, {
  tableName: 'evaluation_criteria',
  timestamps: true
});

module.exports = EvaluationCriteria;
