require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  dialect: process.env.DB_DIALECT,
  port: process.env.DB_PORT,
  logging: false, // 完全禁用日誌
  timezone: '+08:00', // 設置為 UTC+8
  dialectOptions: {
    // dateStrings: true,
    // typeCast: true,
    timezone: '+08:00'
  }
});

module.exports = sequelize;
