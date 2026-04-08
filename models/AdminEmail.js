const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AdminEmail = sequelize.define('AdminEmail', {
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  addedBy: { type: DataTypes.STRING, defaultValue: 'system' },
}, {
  tableName: 'adminemails',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = AdminEmail;
