const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '通知的唯一識別碼'
  },
  user_id: {
    type: DataTypes.INTEGER,
    comment: '接收通知的員工ID，關聯至users表'
  },
  message: {
    type: DataTypes.TEXT,
    comment: '通知內容，包含點數變更或課程報名成功等訊息'
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '通知是否已讀，預設為未讀'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '通知建立時間'
  }
}, {
  tableName: 'notifications',
  timestamps: false
});

module.exports = Notification;