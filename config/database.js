const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'SPYTEE-35337b6e',
  process.env.DB_USER || 'SPYTEE',
  process.env.DB_PASS || 'Lk8121@Lk8121',
  {
    host: (!process.env.DB_HOST || process.env.DB_HOST === 'localhost' || process.env.DB_HOST === 'spyteetech.site') ? 'shareddb-b.hosting.stackcp.net' : process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: true,
    },
  }
);

module.exports = sequelize;
