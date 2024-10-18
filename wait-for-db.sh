#!/bin/sh
# 等待30秒後啟動
echo "等待30秒資料庫初始化後服務啟動"
for i in 30 25 20 15 10 5 0
do
    echo "還剩 $i 秒..."
    if [ $i -ne 0 ]; then
        sleep 5
    fi
done
echo "icss-app 服務啟動"