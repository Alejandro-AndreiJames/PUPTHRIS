const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const AcademicPeriod = sequelize.define('AcademicPeriod', {
  PeriodID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  AcademicYear: {
    type: DataTypes.STRING(9),
    allowNull: false,
    validate: {
      is: /^\d{4}-\d{4}$/ // Format: 2024-2025
    }
  },
  Semester: {
    type: DataTypes.ENUM('First Semester', 'Second Semester'),
    allowNull: false
  },
  IsActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'academic_periods',
  timestamps: true
});

module.exports = AcademicPeriod;
