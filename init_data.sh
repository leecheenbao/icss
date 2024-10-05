#!/bin/bash

# 設置顏色輸出
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 函數: 執行命令並檢查結果
execute_command() {
    echo -e "${GREEN}執行: $1${NC}"
    if eval $1; then
        echo -e "${GREEN}成功: $1${NC}"
    else
        echo -e "${RED}失敗: $1${NC}"
        exit 1
    fi
}

# 停止所有正在運行的 Docker 容器
execute_command "docker stop \$(docker ps -aq)"

# 刪除所有 Docker 容器
execute_command "docker rm \$(docker ps -aq)"

# 刪除 node_modules 並重新安裝依賴
execute_command "rm -rf node_modules"
execute_command "npm install"

# 重置數據庫（假設您使用的是 PostgreSQL）
execute_command "rm -rf db_data"

# 重啟docker-compose
execute_command "docker-compose up -d"

# 清理緩存（如果有的話）
execute_command "npm cache clean --force"

# 等待資料庫啟動
echo -e "${GREEN}等待30秒!${NC}"

sleep 30

echo -e "${GREEN}環境重置完成!${NC}"