const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  'SPYTEE-35337b6e',
  'SPYTEE',
  'Lk8121@Lk8121',
  {
    host: 'mysql.gb.stackcp.com',
    port: 43078,
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
