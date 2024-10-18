const dotenv = require('dotenv');
const path = require('path');
const { Sequelize } = require('sequelize');

// 加載共用配置
dotenv.config({ path: path.resolve(process.cwd())});

// 根據 NODE_ENV 加載相應的環境文件
const envFile = `.env.${process.env.NODE_ENV || 'local'}`;
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const sequelize = new Sequelize(
  process.env.DB_NAME, 
  process.env.DB_USER, 
  process.env.DB_PASS, 
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    port: process.env.DB_PORT,
    logging: true, // 完全禁用日誌
    timezone: '+08:00', // 設置為 UTC+8
    dialectOptions: {
      timezone: '+08:00'
    }
});

module.exports = sequelize;
