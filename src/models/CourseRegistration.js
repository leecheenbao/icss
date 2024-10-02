const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CourseRegistration = sequelize.define('CourseRegistration', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '課程報名的唯一識別碼'
  },
  user_id: {
    type: DataTypes.INTEGER,
    comment: '報名員工的ID，關聯至users表'
  },
  course_id: {
    type: DataTypes.INTEGER,
    comment: '報名的課程ID，關聯至courses表'
  },
  registration_status: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '報名狀態，0:upcoming 1:closed 2:canceled'
  },
  points_deducted: {
    type: DataTypes.INTEGER,
    comment: '為報名扣除的點數'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '報名建立時間'
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '報名資料最近更新時間'
  }
}, {
  tableName: 'course_registrations',
  timestamps: false
});

module.exports = CourseRegistration;