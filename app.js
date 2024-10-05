const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();
const sequelize = require('./src/config/database');
const bcrypt = require('bcrypt');
const models = require('./src/models');
const authRoutes = require('./src/route_api/01_authRoutes');
const courseRoutes = require('./src/route_api/02_courseRoutes');
const userRoutes = require('./src/route_api/03_userRoutes');
const app = express();
const PORT = process.env.MAIN_NODE_PORT;
const BASE_URL = process.env.BASE_URL;

// 中間件
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(cors());

// 設置視圖引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 路由
app.use(BASE_URL + '/auth', authRoutes);
app.use(BASE_URL + '/courses', courseRoutes);
app.use(BASE_URL + '/users', userRoutes);

// 數據庫同步和服務器啟動
(async () => {
  try {
    await sequelize.authenticate();
    console.log('數據庫連接成功。');

    await sequelize.sync({ alter: false });
    console.log('數據庫模型同步成功。');

    app.listen(PORT, () => {
      console.log(`服務器運行在端口 ${PORT}`);
    });

    // 建立會員admin初始帳號
    const admin = await models.User.findOne({ where: { email: 'admin@admin.com' } });
    const password = '111111';
    const passwordHash = await bcrypt.hash(password, 10);

    if (!admin) {
      console.log('建立會員admin初始帳號');
      await models.User.create({
        username: 'admin',
        email: 'admin@admin.com',
        passwordHash: passwordHash,
        name: 'admin',
      });
      console.log('會員admin初始帳號建立成功');
    }
    
  } catch (error) {
    console.error('無法連接到數據庫:', error);
  }
})();
