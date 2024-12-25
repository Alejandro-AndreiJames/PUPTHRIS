const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const Ticket = sequelize.define('Ticket', {
  TicketID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  UserID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'UserID'
    }
  },
  Subject: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  Description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  Status: {
    type: DataTypes.ENUM('open', 'in-progress', 'resolved', 'closed'),
    defaultValue: 'open'
  },
  Priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium'
  },
  Response: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  RespondedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'UserID'
    }
  }
}, {
  tableName: 'tickets',
  timestamps: true,
  createdAt: 'CreatedAt',
  updatedAt: 'UpdatedAt'
});

module.exports = Ticket;
