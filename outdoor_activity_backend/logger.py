"""
日志工具类
用于记录操作日志、错误日志、审计日志
"""
import traceback
from datetime import datetime
from flask import request
from utils import get_db_connection


class Logger:
    """日志记录器"""

    @staticmethod
    def get_client_ip():
        """获取客户端IP"""
        if request.headers.get('X-Forwarded-For'):
            return request.headers.get('X-Forwarded-For').split(',')[0]
        return request.remote_addr

    @staticmethod
    def log_operation(user_id, user_name, operation_type, operation_module, operation_desc,
                     request_params=None):
        """记录操作日志"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO operation_logs 
                (user_id, user_name, operation_type, operation_module, operation_desc, 
                 request_method, request_url, request_params, ip_address)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                user_id,
                user_name,
                operation_type,
                operation_module,
                operation_desc,
                request.method,
                request.url,
                str(request_params) if request_params else None,
                Logger.get_client_ip()
            ))

            conn.commit()
            cursor.close()
            conn.close()
        except Exception as e:
            print(f"记录操作日志失败: {str(e)}")

    @staticmethod
    def log_error(user_id, error_type, error_message, error_stack=None, request_params=None):
        """记录错误日志"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO error_logs 
                (user_id, error_type, error_message, error_stack, request_url, request_params, ip_address)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                user_id,
                error_type,
                error_message,
                error_stack,
                request.url,
                str(request_params) if request_params else None,
                Logger.get_client_ip()
            ))

            conn.commit()
            cursor.close()
            conn.close()
        except Exception as e:
            print(f"记录错误日志失败: {str(e)}")

    @staticmethod
    def log_audit(user_id, user_name, action, target_type, target_id=None,
                  old_value=None, new_value=None):
        """记录审计日志（敏感操作）"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO audit_logs 
                (user_id, user_name, action, target_type, target_id, old_value, new_value, ip_address)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                user_id,
                user_name,
                action,
                target_type,
                target_id,
                str(old_value) if old_value else None,
                str(new_value) if new_value else None,
                Logger.get_client_ip()
            ))

            conn.commit()
            cursor.close()
            conn.close()
        except Exception as e:
            print(f"记录审计日志失败: {str(e)}")

    @staticmethod
    def log_exception(e, user_id=None, extra_info=None):
        """记录异常（自动获取堆栈）"""
        error_stack = traceback.format_exc()
        Logger.log_error(
            user_id=user_id,
            error_type=type(e).__name__,
            error_message=str(e),
            error_stack=error_stack,
            request_params=extra_info
        )


def log_api_call(operation_type, operation_module):
    """
    API调用日志装饰器
    自动记录操作日志和捕获异常
    """

    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            from auth import get_current_user

            user = get_current_user()
            user_id = user['id'] if user else None
            user_name = user.get('real_name', '游客') if user else '游客'

            try:
                # 执行原函数
                result = f(*args, **kwargs)

                # 记录成功的操作
                Logger.log_operation(
                    user_id=user_id,
                    user_name=user_name,
                    operation_type=operation_type,
                    operation_module=operation_module,
                    operation_desc=f"{operation_type} - 成功",
                    request_params=request.get_json() if request.method == 'POST' else request.args.to_dict()
                )

                return result

            except Exception as e:
                # 记录错误日志
                Logger.log_exception(
                    e,
                    user_id=user_id,
                    extra_info={
                        'operation_type': operation_type,
                        'operation_module': operation_module,
                        'request_data': request.get_json() if request.method == 'POST' else request.args.to_dict()
                    }
                )

                # 重新抛出异常
                raise

        return wrapped

    return decorator
