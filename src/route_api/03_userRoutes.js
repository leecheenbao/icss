const express = require("express");
const router = express.Router();
const multer = require("multer");
const csv = require("csv-parser");
const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");
const User = require("../models/User"); // 假設您有一個 User 模型
const { authenticateToken, isAdmin } = require("../config/authMiddleware");
const upload = multer({ dest: "uploads/" });
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const { COMMON_RESPONSE_CODE } = require("../enum/commonEnum");
const bcrypt = require("bcrypt");

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
        const hashedPassword = await bcrypt.hash('111111', 10);

        const newUser = new User({
          // 判斷第一欄位是否為 username
          // 無論如何第一個欄位都是 username
          username: row.username,
          email: row.email,
          passwordHash: hashedPassword,
          // 根據需要添加其他字段
        });

        // 判斷用戶名是否已經註冊過
        const existingUser = await User.findOne({ where: { username: row.username } });
        if (existingUser) {
          errors.push(`用戶 ${row.username} 已經存在`);
          errorCount++;
          continue;
        }
        // 判斷使用者email是否已經註冊過
        const existingEmail = await User.findOne({ where: { email: row.email } });
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
 * @api {get} /api/v1/users/download-template 下載使用者模板
 * @apiName DownloadUserTemplate
 * @apiGroup Users
 * @apiSuccess {File} file 下載的 CSV 文件
 * @apiError (500) InternalServerError 下載模板時出錯
 */
router.get("/download-template", async (req, res) => {
  const templatePath = path.join(__dirname, "../temp", "user_template.csv");

  const csvWriter = createCsvWriter({
    path: templatePath,
    header: [
      { id: "username", title: "username" },
      { id: "email", title: "email" },
    ],
  });

  const data = [{ username: "example_user", email: "user@example.com" }];

  try {
    await csvWriter.writeRecords(data);

    res.download(templatePath, "user_template.csv", (err) => {
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
