const express = require("express");
const router = express.Router();
const models = require("../models");
const GcsUploader = require("../utils/gcsUploader");
const multer = require('multer');
const upload = multer({ dest: "uploads/" });  
const fs = require('fs');
const { checkRequiredParams } = require("../utils/validationUtils");
const { authenticateToken, isAdmin } = require("../config/authMiddleware");
const {
  COURSE_ERROR_MESSAGE,
  COURSE_SUCCESS_MESSAGE,
  COURSE_IMAGE_UPLOAD_MESSAGE,
  COMMON_MESSAGE,
  COMMON_RESPONSE_CODE,
  COURSE_STATUS,
} = require("../enum/commonEnum");

/**
 * @api {get} /api/v1/courses 01.獲取所有課程列表
 * @apiName GetAllCourses
 * @apiGroup 03.課程管理
 * @apiSuccess {Object[]} courses 課程列表
 * @apiError (500) InternalServerError 伺服器錯誤
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const courses = await models.Course.findAll();
    if (courses.length === 0) {
      return res.status(200).json({ message: COURSE_ERROR_MESSAGE.COURSE_NOT_FOUND });
    }
    res.json(courses);
  } catch (error) {
    console.error("獲取課程列表時發生錯誤:", error);
    res.status(500).json({ message: COURSE_ERROR_MESSAGE.COURSE_NOT_FOUND });
  }
});

/**
 * @api {get} /api/v1/courses/info:id 02.獲取單個課程詳情
 * @apiName GetCourseInfo
 * @apiGroup 03.課程管理
 * @apiParam {Number} id 課程ID
 * @apiSuccess {Object} course 課程詳情
 * @apiError (404) NotFound 課程不存在
 * @apiError (500) InternalServerError 伺服器錯誤
 */
router.get("/info/:id", authenticateToken, async (req, res) => {
  try {
    const course = await models.Course.findByPk(req.params.id);
    if (!course) {
      return res.status(COMMON_RESPONSE_CODE.NOT_FOUND).json({ message: COURSE_ERROR_MESSAGE.COURSE_NOT_FOUND });
    }
    res.json(course);
  } catch (error) {
    console.error("獲取課程詳情時發生錯誤:", error);
    res.status(500).json({ message: COMMON_MESSAGE.SERVER_ERROR });
  }
});

/**
 * @api {post} /api/v1/courses 03.新增課程
 * @apiName CreateCourse
 * @apiGroup 03.課程管理
 * @apiParam {String} title 課程標題
 * @apiParam {String} description 課程描述
 * @apiParam {String} instructor 講者姓名
 * @apiParam {Date} course_date 課程日期
 * @apiParam {String} image_url 課程圖片網址
 * @apiParam {Number} max_participants 最大報名人數
 * @apiParam {Date} sign_up_start_date 報名開始日期
 * @apiParam {Date} sign_up_end_date 報名截止日期
 */
router.post("/", authenticateToken, isAdmin, async (req, res) => {
  try {
    // 檢查各個參數不能為null
    const missingParams = checkRequiredParams(req.body, [
      "title",
      "description",
      "instructor",
      "course_date",
      "image_url",
      "max_participants",
      "sign_up_start_date",
      "sign_up_end_date",
    ]);
    if (missingParams.length > 0) {
      return res
        .status(COMMON_RESPONSE_CODE.BAD_REQUEST)
        .json({ message: `缺少必要參數: ${missingParams.join(", ")}` });
    }
    // 判斷參數course_date不能小於sign_up_end_date
    if (req.body.course_date < req.body.sign_up_end_date) {
      return res.status(COMMON_RESPONSE_CODE.BAD_REQUEST).json({ message: COURSE_ERROR_MESSAGE.COURSE_DATE_INVALID });
    }

    // 判斷參數sign_up_start_date 不能大於sign_up_end_date
    if (req.body.sign_up_start_date > req.body.sign_up_end_date) {
      return res
        .status(COMMON_RESPONSE_CODE.BAD_REQUEST)
        .json({ message: COURSE_ERROR_MESSAGE.COURSE_SIGN_UP_START_DATE_INVALID });
    }

    const course = await models.Course.create(req.body);
    res.status(201).json(course);
  } catch (error) {
    console.error("創建課程時發生錯誤:", error);
    res.status(COMMON_RESPONSE_CODE.INTERNAL_SERVER_ERROR).json({ message: COURSE_ERROR_MESSAGE.COURSE_CREATE_FAILED });
  }
});

/**
 * @api {put} /api/v1/courses/:id 04.更新課程
 * @apiName UpdateCourse
 * @apiGroup 03.課程管理
 * @apiParam {Number} id 課程ID
 * @apiParam {String} [title] 課程標題
 * @apiParam {String} [description] 課程描述
 * @apiParam {String} [image_url] 課程圖片URL
 * @apiParam {Date} [course_date] 課程日期
 * @apiParam {Date} [start_date] 開始日期
 * @apiParam {Date} [end_date] 結束日期
 * @apiParam {Number} [max_participants] 最大參與人數
 * @apiSuccess {Object} course 更新後的課程
 * @apiError (404) NotFound 課程不存在
 * @apiError (500) InternalServerError 伺服器錯誤
 */
router.put("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    if (req.body.course_date < req.body.sign_up_end_date) {
      return res.status(COMMON_RESPONSE_CODE.BAD_REQUEST).json({ message: COURSE_ERROR_MESSAGE.COURSE_DATE_INVALID });
    }

    if (req.body.sign_up_start_date > req.body.sign_up_end_date) {
      return res
        .status(COMMON_RESPONSE_CODE.BAD_REQUEST)
        .json({ message: COURSE_ERROR_MESSAGE.COURSE_SIGN_UP_START_DATE_INVALID });
    }

    if (req.body.max_participants < 0) {
      return res.status(COMMON_RESPONSE_CODE.BAD_REQUEST).json({ message: COURSE_ERROR_MESSAGE.COURSE_MAX_PARTICIPANTS_INVALID });
    }

    const [updatedRows] = await models.Course.update(
      {
        title: req.body.title,
        description: req.body.description,
        instructor: req.body.instructor,
        course_date: req.body.course_date,
        image_url: req.body.image_url,
        max_participants: req.body.max_participants,
        sign_up_start_date: req.body.sign_up_start_date,
        sign_up_end_date: req.body.sign_up_end_date,
        updated_at: new Date(),
      },
      {
        where: { id: req.params.id },
      }
    );

    const updatedCourse = await models.Course.findByPk(req.params.id);
    res.json(updatedCourse);
  } catch (error) {
    console.error("更新課程時發生錯誤:", error);
    res.status(COMMON_RESPONSE_CODE.INTERNAL_SERVER_ERROR).json({ message: COURSE_ERROR_MESSAGE.COURSE_UPDATE_FAILED });
  }
});

/**
 * @api {delete} /api/v1/courses/:id 05.刪除課程
 * @apiName DeleteCourse
 * @apiGroup 03.課程管理
 * @apiParam {Number} id 課程ID
 * @apiSuccess {Object} message 刪除成功消息
 * @apiError (404) NotFound 課程不存在
 * @apiError (500) InternalServerError 伺服器錯誤
 */
router.delete("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const deletedRows = await models.Course.destroy({
      where: { id: req.params.id },
    });
    if (deletedRows === 0) {
      return res.status(COMMON_RESPONSE_CODE.NOT_FOUND).json({ message: COURSE_ERROR_MESSAGE.COURSE_NOT_FOUND });
    }
    res.json({ message: COURSE_SUCCESS_MESSAGE.COURSE_DELETE_SUCCESS });
  } catch (error) {
    console.error("刪除課程時發生錯誤:", error);
    res.status(500).json({ message: COURSE_ERROR_MESSAGE.COURSE_DELETE_FAILED });
  }
});

/**
 * @api {put} /api/v1/courses/:id/publish 06.手動上架課程
 * @apiName PublishCourse
 * @apiGroup 03.課程管理
 * @apiParam {Number} id 課程ID
 * @apiSuccess {Object} course 上架後的課程
 * @apiError (404) NotFound 課程不存在
 * @apiError (500) InternalServerError 伺服器錯誤
 */
router.put("/:id/publish", authenticateToken, isAdmin, async (req, res) => {
  try {
    const publishedCourses = await models.Course.count({
      where: { status: COURSE_STATUS.ACTIVE },
    });
    if (publishedCourses >= 10) {
      return res.status(400).json({ message: COURSE_ERROR_MESSAGE.COURSE_PUBLISH_LIMIT_REACHED });
    }

    const [updatedRows] = await models.Course.update(
      { status: COURSE_STATUS.ACTIVE },
      { where: { id: req.params.id, status: [COURSE_STATUS.INACTIVE, COURSE_STATUS.PENDING] } }
    );
    if (updatedRows === 0) {
      return res.status(COMMON_RESPONSE_CODE.NOT_FOUND).json({ message: COURSE_ERROR_MESSAGE.COURSE_NOT_FOUND });
    }
    const updatedCourse = await models.Course.findByPk(req.params.id);
    res.json(updatedCourse);
  } catch (error) {
    console.error("上架課程時發生錯誤:", error);
    res.status(500).json({ message: COURSE_ERROR_MESSAGE.COURSE_PUBLISH_FAILED });
  }
});

/**
 * @api {put} /api/v1/courses/:id/unpublish 07.手動下架課程
 * @apiName CloseCourse
 * @apiGroup 03.課程管理
 * @apiParam {Number} id 課程ID
 * @apiSuccess {Object} course 上架後的課程
 * @apiError (404) NotFound 課程不存在
 * @apiError (500) InternalServerError 伺服器錯誤
 */
router.put("/:id/unpublish", authenticateToken, isAdmin, async (req, res) => {
  try {
    const [updatedRows] = await models.Course.update(
      { status: 2 },
      { where: { id: req.params.id, status: [0, 1] } }
    );

    if (updatedRows === 0) {
      return res.status(COMMON_RESPONSE_CODE.NOT_FOUND).json({ message: COURSE_ERROR_MESSAGE.COURSE_NOT_FOUND });
    }
    const updatedCourse = await models.Course.findByPk(req.params.id);
    res.json(updatedCourse);
  } catch (error) {
    console.error("下架課程時發生錯誤:", error);
    res.status(500).json({ message: COURSE_ERROR_MESSAGE.COURSE_PUBLISH_FAILED });
  }
});

/**
 * @api {get} /api/v1/courses/recommended 08.獲取推薦課程列表
 * @apiName GetRecommendedCourses
 * @apiGroup 03.課程管理
 * @apiSuccess {Object[]} courses 推薦課程列表
 * @apiError (500) InternalServerError 伺服器錯誤
 */
router.get("/recommended", authenticateToken, async (req, res) => {
  try {
    const recommendedCourses = await models.RecommendedCourse.findAll({
      // where: { status: 1 },
      limit: 10,
      order: [["created_At", "DESC"]],
    });
    // 返回的參數包含資料筆數
    res.json({
      count: recommendedCourses.length,
      courses: recommendedCourses,
    });
  } catch (error) {
    console.error("獲取推薦課程時發生錯誤:", error);
    res.status(500).json({ message: COMMON_MESSAGE.SERVER_ERROR });
  }
});

/**
 * @api {get} /api/v1/courses/recommended/:id 09.獲取推薦課程詳情
 * @apiName GetRecommendedCourseInfo
 * @apiGroup 03.課程管理
 * @apiParam {Number} id 推薦課程ID
 * @apiSuccess {Object} course 推薦課程詳情
 * @apiError (404) NotFound 推薦課程不存在
 * @apiError (500) InternalServerError 伺服器錯誤
 */
router.get("/recommended/:id", authenticateToken, async (req, res) => {
  try {
    const course = await models.RecommendedCourse.findByPk(req.params.id);
    if (!course) {
      return res.status(COMMON_RESPONSE_CODE.NOT_FOUND).json({ message: "推薦課程不存在" });
    }
    res.json(course);
  } catch (error) {
    console.error("獲取推薦課程詳情時發生錯誤:", error);
    res.status(500).json({ message: COMMON_MESSAGE.SERVER_ERROR });
  }
});



/**
 * @api {post} /api/v1/courses/recommended 10.推薦課程
 * @apiName RecommendCourse
 * @apiGroup 03.課程管理
 * @apiParam {String} title 課程標題
 * @apiParam {String} description 課程描述
 * @apiParam {String} instructor 講者姓名
 * @apiParam {String} [image_url] 推薦課程圖片URL
 * @apiSuccess {Object} message 推薦成功消息
 * @apiError (404) NotFound 課程不存在
 * @apiError (500) InternalServerError 伺服器錯誤
 */
router.post("/recommended", authenticateToken, async (req, res) => {
  try {
    const { title, description, instructor, image_url } = req.body;
    const missingParams = checkRequiredParams(req.body, ["title", "description", "instructor"]);
    if (missingParams.length > 0) {
      return res.status(COMMON_RESPONSE_CODE.BAD_REQUEST).json({ message: `缺少必要參數: ${missingParams.join(", ")}` });
    }

    // 將推薦課程存入資料庫
    const recommendedCourse = await models.RecommendedCourse.create({
      title: title,
      description: description,
      instructor: instructor,
      image_url: image_url,
      user_id: req.user.id,
    });

    res.json({ message: COURSE_SUCCESS_MESSAGE.COURSE_RECOMMEND_SUCCESS, data: recommendedCourse });
  } catch (error) {
    console.error("推薦課程時發生錯誤:", error);
    res.status(500).json({ message: COMMON_MESSAGE.SERVER_ERROR });
  }

});

/**
 * @api {put} /api/v1/courses/recommended/:id 11.編輯推薦課程
 * @apiName EditRecommendedCourse
 * @apiGroup 03.課程管理
 * @apiParam {Number} id 推薦課程ID
 * @apiParam {String} [title] 課程標題
 * @apiParam {String} [description] 課程描述
 * @apiParam {String} [instructor] 講者姓名
 * @apiParam {String} [image_url] 推薦課程圖片URL
 * @apiSuccess {Object} course 更新後的推薦課程
 * @apiError (404) NotFound 推薦課程不存在
 * @apiError (500) InternalServerError 伺服器錯誤
 */
router.put("/recommended/:id", authenticateToken, async (req, res) => {
  try {
    const { title, description, instructor, image_url } = req.body;
    const missingParams = checkRequiredParams(req.body, ["title", "description", "instructor"]);
    if (missingParams.length > 0) {
      return res.status(COMMON_RESPONSE_CODE.BAD_REQUEST).json({ message: `缺少必要參數: ${missingParams.join(", ")}` });
    }

    // 檢查有無該課程
    console.log(req.params.id);
    const course = await models.RecommendedCourse.findOne({ where: { id: req.params.id } });
    if (!course) {
      return res.status(COMMON_RESPONSE_CODE.NOT_FOUND).json({ message: "推薦課程不存在" });
    }

    // 更新推薦課程
    const [updatedRows] = await models.RecommendedCourse.update(
      {
        title: title,
        description: description,
        instructor: instructor,
        image_url: image_url,
        updated_at: new Date(),
      },
      { where: { id: req.params.id } }
    );

    if (updatedRows === 0) {
      return res.status(COMMON_RESPONSE_CODE.NOT_FOUND).json({ message: "沒有更新任何資料" });
    } else {
      const updatedCourse = await models.RecommendedCourse.findByPk(req.params.id);
      res.json({ message: "推薦課程更新成功", data: updatedCourse });
    }
  } catch (error) {
    console.error("編輯推薦課程時發生錯誤:", error);
    res.status(500).json({ message: "推薦課程更新失敗" });
  }
});




/**
 * @api {put} /api/v1/courses/recommended/:id/approve 12.審核通過推薦課程
 * @apiName ApproveRecommendedCourse
 * @apiGroup 03.課程管理
 * @apiParam {Number} id 推薦課程ID
 * @apiParam {String} title 課程標題
 * @apiParam {String} [description] 課程描述
 * @apiParam {String} [instructor] 講者姓名
 * @apiParam {String} [image_url] 課程圖片URL
 * @apiParam {Date} course_date 課程日期
 * @apiParam {Date} sign_up_end_date 報名截止日期
 * @apiParam {Number} max_participants 最大參與人數
 * @apiParam {Date} sign_up_start_date 報名開始日期
 * @apiSuccess {Object} message 審核結果消息
 * @apiError (500) InternalServerError 伺服器錯誤
 */
router.put("/recommended/:id/approve", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { course_date, sign_up_end_date, max_participants, sign_up_start_date, // 必填欄位
      title, description, instructor, image_url // 選填欄位
    } = req.body;
    const missingParams = checkRequiredParams(req.body, ["course_date", "sign_up_end_date", "max_participants", "sign_up_start_date"]);
    if (missingParams.length > 0) {
      return res.json({ message: `缺少必要參數: ${missingParams.join(", ")}` });
    }

    const recommendedCourse = await models.RecommendedCourse.findByPk(id);
    if (!recommendedCourse) {
      return res.status(404).json({ message: "找不到該課程" });
    }

    // 判斷課程日期是否在報名截止日期之前
    if (course_date < sign_up_end_date) {
      return res.status(400).json({ message: "課程日期不能在報名截止日期之前" });
    }
    // 判斷報名開始日期是否在報名截止日期之前
    if (sign_up_start_date > sign_up_end_date) {
      return res.status(400).json({ message: "報名開始日期不能在報名截止日期之前" });
    }
    // 開課人數
    if (max_participants < 1) {
      return res.status(400).json({ message: "開課人數不能小於1" });
    }

    // 更新推薦課程審核狀態
    const [recommendedCourseUpdatedRows] = await models.RecommendedCourse.update(
      { status: 1 }, // 1: 審核通過
      { where: { id: id } }
    );

    if (recommendedCourseUpdatedRows === 0) {
      return res.status(400).json({ message: "沒有資料更新" });
    }

    // 判斷原推薦課程是否已經有課程
    const course = await models.Course.findOne({ where: { recommended_course_id: id } });
    if (course) {
      // 更新課程審核狀態
      const [courseUpdatedRows] = await models.Course.update(
        { status: 1 ,updated_at: new Date()}, // 1: 審核通過
        { where: { id: course.id } }
      );
      return res.status(400).json({ message: "該課程已經存在, 僅更新審核狀態", data: course });
    } else {
      // 如果選填欄位有值, 則更新該欄位, 否則使用原推薦課程的值
      let courseTitle = title ?? recommendedCourse.title;
      let courseDescription = description ?? recommendedCourse.description;
      let courseInstructor = instructor ?? recommendedCourse.instructor;
      let courseImageUrl = image_url ?? recommendedCourse.image_url;
      
      // 將推薦課程轉為正式課程
      const course = await models.Course.create({
        title: courseTitle,
        description: courseDescription,
        instructor: courseInstructor,
        image_url: courseImageUrl,
        recommended_course_id: id,
        status: 0, // 0:upcoming 1:closed 2:canceled
        course_date: course_date,
        sign_up_end_date: sign_up_end_date,
        max_participants: max_participants,
        sign_up_start_date: sign_up_start_date,
        updated_at: new Date(),
      });
      res.json({ message: "課程審核通過", data: course });
    }

  } catch (error) {
    console.error("課程審核狀態更新失敗:", error);
    res.status(500).json({ message: "課程審核狀態更新失敗" });
  }
});

/**
 * @api {put} /api/v1/courses/recommended/:id/reject 13.審核不通過推薦課程
 * @apiName RejectRecommendedCourse
 * @apiGroup 03.課程管理
 * @apiParam {Number} id 推薦課程ID
 * @apiSuccess {Object} message 審核結果消息
 * @apiError (404) NotFound 推薦課程不存在
 * @apiError (500) InternalServerError 伺服器錯誤
 */
router.put("/recommended/:id/reject", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const recommendedCourse = await models.RecommendedCourse.findByPk(id);
    if (!recommendedCourse) {
      return res.status(404).json({ message: "找不到該課程" });
    }

    const [recommendedCourseUpdatedRows] = await models.RecommendedCourse.update(
      { status: 2, updated_at: new Date() },   // 2: 審核不通過
      { where: { id: id } }
    );

    // 如果推薦課程審核不通過, 則關閉該課程
    if (recommendedCourseUpdatedRows > 0) {
      const [courseUpdatedRows] = await models.Course.update(
        { status: 2, updated_at: new Date() }, // 2: 關閉課程
        { where: { id: id } }
      );
    }

    if (recommendedCourseUpdatedRows === 0) {
      return res.status(400).json({ message: "沒有資料更新" });
    }

    res.json({ message: "課程審核不通過", data: recommendedCourse });

  } catch (error) {
    console.error("課程審核狀態更新失敗:", error);
    res.status(500).json({ message: "課程審核狀態更新失敗" });
  }
});

/**
 * @api {post} /api/v1/courses/upload/:id 14.上傳課程圖片
 * @apiName UploadCourseImage
 * @apiGroup 03.課程管理
 * @apiParam {File} image 課程圖片
 * @apiSuccess {Object} imageUrl 上傳後的圖片URL
 * @apiError (500) InternalServerError 伺服器錯誤
 */
router.post("/upload/:id", authenticateToken, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: COURSE_IMAGE_UPLOAD_MESSAGE.COURSE_IMAGE_UPLOAD_NOT_FOUND });
    }

    const recommendedCourse = await models.RecommendedCourse.findByPk(req.params.id);
    if (!recommendedCourse) {
      return res.status(404).json({ message: "找不到該課程" });
    }

    const gcsUploader = new GcsUploader(process.env.GCP_PROJECT_ID, process.env.GCP_KEY_FILENAME);
    const imageUrl = await gcsUploader.uploadFile(
      process.env.GCP_BUCKET_NAME, 
      req.file.path, 
      `courses/${req.params.id}/${req.file.filename}`
    );

    // 刪除臨時文件
    fs.unlinkSync(req.file.path);

    // 更新課程圖片URL
    await models.RecommendedCourse.update(
      { image_url: imageUrl },
      { where: { id: req.params.id } }
    );

    res.json({ imageUrl });
  } catch (error) {
    console.error("上傳課程圖片時發生錯誤:", error);
    res.status(500).json({ message: COURSE_IMAGE_UPLOAD_MESSAGE.COURSE_IMAGE_UPLOAD_FAILED });
  }
});

module.exports = router;
