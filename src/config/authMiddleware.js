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

  if (token == null) return authResponse(res, COMMON_RESPONSE_CODE.TOKEN_INVALID, COMMON_RESPONSE_MESSAGE.TOKEN_REQUIRED);
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {

    console.log(">>>>> role:", user.username, user.role);
    if (user.role === USER_ROLE.BANNED) {
      return authResponse(res, COMMON_RESPONSE_CODE.SUCCESS, COMMON_RESPONSE_MESSAGE.USER_BANNED);
    }
    if (err) {
      return authResponse(res, COMMON_RESPONSE_CODE.INTERNAL_SERVER_ERROR, COMMON_RESPONSE_MESSAGE.TOKEN_INVALID);
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
      return authResponse(res, COMMON_RESPONSE_CODE.SUCCESS, COMMON_RESPONSE_MESSAGE.FORBIDDEN);
    } else if (user.role === USER_ROLE.BANNED) {
      return authResponse(res, COMMON_RESPONSE_CODE.SUCCESS, COMMON_RESPONSE_MESSAGE.USER_BANNED);
    }
    next();
  } catch (error) {
    console.error("判斷權限時發生錯誤:", error);
    return authResponse(res, COMMON_RESPONSE_CODE.INTERNAL_SERVER_ERROR, COMMON_RESPONSE_MESSAGE.INTERNAL_SERVER_ERROR);
  }
};

module.exports = { authenticateToken, isAdmin };