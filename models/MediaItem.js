const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MediaItem = sequelize.define('MediaItem', {
  filename: { type: DataTypes.STRING, allowNull: false },
  originalName: { type: DataTypes.STRING, allowNull: false },
  mimeType: { type: DataTypes.STRING, allowNull: false },
  size: { type: DataTypes.INTEGER, allowNull: false },
  url: { type: DataTypes.STRING, allowNull: false },
  folder: { type: DataTypes.STRING, defaultValue: 'general' },
  alt: { type: DataTypes.STRING, defaultValue: '' },
  uploadedBy: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'mediaitems',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = MediaItem;
