const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Course = sequelize.define('Course', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '課程唯一ID'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '課程標題'
  },
  description: {
    type: DataTypes.TEXT,
    comment: '課程描述'
  },
  instructor: {
    type: DataTypes.STRING(100),
    comment: '講者姓名'
  },
  course_date: {
    type: DataTypes.DATE,
    comment: '課程日期'
  },
  image_url: {
    type: DataTypes.STRING,
    comment: '課程圖片網址'
  },
  max_participants: {
    type: DataTypes.INTEGER,
    comment: '最大報名人數'
  },
  sign_up_start_date: {
    type: DataTypes.DATE,
    comment: '報名開始日期'
  },
  sign_up_end_date: {
    type: DataTypes.DATE,
    comment: '報名截止日期'
  },
  status: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '課程狀態 0:draft 1:publish 2:closed'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '創建時間'
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '最後更新時間'
  }
}, {
  tableName: 'courses',
  timestamps: false
});

module.exports = Course;