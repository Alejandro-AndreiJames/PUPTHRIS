const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');
const User = require('./userModel');

const ObservationSchedule = sequelize.define('ObservationSchedule', {
  ScheduleID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
    type: DataTypes.DATE,
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
  AcademicYear: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      is: /^\d{4}-\d{4}$/
    }
  },
  Semester: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['First Semester', 'Second Semester']]
    }
  },
  Status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Pending',
    validate: {
      isIn: [['Pending', 'Completed', 'Cancelled']]
    }
  },
  EvaluationID: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'faculty_evaluations',
      key: 'EvaluationID'
    }
  },
  FacultyID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'UserID'
    }
  }
}, {
  tableName: 'observation_schedules',
  timestamps: true
});

module.exports = ObservationSchedule;
