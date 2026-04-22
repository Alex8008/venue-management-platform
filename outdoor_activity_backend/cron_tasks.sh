#!/bin/bash

# ======================================
# 凌峰探险小程序定时任务脚本
# ======================================

# 设置Python环境
PYTHON_PATH="/Users/alex/anaconda3/envs/test/bin/python"
PROJECT_PATH="/Users/alex/PycharmProjects/outdoor_activity_backend"

# 设置日志目录
LOG_DIR="${PROJECT_PATH}/logs"

# 确保日志目录存在
mkdir -p $LOG_DIR

# 获取当前时间
NOW=$(date +"%Y-%m-%d %H:%M:%S")

echo "======================================"
echo "定时任务执行时间: $NOW"
echo "Python路径: $PYTHON_PATH"
echo "项目路径: $PROJECT_PATH"
echo "======================================"

# 函数：执行备份
backup_database() {
    echo ">>> 开始执行数据库备份..."
    cd $PROJECT_PATH
    $PYTHON_PATH backup.py >> $LOG_DIR/backup.log 2>&1
    if [ $? -eq 0 ]; then
        echo "✓ 数据库备份成功"
    else
        echo "✗ 数据库备份失败"
    fi
}

# 函数：清理日志
cleanup_logs() {
    echo ">>> 开始清理旧日志..."
    cd $PROJECT_PATH
    $PYTHON_PATH cleanup_logs.py >> $LOG_DIR/cleanup.log 2>&1
    if [ $? -eq 0 ]; then
        echo "✓ 日志清理成功"
    else
        echo "✗ 日志清理失败"
    fi
}

# 函数：发送活动提醒
send_reminders() {
    echo ">>> 开始发送活动提醒..."
    cd $PROJECT_PATH
    $PYTHON_PATH activity_reminder.py >> $LOG_DIR/reminder.log 2>&1
    if [ $? -eq 0 ]; then
        echo "✓ 活动提醒发送成功"
    else
        echo "✗ 活动提醒发送失败"
    fi
}

# 根据参数执行不同任务
case "$1" in
    backup)
        backup_database
        ;;
    cleanup)
        cleanup_logs
        ;;
    reminder)
        send_reminders
        ;;
    all)
        backup_database
        cleanup_logs
        send_reminders
        ;;
    *)
        echo "用法: $0 {backup|cleanup|reminder|all}"
        exit 1
        ;;
esac

echo "======================================"
echo "任务执行完成"
echo "======================================"
