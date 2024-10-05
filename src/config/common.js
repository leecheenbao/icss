// 引用所需的套件
const dotenv = require('dotenv');
const path = require('path');
const moment = require('moment-timezone');
const jwt = require('jsonwebtoken');

// 加載共用配置
dotenv.config({ path: path.resolve(process.cwd())});

// 根據 NODE_ENV 加載相應的環境文件
const envFile = `.env.${process.env.NODE_ENV || 'local'}`;
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// 設置時區
const timezone = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;

// 目前時間 (yyyy-mm-dd hh:mm:ss)
const now = moment().tz(timezone).format('YYYY-MM-DD HH:mm:ss');

// JWT 配置
const JWT_SECRET = process.env.JWT_SECRET || 'ICSS_SECRET'; // 確保將其設置為一個安全的密鑰
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';      // Token 有效期

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

module.exports = {
    timezone,
    now,
    JWT_SECRET,
    JWT_EXPIRES_IN,
    generateToken,
};