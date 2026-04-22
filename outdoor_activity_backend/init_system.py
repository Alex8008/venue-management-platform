"""
系统初始化脚本
创建必要的目录、检查配置
"""
import os
import sys
from config import Config


def init_directories():
    """初始化必要的目录"""
    directories = [
        Config.UPLOAD_FOLDER,
        os.path.join(Config.UPLOAD_FOLDER, 'images'),
        os.path.join(Config.UPLOAD_FOLDER, 'activity_photos'),
        os.path.join(Config.UPLOAD_FOLDER, 'avatars'),
        os.path.join(Config.UPLOAD_FOLDER, 'exports'),
        Config.BACKUP_DIR,
        'logs'
    ]

    print("===== 初始化目录结构 =====")

    for directory in directories:
        if not os.path.exists(directory):
            os.makedirs(directory)
            print(f"✓ 创建目录: {directory}")
        else:
            print(f"- 目录已存在: {directory}")

    print("目录初始化完成！\n")


def check_dependencies():
    """检查必要的Python包"""
    print("===== 检查依赖包 =====")

    required_packages = [
        'flask',
        'flask_cors',
        'pymysql',
        'dbutils',
        'openpyxl',
        'requests',
        'Pillow'
    ]

    missing_packages = []

    for package in required_packages:
        try:
            __import__(package.replace('_', '-'))
            print(f"✓ {package}")
        except ImportError:
            print(f"✗ {package} - 未安装")
            missing_packages.append(package)

    if missing_packages:
        print(f"\n缺少依赖包: {', '.join(missing_packages)}")
        print(f"请运行: pip install {' '.join(missing_packages)}")
        return False
    else:
        print("所有依赖包已安装！\n")
        return True


def test_database_connection():
    """测试数据库连接"""
    print("===== 测试数据库连接 =====")

    try:
        from utils import get_db_connection

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()

        print(f"✓ 数据库连接成功")
        print(f"  MySQL版本: {version}")

        cursor.close()
        conn.close()

        return True

    except Exception as e:
        print(f"✗ 数据库连接失败: {str(e)}")
        return False


def check_log_tables():
    """检查日志表是否存在"""
    print("\n===== 检查日志表 =====")

    try:
        from utils import get_db_connection

        conn = get_db_connection()
        cursor = conn.cursor()

        tables = [
            'operation_logs',
            'error_logs',
            'audit_logs',
            'notification_logs'
        ]

        for table in tables:
            cursor.execute(f"SHOW TABLES LIKE '{table}'")
            exists = cursor.fetchone()

            if exists:
                print(f"✓ {table}")
            else:
                print(f"✗ {table} - 不存在，请执行SQL创建")

        cursor.close()
        conn.close()

        return True

    except Exception as e:
        print(f"检查表失败: {str(e)}")
        return False


def main():
    """主函数"""
    print("\n" + "=" * 50)
    print("凌峰探险小程序 - 系统初始化")
    print("=" * 50 + "\n")

    # 1. 初始化目录
    init_directories()

    # 2. 检查依赖
    if not check_dependencies():
        print("\n❌ 初始化失败：缺少必要的依赖包")
        sys.exit(1)

    # 3. 测试数据库
    if not test_database_connection():
        print("\n❌ 初始化失败：无法连接数据库")
        sys.exit(1)

    # 4. 检查日志表
    check_log_tables()

    print("\n" + "=" * 50)
    print("✅ 系统初始化完成！")
    print("=" * 50 + "\n")

    print("下一步:")
    print("1. 如果日志表不存在，请执行SQL创建表")
    print("2. 配置 config.py 中的微信参数")
    print("3. 设置定时任务（crontab 或 Windows任务计划）")
    print("4. 运行: python app.py 启动服务")
    print("\n")


if __name__ == '__main__':
    main()
