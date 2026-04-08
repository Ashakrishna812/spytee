const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  title: { type: DataTypes.STRING, allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  type: { type: DataTypes.ENUM('web', 'device'), defaultValue: 'web' },
  targetType: { type: DataTypes.ENUM('all', 'specific'), defaultValue: 'all' },
  targetUsers: { type: DataTypes.JSON, defaultValue: [] },
  status: { type: DataTypes.ENUM('draft', 'sent'), defaultValue: 'draft' },
  sentAt: { type: DataTypes.DATE, allowNull: true },
  sentCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  failedCount: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'notifications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Notification;
