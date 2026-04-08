const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Admission = sequelize.define('Admission', {
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  courseId: { type: DataTypes.INTEGER, allowNull: false },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
    defaultValue: 'pending',
  },
  materialAssigned: { type: DataTypes.STRING, defaultValue: '' },
  materialDescription: { type: DataTypes.STRING, defaultValue: '' },
  studentIdNumber: { type: DataTypes.STRING, defaultValue: '' },
  appliedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  processedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'admissions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = Admission;
