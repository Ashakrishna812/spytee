const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SiteMenu = sequelize.define('SiteMenu', {
  name: { type: DataTypes.STRING, allowNull: false },
  location: {
    type: DataTypes.ENUM('header', 'footer', 'sidebar', 'none'),
    defaultValue: 'none',
  },
  items: { type: DataTypes.JSON, defaultValue: [] },
}, {
  tableName: 'sitemenus',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = SiteMenu;
