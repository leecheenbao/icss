const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const models = require("../models");
const { createCsvWriter } = require("csv-writer");
const { COMMON_RESPONSE_CODE } = require("../enum/commonEnum");
const { authenticateToken, isAdmin } = require("../config/authMiddleware");

/**
 * @api {post} /api/v1/points/transfer-points 01.員工點數轉移
 * @apiName TransferPoints
 * @apiGroup 04.點數管理
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
 * @api {post} /api/v1/points/manual-points 02.手動發放點數
 * @apiName ManualPoints
 * @apiGroup 04.點數管理
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

module.exports = router;
