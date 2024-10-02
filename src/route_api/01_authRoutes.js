const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const emailConfig = require("../config/email");
const OTP_EMAIL = require("../templates/emails/OTP_EMAIL");
const models = require("../models");
const { now, generateToken } = require("../config/common");
const { generateOTP, isOTPValid } = require("../utils/otpUtil");
const { authenticateToken, isAdmin } = require("../config/authMiddleware");
const { AUTH_MESSAGE, COMMON_RESPONSE_MESSAGE, USER_ROLE, COMMON_RESPONSE_CODE } = require("../enum/commonEnum");

/**
 * @api {post} /api/v1/admin/register 01-01.註冊管理員角色
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
 * @api {post} /api/v1/register 01-02.一般用戶註冊
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
 * @api {post} /api/v1/login 02-01.用戶登入/管理員登入
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
 * @api {post} /api/v1/auth/send-otp 02-02.發送 OTP
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
 * @api {post} /api/v1/auth/verify-otp 02-03.驗證 OTP
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

/**
 * @api {get} /api/v1/admin/users 03.檢視用戶列表
 * @apiName GetUsers
 * @apiGroup 01.用戶認證和管理
 * @apiSuccess {Object[]} users 用戶列表
 * @apiSuccess {Number} users.id 用戶ID
 * @apiSuccess {String} users.username 用戶名
 * @apiSuccess {String} users.email 電子郵件
 * @apiSuccess {Date} users.createdAt 創建日期
 * @apiSuccess {Date} users.updatedAt 最後更新日期
 * @apiError (500) InternalServerError 伺服器錯誤
 */
router.get("/users", authenticateToken, async (req, res) => {
  try {
    const users = await models.User.findAll({
      attributes: { exclude: ["passwordHash"] }, // 排除 passwordHash 欄位
    });
    res.status(COMMON_RESPONSE_CODE.SUCCESS).send(users);
  } catch (error) {
    console.error(error);
    res.status(COMMON_RESPONSE_CODE.INTERNAL_SERVER_ERROR).send({ message: COMMON_RESPONSE_MESSAGE.SERVER_ERROR });
  }
});

/**
 * @api {get} /api/v1/admin/users/:id 04.獲取用戶資料
 * @apiName GetUserById
 * @apiGroup 01.用戶認證和管理
 * @apiParam {Number} id 用戶ID
 * @apiSuccess {Number} id 用戶ID
 * @apiSuccess {String} username 用戶名
 * @apiSuccess {String} email 電子郵件
 * @apiSuccess {Date} createdAt 創建日期
 * @apiSuccess {Date} updatedAt 最後更新日期
 * @apiError (404) NotFound 用戶不存在
 * @apiError (500) InternalServerError 伺服器錯誤
 */
router.get("/users/:id", authenticateToken, async (req, res) => {
  try {
    const user = await models.User.findByPk(req.params.id, {
      attributes: { exclude: ["passwordHash"] }, // 排除 passwordHash 欄位
    });

    if (!user) {
      return res.status(COMMON_RESPONSE_CODE.SUCCESS).send({ message: AUTH_MESSAGE.USER_NOT_FOUND });
    }
    res.status(COMMON_RESPONSE_CODE.SUCCESS).send(user);
  } catch (error) {
    console.error(error);
    res.status(COMMON_RESPONSE_CODE.INTERNAL_SERVER_ERROR).send({ message: COMMON_MESSAGE.SERVER_ERROR });
  }
});

/**
 * @api {put} /api/v1/admin/users/:id 05.更新用戶資料
 * @apiName UpdateUser
 * @apiGroup 01.用戶認證和管理
 * @apiParam {Number} id 用戶ID
 * @apiParam {String} username 用戶名
 * @apiParam {String} email 電子郵件
 * @apiParam {String} role 用戶狀態 -1:banned 0:user 1:admin
 * @apiSuccess {String} message 更新成功消息
 * @apiError (404) NotFound 用戶不存在
 * @apiError (500) InternalServerError 伺服器錯誤
 */
router.put("/users/:id", authenticateToken, async (req, res) => {
  try {
    const { username, email, role } = req.body;
    const user = await models.User.findByPk(req.params.id);

    if (!user) {
      return res.status(COMMON_RESPONSE_CODE.SUCCESS).send({ message: AUTH_MESSAGE.USER_NOT_FOUND });
    }

    // 管理者可以更改所有人的資料，一般用戶只能更改自己的資料
    if (req.user.role === USER_ROLE.ADMIN) {
      // 管理者可以更新所有用戶的資料，包括角色
      await user.update({ username, email, role });
    } else if (req.user.role === USER_ROLE.USER) {
      if (req.user.id === user.id) {
        // 判斷有沒有其他使用者用同樣的username
        const existingUser = await models.User.findOne({ where: { username } });
        if (existingUser) {
          return res.status(COMMON_RESPONSE_CODE.SUCCESS).send({ message: AUTH_MESSAGE.USERNAME_EXIST });
        }
        await user.update({ username });
      } else {
        // 一般用戶嘗試更新其他用戶的資料, 顯示權限不足
        return res.send({ message: COMMON_RESPONSE_MESSAGE.FORBIDDEN });
      }
    } else {
      // 未知角色
      return res.status(COMMON_RESPONSE_CODE.BAD_REQUEST).send({ message: COMMON_RESPONSE_MESSAGE.BAD_REQUEST });
    }

    const userData = await models.User.findByPk(req.params.id, {
      attributes: { exclude: ["passwordHash", "otp_code", "otpExpires"] },
    });

    res.status(COMMON_RESPONSE_CODE.SUCCESS).send({ message: AUTH_MESSAGE.USER_UPDATE_SUCCESS, data: userData });
  } catch (error) {
    console.error(error);
    res.status(COMMON_RESPONSE_CODE.INTERNAL_SERVER_ERROR).send({ message: COMMON_RESPONSE_MESSAGE.INTERNAL_SERVER_ERROR });
  }
});

module.exports = router;