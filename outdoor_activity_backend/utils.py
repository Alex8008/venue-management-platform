import os
import time
import pymysql
from config import Config
from PIL import Image
from dbutils.pooled_db import PooledDB

# 全局连接池
_db_pool = None

def init_db_pool():
    """初始化数据库连接池"""
    global _db_pool
    if _db_pool is None:
        _db_pool = PooledDB(
            creator=pymysql,
            maxconnections=20,
            mincached=2,
            maxcached=10,
            maxshared=0,
            blocking=True,
            maxusage=None,
            setsession=[],
            ping=1,
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
    return _db_pool

def get_db_connection():
    """从连接池获取数据库连接"""
    pool = init_db_pool()
    return pool.connection()

def allowed_file(filename):
    """检查文件扩展名是否允许"""
    return '.' in filename and \
        filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS


def save_uploaded_file(file, folder='images'):
    """保存上传的文件"""
    if file and allowed_file(file.filename):
        # 生成唯一文件名 - 使用更精确的时间戳
        import random
        timestamp = int(time.time() * 1000)  # 毫秒级时间戳
        random_num = random.randint(1000, 9999)  # 4位随机数
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        filename = f"{folder}_{timestamp}_{random_num}.{file_extension}"

        print(f"[save_uploaded_file] 生成文件名: {filename}")

        # 确保上传目录存在
        upload_path = os.path.join(Config.UPLOAD_FOLDER, folder)
        os.makedirs(upload_path, exist_ok=True)

        # 保存文件
        file_path = os.path.join(upload_path, filename)
        file.save(file_path)

        print(f"[save_uploaded_file] 文件保存到: {file_path}")

        # 返回访问URL
        url = f"{Config.SERVER_HOST}/uploads/{folder}/{filename}"
        print(f"[save_uploaded_file] 返回URL: {url}")

        return url
    return None

def calculate_age_from_id_card(id_card):
    """从身份证号计算年龄"""
    try:
        birth_year = int(id_card[6:10])
        current_year = time.localtime().tm_year
        return current_year - birth_year
    except:
        return None

def get_gender_from_id_card(id_card):
    """从身份证号获取性别"""
    try:
        gender_digit = int(id_card[16])
        return '男' if gender_digit % 2 == 1 else '女'
    except:
        return None

def success_response(data=None, message="success"):
    """成功响应格式"""
    return {
        'success': True,
        'code': 200,
        'message': message,
        'data': data
    }

def error_response(message="error", code=400):
    """错误响应格式"""
    return {
        'success': False,
        'message': message,
        'code': code
    }