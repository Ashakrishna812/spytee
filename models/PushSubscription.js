const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PushSubscription = sequelize.define('PushSubscription', {
  endpoint: { type: DataTypes.STRING, allowNull: false, unique: true },
  keys: { type: DataTypes.JSON, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  ipAddress: { type: DataTypes.STRING, allowNull: true },
  userAgent: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: 'pushsubscriptions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = PushSubscription;
