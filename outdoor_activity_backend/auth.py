from functools import wraps
from flask import request, jsonify
import requests
from utils import get_db_connection, error_response
from config import Config


def get_current_user():
    """获取当前用户信息"""
    # 优先从header中获取openid
    openid = request.headers.get('OpenId', '')
    # 其次获取用户ID（兼容旧的方式）
    user_id = request.headers.get('User-Id', '')

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        user = None

        if openid:
            # 通过openid查找用户
            cursor.execute("SELECT * FROM users WHERE openid = %s", (openid,))
            user = cursor.fetchone()
        elif user_id:
            # 通过用户ID查找用户（兼容性）
            cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()

        cursor.close()
        conn.close()
        return user
    except Exception as e:
        print(f"获取用户信息失败: {e}")
        return None


def login_required(f):
    """登录验证装饰器"""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify(error_response("请先登录", 401)), 401
        request.current_user = user
        return f(*args, **kwargs)

    return decorated_function


def admin_required(f):
    """管理员权限验证装饰器"""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user or user['role'] != 'admin':
            return jsonify(error_response("需要管理员权限", 403)), 403
        request.current_user = user
        return f(*args, **kwargs)

    return decorated_function


def admin_or_teacher_required(f):
    """管理员或教练权限验证装饰器"""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify(error_response("请先登录", 401)), 401
        if user['role'] != 'admin' and user.get('user_type') != 'teacher':
            return jsonify(error_response("需要管理员或教练权限", 403)), 403
        request.current_user = user
        return f(*args, **kwargs)

    return decorated_function


def wechat_login(code):
    """微信登录，通过code获取openid"""
    try:
        # 调用微信API获取openid
        url = f"https://api.weixin.qq.com/sns/jscode2session"
        params = {
            'appid': Config.WECHAT_APP_ID,
            'secret': Config.WECHAT_APP_SECRET,
            'js_code': code,
            'grant_type': 'authorization_code'
        }

        response = requests.get(url, params=params)
        data = response.json()

        if 'openid' in data:
            return {
                'openid': data['openid'],
                'session_key': data.get('session_key', ''),
                'unionid': data.get('unionid', '')
            }
        else:
            return None
    except Exception as e:
        print(f"微信登录失败: {e}")
        return None


def create_or_update_wechat_user(openid, user_info):
    """创建或更新微信用户"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()


        # 检查用户是否已存在
        cursor.execute("SELECT * FROM users WHERE openid = %s", (openid,))
        existing_user = cursor.fetchone()


        if existing_user:
            # ★ 已有用户：不更新任何字段，直接返回用户ID
            # 所有个人信息保持不变，避免重新登录导致信息被重置
            user_id = existing_user['id']
            print(f"已有用户登录，ID={user_id}，不更新任何信息")
        else:
            # 新用户：创建
            nick_name = user_info.get('nickName', '微信用户')
            avatar_url = user_info.get('avatarUrl', '')
            gender_code = user_info.get('gender', 0)
            gender = '男' if gender_code == 1 else ('女' if gender_code == 2 else None)
            phone = user_info.get('phone', '')


            if not phone:
                import random
                phone = f"t{random.randint(100000000, 999999999)}"


            cursor.execute("""
                INSERT INTO users 
                (real_name, phone, gender, avatar_url, openid, role, user_type) 
                VALUES (%s, %s, %s, %s, %s, 'user', 'user')
            """, (nick_name, phone, gender, avatar_url, openid))
            user_id = cursor.lastrowid
            print(f"新用户创建，ID={user_id}")


        conn.commit()
        cursor.close()
        conn.close()


        return user_id
    except Exception as e:
        print(f"创建/更新微信用户失败: {e}")
        import traceback
        traceback.print_exc()
        return None


