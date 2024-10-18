# 使用最新的 Node.js LTS 版本
FROM node:lts

WORKDIR /usr/src/app

# 复制 package.json 和 package-lock.json（如果存在）
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制项目文件到工作目录
COPY . .

# 复制等待脚本并设置执行权限
# COPY wait-for-db.sh /app/wait-for-db.sh
# RUN chmod +x /app/wait-for-db.sh

# 暴露 8080 端口
EXPOSE 8080

CMD ["node", "app.js"]
