## 課程管理系統

### 功能特點
- 用戶認證和管理
- 課程創建、更新和管理
- 課程報名和取消
- 推薦課程功能
- 點數系統
- OTP（一次性密碼）登錄

### 技術棧
- Node.js
- Express.js
- Sequelize ORM
- JWT 認證
- bcrypt 密碼加密
- Multer 文件上傳
- CSV 和 Excel 文件處理

### 安裝步驟

安裝依賴
```
npm install
```

運行應用
```
npm run start:local
npm run start:stage
npm run start:prod
```

### API 路由
#### 用戶認證和管理
- 註冊管理員：POST /api/v1/admin/register
- 用戶註冊：POST /api/v1/register
- 發送 OTP：POST /api/v1/auth/send-otp
- 驗證 OTP：POST /api/v1/auth/verify-otp
- 獲取用戶列表：GET /api/v1/admin/users
- 獲取用戶資料：GET /api/v1/admin/users/:id
- 更新用戶資料：PUT /api/v1/admin/users/:id
#### 課程管理
- 獲取所有課程：GET /api/v1/courses
- 獲取單個課程：GET /api/v1/courses/info/:id
- 創建課程：POST /api/v1/courses
- 更新課程：PUT /api/v1/courses/:id
- 下架課程：PUT /api/v1/courses/:id/close
- 獲取推薦課程：GET /api/v1/courses/recommended
- 推薦課程：POST /api/v1/courses/recommended
- 上傳課程圖片：POST /api/v1/courses/upload
- 獲取課程報名列表：GET /api/v1/courses/registrations
- 獲取課程報名資料：GET /api/v1/courses/registrations/:id
- 報名課程：POST /api/v1/courses/registrations
- 取消報名：PUT /api/v1/courses/registrations/:id/cancel

### 數據模型
主要的數據模型包括：
User
Course
CourseRegistration
RecommendedCourse
Notification
PointsTransaction
這些模型之間的關係在 src/models/index.js 中定義。

### 錯誤處理
系統使用統一的錯誤處理機制，錯誤消息和狀態碼定義在 src/enum/commonEnum.js 中。

### 郵件模板
系統使用 HTML 郵件模板發送 OTP，模板定義在 src/templates/emails/OTP_EMAIL.js 中。

### 初始化數據
腳本方便用於開發時初始化數據
``` shell
sh init_data.sh
```
### 更新文件
透過apidoc生成api文件
``` shell
apidoc -i src -o icss-docs
```