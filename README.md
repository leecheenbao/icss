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
#### 1.用戶認證和管理
- 註冊管理員：POST /api/v1/auth/admin/register
- 用戶註冊：POST /api/v1/auth/register
- 登入：POST /api/v1/auth/login
- 發送OTP：POST /api/v1/auth/send-otp
- 驗證OTP：POST /api/v1/auth/verify-otp
  
#### 2.員工管理
- 獲取員工列表：GET /api/v1/users
- 獲取用戶資料：GET /api/v1/users/info
- 更新員工資料：PUT /api/v1/users/:id
- 批量更新員工資料：PUT /api/v1/users/bulk-import
  
#### 3.課程管理
- 獲取課程列表：GET /api/v1/courses
- 獲取課程詳情：GET /api/v1/courses/:id
- 新增課程：POST /api/v1/courses
- 更新課程：PUT /api/v1/courses/:id
- 刪除課程：DELETE /api/v1/courses/:id
- 手動上架課程：PUT /api/v1/courses/:id/publish
- 手動下架課程：PUT /api/v1/courses/:id/unpublish
- 獲取推薦課程列表：GET /api/v1/courses/recommended
- 獲取推薦課程詳情：GET /api/v1/courses/recommended/:id
- 新增推薦課程：POST /api/v1/courses/recommended
- 更新推薦課程：PUT /api/v1/courses/recommended/:id
- 審核推薦課程：PUT /api/v1/courses/recommended/:id/approve
- 審核不通過推薦課程：PUT /api/v1/courses/recommended/:id/reject
- 上傳課程圖片：POST /api/v1/courses/upload
  
#### 4.點數管理
- 員工點數轉移：POST /api/v1/points/transfer
- 手動發放點數：POST /api/v1/points/manual-points

#### 5.其他
- 下載後台批量操作模板：GET /api/v1/download-template/:type



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
透過apidoc生成api文件，要使用的話需要先安裝apidoc
``` shell
npm install -g apidoc
```
生成api文件
``` shell
apidoc -i src -o icss-docs
```