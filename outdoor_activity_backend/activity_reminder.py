"""
活动提醒定时任务
每天检查明天开始的活动，发送提醒通知
"""
from datetime import datetime, timedelta
from utils import get_db_connection
from notifier import Notifier


def send_activity_reminders():
    """发送活动提醒（活动开始前1天）"""
    try:
        print(f"\n===== 开始检查活动提醒 =====")
        print(f"当前时间: {datetime.now()}")

        conn = get_db_connection()
        cursor = conn.cursor()

        # 获取明天开始的活动
        tomorrow_start = datetime.now().replace(hour=0, minute=0, second=0) + timedelta(days=1)
        tomorrow_end = tomorrow_start + timedelta(days=1)

        print(f"查询时间范围: {tomorrow_start} ~ {tomorrow_end}")

        cursor.execute("""
            SELECT DISTINCT a.id, a.title, a.activity_start, ua.user_id, u.real_name, u.openid
            FROM activities a
            JOIN user_activities ua ON a.id = ua.activity_id
            JOIN users u ON ua.user_id = u.id
            WHERE ua.status = 'approved'
            AND a.activity_start >= %s
            AND a.activity_start < %s
            ORDER BY a.activity_start
        """, (tomorrow_start, tomorrow_end))

        reminders = cursor.fetchall()

        print(f"找到 {len(reminders)} 条待提醒记录")

        sent_count = 0

        for reminder in reminders:
            try:
                # 记录通知
                notification_id = Notifier.record_notification(
                    user_id=reminder['user_id'],
                    notification_type='activity_reminder',
                    title='活动即将开始',
                    content=f'您报名的活动"{reminder["title"]}"将于明天开始，请做好准备！'
                )

                # 这里可以调用微信订阅消息API发送通知
                # 暂时只记录到数据库

                Notifier.update_notification_status(notification_id, 'sent')
                sent_count += 1

                print(f"提醒用户: {reminder['real_name']} - {reminder['title']}")

            except Exception as e:
                print(f"发送提醒失败: {str(e)}")
                continue

        cursor.close()
        conn.close()

        print(f"===== 活动提醒完成 =====")
        print(f"成功发送: {sent_count} 条")

        return sent_count

    except Exception as e:
        print(f"活动提醒异常: {str(e)}")
        import traceback
        traceback.print_exc()
        return 0


if __name__ == '__main__':
    # 直接运行此脚本发送提醒
    send_activity_reminders()
