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
 * @api {post} /api/v1/users/manual-points 手動發放點數
 * @apiName ManualPoints
 * @apiGroup Users
 * @apiParam {Number[]} userIds 用戶ID列表
 * @apiParam {Number} points 發放的點數
 * @apiSuccess {Object} response 發放結果
 * @apiError (500) InternalServerError 發放點數時發生錯誤
 */
router.post("/manual-points", authenticateToken, isAdmin, async (req, res) => {
  const { userIds, points } = req.body;

  const missingParams = checkRequiredParams(req.body, ["userIds", "points"]);
  if (missingParams.length > 0) {
    return res
      .status(400)
      .json({ error: `缺少必要參數: ${missingParams.join(", ")}` });
  }

  if (points < 0) {
    return res.json({ message: "發放點數不能小於 0" });
  }

  try {
    const user = await models.User.findOne({ where: { id: userIds } });
    if (!user) {
      return res.json({ message: "用戶不存在" });
    }

    // 發放點數
    for (const userId of userIds) {
      const user = await models.User.findOne({ where: { id: userId } });
      user.points += points;
      await user.save();
    }

    res.json({ message: "點數發放成功" });
  } catch (error) {
    console.error("發放點數時發生錯誤:", error);
    res.status(500).json({ error: `發放點數時發生錯誤: ${error.message}` });
  }
});

/**
 * @api {post} /api/v1/users/transfer-points 員工點數轉移
 * @apiName TransferPoints
 * @apiGroup Users
 * @apiParam {Number} toUserId 轉移點數的目標用戶ID
 * @apiParam {Number} points 轉移的點數
 * @apiSuccess {Object} response 轉移結果
 * @apiError (500) InternalServerError 轉移點數時發生錯誤
 */
router.post("/transfer-points", authenticateToken, async (req, res) => {
  const { toUserId, points } = req.body;

  const missingParams = checkRequiredParams(req.body, ["toUserId", "points"]);
  if (missingParams.length > 0) {
    return res
      .status(400)
      .json({ error: `缺少必要參數: ${missingParams.join(", ")}` });
  }

  try {
    // 從JWT中獲取用戶ID
    const userId = req.user.id;
    const fromUser = await models.User.findOne({ where: { id: userId } });
    const toUser = await models.User.findOne({ where: { id: toUserId } });

    // 判斷用戶對象是否存在
    if (!toUser) {
      return res.json({ message: "對象用戶不存在" });
    }

    // 判斷轉移點數是否超過可用點數
    if (fromUser.points < points) {
      return res.json({ message: "轉移點數超過可用點數" });
    }

    // 判斷是否轉移給自己
    if (userId === toUserId) {
      return res.json({ message: "點數轉移失敗, 不能轉移給自己" });
    }

    fromUser.points -= points;
    toUser.points += points;

    await fromUser.update({ points: fromUser.points });
    await toUser.update({ points: toUser.points });

    const description = `${fromUser.username} 轉移給 ${toUser.username} ${points} 點`;

    // 新增點數轉移紀錄
    try {
      await models.PointsTransaction.create({
        from_user_id: userId,
        to_user_id: toUserId,
        points: points,
        transaction_type: 1, // 1: 轉移
        description: description,
      });
    } catch (error) {
      console.error("新增點數轉移紀錄時發生錯誤:", error);
      res.status(500).json({ error: `新增點數轉移紀錄時發生錯誤: ${error.message}` });
    }

    res.json({ message: "點數轉移成功", description: description });
  } catch (error) {
    console.error("點數轉移時發生錯誤:", error);
    res.status(500).json({ error: `點數轉移時發生錯誤: ${error.message}` });
  }
});

/**
 * @api {post} /api/v1/users/bulk-import 批量導入使用者
 * @apiName BulkImportUsers
 * @apiGroup Users
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

/**
 * @api {get} /api/v1/users/download-template 下載後台批量操作模板
 * @apiName DownloadUserTemplate
 * @apiGroup Users
 * @apiParam {String} type 模板類型，user 或 points
 * @apiSuccess {File} file 下載的 CSV 文件
 * @apiError (500) InternalServerError 下載模板時出錯
 */
router.get("/download-template/:type", async (req, res) => {
  const type = req.params.type;
  const templateName = `${type}_template.csv`;
  const templatePath = path.join(__dirname, "../temp", templateName);

  let header, data;

  if (type === "user") {
    header = [
      { id: "username", title: "username" },
      { id: "email", title: "email" },
    ];
    data = [{ username: "example_user", email: "user@example.com"}];
  } else if (type === "points") {
    header = [
      { id: "username", title: "username" },
      { id: "points", title: "points" },
    ];
    data = [{ username: "example_user2222", points: "200"}];
  } else {
    return res.status(400).json({ message: "模板類型錯誤" });
  }

  const csvWriter = createCsvWriter({
    path: templatePath,
    header: header
  });

  try {
    console.log(data);
    console.log(templatePath, templateName);
    await csvWriter.writeRecords(data);

    res.download(templatePath, templateName, (err) => {
      if (err) {
        console.error("下載模板時出錯:", err);
        res.status(500).send("下載模板時出錯");
      }
      // 下载后删除临时文件
      fs.unlinkSync(templatePath);
    });
  } catch (error) {
    console.error("創建 CSV 模板時出錯:", error);
    return res
      .status(COMMON_RESPONSE_CODE.BAD_REQUEST)
      .json({ message: "創建 CSV 模板時出錯" });
  }
});

module.exports = router;
