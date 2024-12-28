const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const Department = sequelize.define('Department', {
  DepartmentID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  DepartmentName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  Description: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  CoordinatorID: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'UserID'
    }
  },
  CollegeCampusID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'collegecampuses',
      key: 'CollegeCampusID'
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
  }
}, {
  tableName: 'departments',
  timestamps: true
});

module.exports = Department;
