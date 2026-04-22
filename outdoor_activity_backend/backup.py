"""
数据库自动备份脚本
使用 cron 或 Windows 任务计划程序定时执行
"""
import os
import subprocess
from datetime import datetime
from config import Config


def backup_database():
    """备份数据库"""
    try:
        # 生成备份文件名
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_dir = 'backups'
        os.makedirs(backup_dir, exist_ok=True)

        backup_file = os.path.join(backup_dir, f'backup_{timestamp}.sql')

        # 构建mysqldump命令
        dump_cmd = [
            'mysqldump',
            '-h', Config.DB_HOST,
            '-u', Config.DB_USER,
            f'-p{Config.DB_PASSWORD}',
            '--databases', Config.DB_NAME,
            '--result-file', backup_file,
            '--single-transaction',
            '--quick',
            '--lock-tables=false'
        ]

        print(f"\n===== 开始备份数据库 =====")
        print(f"时间: {datetime.now()}")
        print(f"备份文件: {backup_file}")

        # 执行备份
        result = subprocess.run(dump_cmd, capture_output=True, text=True)

        if result.returncode == 0:
            file_size = os.path.getsize(backup_file)
            print(f"备份成功！文件大小: {file_size / 1024 / 1024:.2f} MB")

            # 清理30天前的备份
            cleanup_old_backups(backup_dir, days=30)

            return True
        else:
            print(f"备份失败: {result.stderr}")
            return False

    except Exception as e:
        print(f"备份异常: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def cleanup_old_backups(backup_dir, days=30):
    """清理旧备份文件"""
    try:
        import time

        cutoff_time = time.time() - (days * 24 * 60 * 60)
        deleted_count = 0

        for filename in os.listdir(backup_dir):
            if filename.startswith('backup_') and filename.endswith('.sql'):
                filepath = os.path.join(backup_dir, filename)
                file_time = os.path.getmtime(filepath)

                if file_time < cutoff_time:
                    os.remove(filepath)
                    deleted_count += 1
                    print(f"删除旧备份: {filename}")

        if deleted_count > 0:
            print(f"清理完成，删除了 {deleted_count} 个旧备份文件")

    except Exception as e:
        print(f"清理旧备份失败: {str(e)}")


if __name__ == '__main__':
    # 直接运行此脚本进行备份
    backup_database()
