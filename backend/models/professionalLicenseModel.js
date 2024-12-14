const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const ProfessionalLicense = sequelize.define('ProfessionalLicense', {
  LicenseID: {
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
  ProfessionalLicenseEarned: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  YearObtained: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  ExpirationDate: {
    type: DataTypes.DATE,
    allowNull: true,
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
  tableName: 'professional_licenses',
  timestamps: true,
});

module.exports = ProfessionalLicense;
