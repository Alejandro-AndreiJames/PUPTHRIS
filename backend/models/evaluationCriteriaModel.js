const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const EvaluationCriteria = sequelize.define('EvaluationCriteria', {
  CriteriaID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  Category: {
    type: DataTypes.ENUM(
      'Instruction and Discussion Facilitation',
      'Commitment',
      'Teaching for Independent Learning',
      'Use of Instructional Materials'
    ),
    allowNull: false
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
  },
  CategoryDescription: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: function() {
      switch(this.Category) {
        case 'Instruction and Discussion Facilitation':
          return 'Instruction and discussion facilitation refer to sharing control and direction with students.';
        case 'Commitment':
          return 'Commitment refers to the course specialist act or quality of fulfilling responsibility giving the dedication, discipline, maturity for the learners development and advancement';
        case 'Teaching for Independent Learning':
          return 'Teaching for independent learning pertains to the course specialist\'s ability to organize teaching-learning process to enable learners to maximize their potentials';
        case 'Use of Instructional Materials':
          return 'Use of instructional materials and other educational resources to help maximize learning';
        default:
          return '';
      }
    }
  }
}, {
  tableName: 'evaluation_criteria',
  timestamps: true
});

module.exports = EvaluationCriteria;
