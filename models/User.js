const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  phone: { type: DataTypes.STRING, defaultValue: '' },
  googleId: { type: DataTypes.STRING, defaultValue: '' },
  avatar: { type: DataTypes.STRING, defaultValue: '' },
  role: { type: DataTypes.ENUM('student', 'admin'), defaultValue: 'student' },
  studentId: { type: DataTypes.STRING, unique: true, allowNull: true },
  isBanned: { type: DataTypes.BOOLEAN, defaultValue: false },
  activeSessionId: { type: DataTypes.STRING, defaultValue: '' },
  lastActiveAt: { type: DataTypes.DATE, allowNull: true },
  enrolledCourses: { type: DataTypes.JSON, defaultValue: [] },
  wishlist: { type: DataTypes.JSON, defaultValue: [] },
  bio: { type: DataTypes.TEXT, defaultValue: '' },
  jobTitle: { type: DataTypes.STRING, defaultValue: '' },
  socialLinks: {
    type: DataTypes.JSON,
    defaultValue: { facebook: '', twitter: '', linkedin: '' },
  },
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

User.generateStudentId = async function () {
  let studentId;
  let exists = true;
  while (exists) {
    studentId = String(Math.floor(10000000 + Math.random() * 90000000));
    const found = await this.findOne({ where: { studentId } });
    exists = !!found;
  }
  return studentId;
};

module.exports = User;
