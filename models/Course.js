const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Course = sequelize.define('Course', {
  courseName: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  shortDescription: { type: DataTypes.TEXT, defaultValue: '' },
  thumbnail: { type: DataTypes.STRING, defaultValue: '' },
  category: { type: DataTypes.STRING, defaultValue: 'General' },
  level: { type: DataTypes.ENUM('Beginner', 'Intermediate', 'Advanced'), defaultValue: 'Beginner' },
  duration: { type: DataTypes.STRING, defaultValue: '' },
  instructor: {
    type: DataTypes.JSON,
    defaultValue: { name: '', avatar: '', bio: '', title: '' },
  },
  rating: { type: DataTypes.DECIMAL(3, 1), defaultValue: 0 },
  ratingCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  contents: { type: DataTypes.JSON, defaultValue: [] },
  materials: { type: DataTypes.JSON, defaultValue: [] },
  tags: { type: DataTypes.JSON, defaultValue: [] },
  audience: { type: DataTypes.JSON, defaultValue: [] },
  requirements: { type: DataTypes.JSON, defaultValue: [] },
  includes: { type: DataTypes.JSON, defaultValue: [] },
  price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  enrolledCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  isPublished: { type: DataTypes.BOOLEAN, defaultValue: true },
  fieldVisibility: {
    type: DataTypes.JSON,
    defaultValue: {
      level: true, duration: true, thumbnail: true, category: true,
      shortDescription: true, instructor: true, materials: true, tags: true,
      audience: true, requirements: true, includes: true, price: true,
    },
  },
  reviews: { type: DataTypes.JSON, defaultValue: [] },
  lessonComments: { type: DataTypes.JSON, defaultValue: [] },
}, {
  tableName: 'courses',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeSave: async (course) => {
      if (course.changed('materials') && course.materials && course.materials.length > 0) {
        for (let mat of course.materials) {
          if (!mat.code) {
            let code;
            let exists = true;
            while (exists) {
              code = String(Math.floor(10000 + Math.random() * 90000));
              const found = await Course.findOne({
                where: sequelize.literal(`JSON_CONTAINS(materials, '{"code":"${code}"}')`),
              });
              const selfHas = course.materials.some(m => m.code === code && m !== mat);
              exists = !!(found || selfHas);
            }
            mat.code = code;
          }
        }
      }
    },
  },
});

module.exports = Course;
