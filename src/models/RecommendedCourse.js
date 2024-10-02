const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RecommendedCourse = sequelize.define('RecommendedCourse', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '推薦課程的唯一識別碼'
  },
  user_id: {
    type: DataTypes.INTEGER,
    comment: '推薦課程的員工ID，關聯至users表'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '員工推薦課程的標題'
  },
  description: {
    type: DataTypes.TEXT,
    comment: '員工推薦課程的描述及內容介紹'
  },
  instructor: {
    type: DataTypes.STRING(100),
    comment: '員工推薦的講師'
  },
  status: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '推薦課程的審核狀態，0:pending 1:reviewed 2:approved 3:rejected'
  },
  image_url: {
    type: DataTypes.STRING(255),
    comment: '推薦課程的圖片URL'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '推薦課程建立時間'
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '推薦課程資料最近更新時間'
  }
}, {
  tableName: 'recommended_courses',
  timestamps: false
});

module.exports = RecommendedCourse;