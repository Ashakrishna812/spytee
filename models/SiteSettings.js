const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SiteSettings = sequelize.define('SiteSettings', {
  logoUrl: { type: DataTypes.STRING, defaultValue: '' },
  faviconUrl: { type: DataTypes.STRING, defaultValue: '' },
  siteName: { type: DataTypes.STRING, defaultValue: 'SPYTEE TECH' },
  homepageId: { type: DataTypes.STRING, defaultValue: '' },
  homepageType: { type: DataTypes.STRING, defaultValue: '' },
  colorTheme: {
    type: DataTypes.JSON,
    defaultValue: {
      primary: '#6366F1', secondary: '#8B5CF6', accent: '#EC4899',
      background: '#F8FAFC', surface: '#FFFFFF', text: '#0F172A', textMuted: '#94A3B8',
    },
  },
  fontSettings: {
    type: DataTypes.JSON,
    defaultValue: {
      headingFont: 'Inter', bodyFont: 'Inter', headingWeight: 700,
      bodyWeight: 400, baseFontSize: 16, lineHeight: 1.6,
    },
  },
  customCSS: { type: DataTypes.TEXT, defaultValue: '' },
  vapidPublicKey: { type: DataTypes.STRING, defaultValue: '' },
  vapidPrivateKey: { type: DataTypes.STRING, defaultValue: '' },
}, {
  tableName: 'sitesettings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = SiteSettings;
