const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');
const User = require('./userModel');

const ObservationSchedule = sequelize.define('ObservationSchedule', {
  ScheduleID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  FacultyID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'UserID'
    }
  },
  Topic: {
    type: DataTypes.STRING,
    allowNull: false
  },
  Subject: {
    type: DataTypes.STRING,
    allowNull: false
  },
  RoomNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  ScheduledDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  StartTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  EndTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  Status: {
    type: DataTypes.ENUM('pending', 'approved', 'completed', 'cancelled'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'observation_schedules',
  timestamps: true
});

module.exports = ObservationSchedule;
