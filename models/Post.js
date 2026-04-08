const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Post = sequelize.define('Post', {
  title: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, allowNull: false, unique: true },
  status: { type: DataTypes.ENUM('draft', 'published'), defaultValue: 'draft' },
  excerpt: { type: DataTypes.TEXT, defaultValue: '' },
  featuredImage: { type: DataTypes.STRING, defaultValue: '' },
  layout: { type: DataTypes.JSON, defaultValue: [] },
  seo: {
    type: DataTypes.JSON,
    defaultValue: {
      title: '', description: '', keywords: '', ogImage: '',
      canonicalUrl: '', noIndex: false, noFollow: false,
    },
  },
}, {
  tableName: 'posts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [{ fields: ['slug'] }],
});

module.exports = Post;
