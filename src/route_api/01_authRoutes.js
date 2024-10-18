const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const emailConfig = require("../config/email");
const OTP_EMAIL = require("../templates/emails/OTP_EMAIL");
const models = require("../models");
const { now, generateToken } = require("../config/common");
const { generateOTP } = require("../utils/otpUtil");
const { authenticateToken, isAdmin } = require("../config/authMiddleware");
const { AUTH_MESSAGE, COMMON_RESPONSE_MESSAGE, USER_ROLE, COMMON_RESPONSE_CODE } = require("../enum/commonEnum");

/**
 * @api {post} /api/v1/auth/admin/register 01.註冊管理員角色
 * @apiName RegisterAdmin
 * @apiGroup 01.用戶認證和管理
 * @apiParam {String} username 用戶名
 * @apiParam {String} password 密碼
 * @apiParam {String} email 電子郵件
 * @apiSuccess {String} message 註冊成功消息
 * @apiError (400) BadRequest 請求參數錯誤
 * @apiError (500) InternalServerError 伺服器錯誤
 */
router.post("/admin/register", authenticateToken, isAdmin, async (req, res) => {
  const { username, password, email } = req.body;
  try {
    // 檢查用戶名是否已經存在
    const existingUser = await models.User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(COMMON_RESPONSE_CODE.SUCCESS).send({ message: AUTH_MESSAGE.USERNAME_EXIST });
    }

    // 檢查電子郵件是否已經存在
    const existingEmail = await models.User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(COMMON_RESPONSE_CODE.SUCCESS).send({ message: AUTH_MESSAGE.EMAIL_EXIST });
    }if (!username || !password || !email) {
      return res
        .status(COMMON_RESPONSE_CODE.SUCCESS)
        .send({ message: AUTH_MESSAGE.USERNAME_PASSWORD_EMAIL_REQUIRED });
    }

    // 加密密碼
    const hashedPassword = await bcrypt.hash(password, 10);
  
    // 創建新用戶
    const newUser = await models.User.create({
      username,
      passwordHash: hashedPassword,
      email,
      role: 1,
    });

    console.log("新增管理員角色成功", newUser.username);
    res.status(201).send({ message: AUTH_MESSAGE.USER_REGISTER_SUCCESS });

  } catch (error) {
    console.error(error);
    res.status(COMMON_RESPONSE_CODE.INTERNAL_SERVER_ERROR).send({ message: COMMON_RESPONSE_MESSAGE.INTERNAL_SERVER_ERROR });
  }
});


/**
 * @api {post} /api/v1/auth/register 02.一般用戶註冊
 * @apiName Register
 * @apiGroup 01.用戶認證和管理
 * @apiParam {String} username 用戶名
 * @apiParam {String} password 密碼
 * @apiParam {String} email 電子郵件
 * @apiSuccess {String} message 註冊成功消息
 * @apiError (400) BadRequest 請求參數錯誤
 * @apiError (500) InternalServerError 伺服器錯誤
 */
router.post("/register", async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res
      .status(COMMON_RESPONSE_CODE.SUCCESS)
      .send({ message: AUTH_MESSAGE.USERNAME_PASSWORD_EMAIL_REQUIRED });
  }

  try {
    // 檢查用戶名是否已經存在
    const existingUser = await models.User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(COMMON_RESPONSE_CODE.SUCCESS).send({ message: AUTH_MESSAGE.USERNAME_EXIST });
    }

    // 檢查電子郵件是否已經存在
    const existingEmail = await models.User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(COMMON_RESPONSE_CODE.SUCCESS).send({ message: AUTH_MESSAGE.EMAIL_EXIST });
    }

    // 加密密碼
    const hashedPassword = await bcrypt.hash(password, 10);

    // 創建新用戶
    const newUser = await models.User.create({
      username,
      passwordHash: hashedPassword,
      email,
      createdAt: now,
    });

    res.status(201).send({ message: AUTH_MESSAGE.USER_REGISTER_SUCCESS });
  } catch (error) {
    console.error(error);
    res.status(COMMON_RESPONSE_CODE.INTERNAL_SERVER_ERROR).send({ message: COMMON_MESSAGE.SERVER_ERROR });
  }
});

/**
 * @api {post} /api/v1/auth/login 03.用戶登入/管理員登入
 * @apiName AdminLogin
 * @apiGroup 01.用戶認證和管理
 * @apiParam {String} username 管理員用戶名
 * @apiParam {String} password 管理員密碼
 * @apiSuccess {String} token JWT token
 * @apiSuccess {String} message 登入成功消息
 * @apiError (400) BadRequest 用戶名或密碼錯誤
 * @apiError (500) InternalServerError 伺服器錯誤
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(COMMON_RESPONSE_CODE.SUCCESS)
      .send({ message: AUTH_MESSAGE.USERNAME_PASSWORD_REQUIRED });
  }

  try {
    // 查找用戶
    const user = await models.User.findOne({ where: { email } });
    if (!user) {
      return res.status(COMMON_RESPONSE_CODE.SUCCESS).send({ message: AUTH_MESSAGE.USERNAME_PASSWORD_INVALID });
    }

    if (user.role === USER_ROLE.BANNED) {
      return res.status(COMMON_RESPONSE_CODE.SUCCESS).send({ message: COMMON_RESPONSE_MESSAGE.USER_BANNED });
    }

    // 比較密碼
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(COMMON_RESPONSE_CODE.SUCCESS).send({ message: COMMON_RESPONSE_MESSAGE.USER_BANNED });
    }

    // 生成 JWT token
    const token = generateToken(user);

    // 更新最後登入時間
    await user.update({ lastLogin: now });

    // 登入成功
    res.status(COMMON_RESPONSE_CODE.SUCCESS).send({ token, message: AUTH_MESSAGE.USER_LOGIN_SUCCESS });
  } catch (error) {
    console.error(error);
    res.status(COMMON_RESPONSE_CODE.INTERNAL_SERVER_ERROR).send({ message: COMMON_MESSAGE.SERVER_ERROR });
  }
});

/**
 * @api {post} /api/v1/auth/send-otp 04.發送 OTP
 * @apiName SendOTP
 * @apiGroup 01.用戶認證和管理
 * @apiParam {String} email 電子郵件
 * @apiSuccess {String} message 發送成功消息
 * @apiError (500) InternalServerError 伺服器錯誤
 */
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    // 查找用戶
    const user = await models.User.findOne({ where: { email } });

    if (user.role === USER_ROLE.BANNED) {
      return res.status(COMMON_RESPONSE_CODE.SUCCESS).send({ message: COMMON_RESPONSE_MESSAGE.USER_BANNED });
    }

    if (!user) {
      console.log(`找不到電子郵件為 ${email} 的用戶`);
      return res.status(COMMON_RESPONSE_CODE.SUCCESS).send({ message: AUTH_MESSAGE.USER_NOT_FOUND_EMAIL });
    }

    // 生成 6 位數的 OTP
    const otp = generateOTP();

    // 更新用戶的 OTP
    try {
      const [updatedRows] = await models.User.update(
        // otpExpires 十分鐘後過期
        { otp_code: otp, otpExpires: Date.now() + 10 * 60 * 1000 }, // otpExpires 十分鐘後過期
        { where: { id: user.id } }
      );

      if (updatedRows === 0) {
        console.log(`更新 OTP 失敗，用戶 ID: ${user.id}`);
        return res.status(COMMON_RESPONSE_CODE.SUCCESS).send({ message: AUTH_MESSAGE.OTP_UPDATE_FAILED });
      }

      console.log(
        `成功更新 OTP，用戶 ID: ${user.id}, 用戶 email: ${user.email}, 新 OTP: ${otp}`
      );
    } catch (updateError) {
      console.error("更新 OTP 時發生錯誤:", updateError);
      return res.status(COMMON_RESPONSE_CODE.INTERNAL_SERVER_ERROR).send({ message: AUTH_MESSAGE.OTP_UPDATE_FAILED });
    }

    // 發送 OTP 到用戶郵箱
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: "您的登錄驗證碼",
      html: OTP_EMAIL(otp),
    };

    await emailConfig.sendMail(mailOptions);

    res.json({ message: AUTH_MESSAGE.OTP_SEND_SUCCESS, otp: otp });
  } catch (error) {
    console.error("發送 OTP 時發生錯誤:", error);
    res.status(COMMON_RESPONSE_CODE.INTERNAL_SERVER_ERROR).send({ message: AUTH_MESSAGE.OTP_SEND_FAILED });
  }
});

/**
 * @api {post} /api/v1/auth/verify-otp 05.驗證 OTP
 * @apiName VerifyOTP
 * @apiGroup 01.用戶認證和管理
 * @apiParam {String} email 電子郵件
 * @apiParam {String} otp OTP 驗證碼
 * @apiSuccess {String} message 驗證成功消息
 * @apiSuccess {String} token JWT token
 * @apiError (404) NotFound 找不到該電子郵件對應的用戶
 */
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    // 查找用戶
    const user = await models.User.findOne({ where: { email } });

    if (user.role === USER_ROLE.BANNED) {
      return res.status(COMMON_RESPONSE_CODE.SUCCESS).send({ message: COMMON_RESPONSE_MESSAGE.USER_BANNED });
    }

    if (!user) {
      return res.status(COMMON_RESPONSE_CODE.SUCCESS).send({ message: AUTH_MESSAGE.USER_NOT_FOUND_EMAIL });
    }

    const now = new Date();
    // 將 user.otpExpires 轉換為 Date 對象（如果它不是的話）
    const otpExpires = new Date(user.otpExpires);

    // 驗證 OTP 過期時間
    if (otpExpires.getTime() < now.getTime()) {
      return res.json({ message: AUTH_MESSAGE.OTP_EXPIRED });
    }

    if (parseInt(user.otp_code) !== parseInt(otp)) {
      console.log(
        `OTP 不正確，用戶 ID: ${user.id}, 用戶 email: ${user.email}, 輸入的 OTP: ${otp}, 正確的 OTP: ${user.otp_code}`
      );
      return res.json({ message: AUTH_MESSAGE.OTP_CODE_INVALID });
    }

    // OTP 驗證成功，清除 OTP
    await user.update({ otp_code: null, otpExpires: now, lastLogin: now });

    // 生成 JWT token
    const token = generateToken(user);

    res.json({ message: AUTH_MESSAGE.OTP_VERIFICATION_SUCCESS, token });
  } catch (error) {
    console.error(error);
    res.status(COMMON_RESPONSE_CODE.INTERNAL_SERVER_ERROR).json({ message: AUTH_MESSAGE.USER_LOGIN_FAILED });
  }
});

module.exports = router;