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
  }
}, {
  tableName: 'professional_licenses',
  timestamps: true,
});

module.exports = ProfessionalLicense;
