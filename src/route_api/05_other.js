const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { createCsvWriter } = require('csv-writer');
const { authenticateToken, isAdmin } = require('../config/authMiddleware');
const { COMMON_RESPONSE_CODE } = require('../enum/commonEnum');

/**
 * @api {get} /api/v1/other/download-template/:type 下載後台批量操作模板
 * @apiName DownloadUserTemplate
 * @apiGroup 05.其他
 * @apiParam {String} type 模板類型，user 或 points
 * @apiSuccess {File} file 下載的 CSV 文件
 * @apiError (500) InternalServerError 下載模板時出錯
 */
router.get("/download-template/:type", authenticateToken, isAdmin, async (req, res) => {
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
        .status(COMMON_RESPONSE_CODE.INTERNAL_SERVER_ERROR)
        .json({ message: "創建 CSV 模板時出錯" });
    }
  });

module.exports = router;