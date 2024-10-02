const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PointsTransaction = sequelize.define('PointsTransaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '點數交易的唯一識別碼'
  },
  user_id: {
    type: DataTypes.INTEGER,
    comment: '點數交易涉及的員工ID，關聯至users表'
  },
  points: {
    type: DataTypes.INTEGER,
    comment: '此次交易增加或減少的點數數量'
  },
  transaction_type: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '點數交易類型，1:add為增加，2:deduct為扣除，3:refund為退還'
  },
  description: {
    type: DataTypes.TEXT,
    comment: '點數交易描述，描述交易原因或詳情'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '點數交易建立時間'
  }
}, {
  tableName: 'points_transactions',
  timestamps: false
});

module.exports = PointsTransaction;