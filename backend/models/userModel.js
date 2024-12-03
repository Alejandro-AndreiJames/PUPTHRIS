// userModel.js
const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');
const Department = require('./departmentModel');


const User = sequelize.define('User', {
  UserID: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  Fcode: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  PasswordHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  Salt: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  Email: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  EmploymentType: {
    type: DataTypes.ENUM('fulltime', 'parttime', 'temporary', 'designee'),
    allowNull: false,
  },
  DepartmentID: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Department, 
      key: 'DepartmentID',
    },
  },
  Surname: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  FirstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  MiddleName: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  NameExtension: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  CreatedAt: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    allowNull: false,
  },
  resetPasswordToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  CollegeCampusID: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'collegecampuses',
      key: 'CollegeCampusID',
    },
  },
}, {
  tableName: 'users',
  timestamps: false,
});

// Add a method to toggle user active status
User.prototype.toggleActiveStatus = async function() {
  this.isActive = !this.isActive;
  return await this.save();
};

// Add this method before module.exports
User.prototype.toExternalFormat = function() {
  return {
    id: this.UserID,
    code: this.Fcode,
    status: this.isActive ? 'Active' : 'Inactive',
    last_name: this.Surname,
    first_name: this.FirstName,
    middle_name: this.MiddleName || null,
    suffix_name: this.NameExtension || null,
    email: this.Email,
    type: this.EmploymentType.toLowerCase(),
    password: this.PasswordHash  // Note: You might want to handle this differently for security
  };
};

module.exports = User;
