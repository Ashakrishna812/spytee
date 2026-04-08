const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Page = sequelize.define('Page', {
  title: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, allowNull: false, unique: true },
  status: { type: DataTypes.ENUM('draft', 'published'), defaultValue: 'draft' },
  layout: { type: DataTypes.JSON, defaultValue: [] },
  seo: {
    type: DataTypes.JSON,
    defaultValue: {
      title: '', description: '', keywords: '', ogImage: '',
      canonicalUrl: '', noIndex: false, noFollow: false,
    },
  },
}, {
  tableName: 'pages',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [{ fields: ['slug'] }],
});

module.exports = Page;
