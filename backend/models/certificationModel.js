const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const Certification = sequelize.define('Certification', {
  CertificationID: {
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
  Name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  IssuingOrganization: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  IssueDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  ExpirationDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  CredentialID: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  CredentialURL: {
    type: DataTypes.STRING(255),
    allowNull: true,
  }
}, {
  tableName: 'certifications',
  timestamps: true,
});

module.exports = Certification;
