const express = require("express");
const router = express.Router();
const multer = require("multer");
const csv = require("csv-parser");
const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");
const models = require("../models");
const { authenticateToken, isAdmin } = require("../config/authMiddleware");
const upload = multer({ dest: "uploads/" });
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const { checkRequiredParams } = require("../utils/validationUtils");
const { COMMON_RESPONSE_CODE } = require("../enum/commonEnum");
const bcrypt = require("bcrypt");

/**
 * @api {get} /api/v1/users 01.檢視用戶列表
 * @apiName GetUsers
 * @apiGroup 02.員工管理
 * @apiSuccess {Object[]} users 用戶列表
 * @apiSuccess {Number} users.id 用戶ID
 * @apiSuccess {String} users.username 用戶名
 * @apiSuccess {String} users.email 電子郵件
 * @apiSuccess {Date} users.createdAt 創建日期
 * @apiSuccess {Date} users.updatedAt 最後更新日期
 * @apiError (500) InternalServerError 伺服器錯誤
 */
router.get("/", authenticateToken, async (req, res) => {
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
 * @api {get} /api/v1/users/:id 02.獲取用戶資料
 * @apiName GetUserById
 * @apiGroup 02.員工管理
 * @apiParam {Number} id 用戶ID
 * @apiSuccess {Number} id 用戶ID
 * @apiSuccess {String} username 用戶名
 * @apiSuccess {String} email 電子郵件
 * @apiSuccess {Date} createdAt 創建日期
 * @apiSuccess {Date} updatedAt 最後更新日期
 * @apiError (404) NotFound 用戶不存在
 * @apiError (500) InternalServerError 伺服器錯誤
 */
router.get("/:id", authenticateToken, async (req, res) => {
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
 * @api {put} /api/v1/users/:id 03.更新用戶資料
 * @apiName UpdateUser
 * @apiGroup 02.員工管理
 * @apiParam {Number} id 用戶ID
 * @apiParam {String} username 用戶名
 * @apiParam {String} email 電子郵件
 * @apiParam {String} role 用戶狀態 -1:banned 0:user 1:admin
 * @apiSuccess {String} message 更新成功消息
 * @apiError (404) NotFound 用戶不存在
 * @apiError (500) InternalServerError 伺服器錯誤
 */
router.put("/:id", authenticateToken, async (req, res) => {
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

/**
 * @api {post} /api/v1/users/bulk-import 04.批量導入使用者
 * @apiName BulkImportUsers
 * @apiGroup 02.員工管理
 * @apiParam {File} file 上傳的 CSV 或 Excel 文件
 * @apiSuccess {Object} response 導入結果
 * @apiError (500) InternalServerError 處理文件時發生錯誤
 */
router.post("/bulk-import", authenticateToken, isAdmin, upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "沒有上傳文件" });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    let results = [];
    let successCount = 0;
    let errorCount = 0;
    let errors = [];

    try {
      const data = [];

      if (fileExtension === ".csv") {
        results = await new Promise((resolve, reject) => {
          fs.createReadStream(filePath)
            .pipe(csv())
            .on("data", (row) => data.push(row))
            .on("end", () => resolve(data))
            .on("error", reject);
        });
      } else if (fileExtension === ".xlsx" || fileExtension === ".xls") {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        results = xlsx.utils.sheet_to_json(worksheet);
      } else {
        throw new Error("不支持的文件類型");
      }

      for (const row of results) {
        // 預設密碼為111111, 加密密碼
        const hashedPassword = await bcrypt.hash("111111", 10);

        const newUser = new models.User({
          // 判斷第一欄位是否為 username
          // 無論如何第一個欄位都是 username
          username: row.username,
          email: row.email,
          passwordHash: hashedPassword,
          // 根據需要添加其他字段
        });

        // 判斷用戶名是否已經註冊過
        const existingUser = await models.User.findOne({
          where: { username: row.username },
        });
        if (existingUser) {
          errors.push(`用戶 ${row.username} 已經存在`);
          errorCount++;
          continue;
        }
        // 判斷使用者email是否已經註冊過
        const existingEmail = await models.User.findOne({
          where: { email: row.email },
        });
        if (existingEmail) {
          errors.push(`用戶 ${row.email} 已經存在`);
          errorCount++;
          continue;
        }
        await newUser.save();
        successCount++;
      }

      res.json({
        message: "批量導入完成",
        successCount,
        errorCount,
        errors,
      });

    } catch (error) {
      console.log(error);
      res.status(500).json({ error: `處理文件時發生錯誤: ${error.message}` });
    } finally {
      // 刪除臨時文件
      fs.unlinkSync(filePath);
    }
  }
);

module.exports = router;
