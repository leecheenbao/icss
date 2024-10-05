const nodemailer = require('nodemailer');

// 加載共用配置
dotenv.config({ path: path.resolve(process.cwd())});

// 根據 NODE_ENV 加載相應的環境文件
const envFile = `.env.${process.env.NODE_ENV || 'local'}`;
dotenv.config({ path: path.resolve(process.cwd(), envFile) });
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // 使用 TLS
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

module.exports = transporter;