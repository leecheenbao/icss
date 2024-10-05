const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { COMMON_RESPONSE_CODE, COMMON_RESPONSE_MESSAGE, USER_ROLE } = require('../enum/commonEnum');

// 建立權限回應
const authResponse = (res, status, message) => {
  return res.status(status).json({ message });
};

// 驗證token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return authResponse(res, COMMON_RESPONSE_CODE.TOKEN_INVALID, "缺少 Token");
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {

    if (!user) {
      return authResponse(res, COMMON_RESPONSE_CODE.SUCCESS, "尚未登入");
    }
    if (user.role === USER_ROLE.BANNED) {
      return authResponse(res, COMMON_RESPONSE_CODE.SUCCESS, "用戶已被停用");
    }
    if (err) {
      return authResponse(res, COMMON_RESPONSE_CODE.INTERNAL_SERVER_ERROR, "Token 無效");
    }
    req.user = user;
    next();
  });
};

// 驗證權限
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (user.role === USER_ROLE.USER) {
      return authResponse(res, COMMON_RESPONSE_CODE.SUCCESS, "權限不足");
    } else if (user.role === USER_ROLE.BANNED) {
      return authResponse(res, COMMON_RESPONSE_CODE.SUCCESS, "用戶已被停用");
    }
    next();
  } catch (error) {
    console.error("判斷權限時發生錯誤:", error);
    return authResponse(res, COMMON_RESPONSE_CODE.INTERNAL_SERVER_ERROR, "伺服器錯誤");
  }
};

module.exports = { authenticateToken, isAdmin };