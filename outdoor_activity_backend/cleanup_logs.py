"""
日志清理脚本
清理30天前的日志，避免数据库膨胀
"""
from datetime import datetime, timedelta
from utils import get_db_connection


def cleanup_old_logs(days=30):
    """清理旧日志"""
    try:
        print(f"\n===== 开始清理日志 =====")
        print(f"清理 {days} 天前的日志")

        cutoff_date = datetime.now() - timedelta(days=days)
        print(f"截止日期: {cutoff_date}")

        conn = get_db_connection()
        cursor = conn.cursor()

        # 清理操作日志
        cursor.execute("DELETE FROM operation_logs WHERE created_at < %s", (cutoff_date,))
        operation_count = cursor.rowcount
        print(f"清理操作日志: {operation_count} 条")

        # 清理错误日志
        cursor.execute("DELETE FROM error_logs WHERE created_at < %s", (cutoff_date,))
        error_count = cursor.rowcount
        print(f"清理错误日志: {error_count} 条")

        # 清理审计日志（保留更长时间，比如90天）
        audit_cutoff = datetime.now() - timedelta(days=90)
        cursor.execute("DELETE FROM audit_logs WHERE created_at < %s", (audit_cutoff,))
        audit_count = cursor.rowcount
        print(f"清理审计日志: {audit_count} 条")

        # 清理已发送的通知记录
        cursor.execute("""
            DELETE FROM notification_logs 
            WHERE created_at < %s AND status = 'sent'
        """, (cutoff_date,))
        notification_count = cursor.rowcount
        print(f"清理通知记录: {notification_count} 条")

        conn.commit()
        cursor.close()
        conn.close()

        print(f"===== 清理完成 =====")
        print(f"总计清理: {operation_count + error_count + audit_count + notification_count} 条")

        return True

    except Exception as e:
        print(f"清理日志异常: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    # 直接运行此脚本清理日志
    cleanup_old_logs()
