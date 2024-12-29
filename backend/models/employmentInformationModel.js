const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const EmploymentInformation = sequelize.define('EmploymentInformation', {
  EmploymentID: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  UserID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'UserID',
    },
  },
  AnnualSalary: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  SalaryGradeStep: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  RatePerHour: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  DateOfLastPromotion: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  InitialYearOfTeaching: {
    type: DataTypes.INTEGER,
    allowNull: true,
  }
}, {
  tableName: 'employment_information',
  timestamps: true,
});

module.exports = EmploymentInformation;
