CREATE DATABASE IF NOT EXISTS icss_db;
USE icss_db;

CREATE TABLE users (
  id int NOT NULL AUTO_INCREMENT COMMENT '員工ID',
  username varchar(255) NOT NULL COMMENT '員工姓名',
  passwordHash varchar(255) NOT NULL COMMENT'密碼',
  email varchar(255) NOT NULL COMMENT'電子信箱',
  otp_code VARCHAR(6) COMMENT 'OTP 驗證碼',
  role INT NOT NULL DEFAULT 0 COMMENT '用戶角色 0:user 1:admin -1:banned',
  points INT NOT NULL DEFAULT 0 COMMENT '員工點數',
  otpExpires timestamp NULL DEFAULT NULL COMMENT 'OTP過期時間',
  createdAt timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '創建時間',
  lastLogin timestamp NULL DEFAULT NULL COMMENT '最後登入時間',
  PRIMARY KEY (id),
  UNIQUE KEY username (username),
  UNIQUE KEY email (email)
) COMMENT = '員工資料表';

CREATE TABLE courses (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '課程唯一ID',
    title VARCHAR(255) NOT NULL COMMENT '課程標題',
    description TEXT COMMENT '課程描述',
    instructor VARCHAR(100) NOT NULL COMMENT '講者姓名',
    course_date DATE NOT NULL COMMENT '課程日期',
    image_url VARCHAR(255) COMMENT '課程圖片網址',
    max_participants INT COMMENT '最大報名人數',
    sign_up_start_date DATE NOT NULL COMMENT '報名開始日期',
    sign_up_end_date DATE NOT NULL COMMENT '報名截止日期',
    status INT DEFAULT 0 COMMENT '課程狀態 0:upcoming 1:closed 2:canceled',
    recommended_course_id INT COMMENT '推薦課程ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '創建時間',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最後更新時間'
) COMMENT = '課程資料表';

CREATE TABLE course_registrations (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '課程報名的唯一識別碼',
    user_id INT COMMENT '報名員工的ID，關聯至users表',
    course_id INT COMMENT '報名的課程ID，關聯至courses表',
    registration_status INT DEFAULT 0 COMMENT '報名狀態，0:upcoming 1:closed 2:canceled',
    points_deducted INT COMMENT '為報名扣除的點數',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '報名建立時間',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '報名資料最近更新時間',
    FOREIGN KEY (user_id) REFERENCES users(id)
) COMMENT = '員工課程報名及點數扣除狀況';

CREATE TABLE recommended_courses (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '推薦課程的唯一識別碼',
    user_id INT COMMENT '推薦課程的員工ID，關聯至users表',
    course_id INT COMMENT '推薦課程的課程ID，關聯至courses表',
    title VARCHAR(255) NOT NULL COMMENT '員工推薦課程的標題',
    description TEXT COMMENT '員工推薦課程的描述及內容介紹',
    instructor VARCHAR(100) COMMENT '員工推薦的講師',
    status INT DEFAULT 0 COMMENT '推薦課程的審核狀態，0:pending 1:approved 2:rejected',
    image_url VARCHAR(255) COMMENT '推薦課程的圖片URL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '推薦課程建立時間',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '推薦課程資料最近更新時間',
    FOREIGN KEY (user_id) REFERENCES users(id)
) COMMENT='員工推薦的課程，供人資審核';

CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '通知的唯一識別碼',
    user_id INT COMMENT '接收通知的員工ID，關聯至users表',
    message TEXT COMMENT '通知內容，包含點數變更或課程報名成功等訊息',
    is_read BOOLEAN DEFAULT FALSE COMMENT '通知是否已讀，預設為未讀',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '通知建立時間',
    FOREIGN KEY (user_id) REFERENCES users(id)
) COMMENT='系統通知，針對點數變更、課程報名等情況';

CREATE TABLE points_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '點數交易的唯一識別碼',
    from_user_id INT COMMENT '點數交易涉及的員工ID，關聯至users表',
    to_user_id INT COMMENT '點數交易涉及的員工ID，關聯至users表',
    points INT COMMENT '此次交易增加或減少的點數數量',
    transaction_type INT NOT NULL COMMENT '點數交易類型，1:add為增加，2:deduct為扣除，3:refund為退還',
    description TEXT COMMENT '點數交易描述，描述交易原因或詳情',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '點數交易建立時間',
    FOREIGN KEY (from_user_id) REFERENCES users(id),
    FOREIGN KEY (to_user_id) REFERENCES users(id)
) COMMENT='員工點數的交易記錄，包括報名課程扣點、退點等';