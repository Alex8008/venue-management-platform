"""
消息通知工具类
支持：短信、邮件、微信模板消息、站内通知
"""
import requests
from utils import get_db_connection, success_response, error_response
from config import Config


class Notifier:
    """消息通知器"""

    @staticmethod
    def record_notification(user_id, notification_type, title, content):
        """记录通知到数据库"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO notification_logs 
                (user_id, notification_type, title, content, status)
                VALUES (%s, %s, %s, %s, 'pending')
            """, (user_id, notification_type, title, content))

            notification_id = cursor.lastrowid

            conn.commit()
            cursor.close()
            conn.close()

            return notification_id
        except Exception as e:
            print(f"记录通知失败: {str(e)}")
            return None

    @staticmethod
    def update_notification_status(notification_id, status, error_message=None):
        """更新通知发送状态"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            if status == 'sent':
                cursor.execute("""
                    UPDATE notification_logs 
                    SET status = %s, sent_at = NOW()
                    WHERE id = %s
                """, (status, notification_id))
            else:
                cursor.execute("""
                    UPDATE notification_logs 
                    SET status = %s, error_message = %s
                    WHERE id = %s
                """, (status, error_message, notification_id))

            conn.commit()
            cursor.close()
            conn.close()
        except Exception as e:
            print(f"更新通知状态失败: {str(e)}")

    @staticmethod
    def send_wechat_template_message(openid, template_id, data, page=None):
        """
        发送微信模板消息
        需要：企业认证的小程序 + 模板消息权限
        """
        try:
            # 获取access_token
            token_url = f"https://api.weixin.qq.com/cgi-bin/token"
            token_params = {
                'grant_type': 'client_credential',
                'appid': Config.WECHAT_APP_ID,
                'secret': Config.WECHAT_APP_SECRET
            }

            token_response = requests.get(token_url, params=token_params)
            token_data = token_response.json()

            if 'access_token' not in token_data:
                print(f"获取access_token失败: {token_data}")
                return False

            access_token = token_data['access_token']

            # 发送模板消息
            msg_url = f"https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send?access_token={access_token}"

            msg_data = {
                'touser': openid,
                'template_id': template_id,
                'data': data
            }

            if page:
                msg_data['page'] = page

            response = requests.post(msg_url, json=msg_data)
            result = response.json()

            if result.get('errcode') == 0:
                print(f"模板消息发送成功: {openid}")
                return True
            else:
                print(f"模板消息发送失败: {result}")
                return False

        except Exception as e:
            print(f"发送模板消息异常: {str(e)}")
            return False

    @staticmethod
    def send_registration_approved(user_id, activity_title):
        """发送报名审核通过通知"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute("SELECT openid, real_name FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()

            cursor.close()
            conn.close()

            if not user or not user['openid']:
                print(f"用户{user_id}没有openid，无法发送微信通知")
                return False

            # 记录通知
            notification_id = Notifier.record_notification(
                user_id,
                'registration_approved',
                '报名审核通过',
                f'您报名的活动"{activity_title}"已审核通过'
            )

            # 发送微信模板消息（需要配置模板ID）
            # 这里使用订阅消息作为替代方案

            # 更新为已发送（暂时标记为成功）
            Notifier.update_notification_status(notification_id, 'sent')

            print(f"通知已记录: 用户{user['real_name']}的报名审核通过")

            return True

        except Exception as e:
            print(f"发送报名通过通知失败: {str(e)}")
            if notification_id:
                Notifier.update_notification_status(notification_id, 'failed', str(e))
            return False

    @staticmethod
    def send_refund_approved(user_id, activity_title, amount):
        """发送退款审核通过通知"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute("SELECT real_name FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()

            cursor.close()
            conn.close()

            if not user:
                return False

            notification_id = Notifier.record_notification(
                user_id,
                'refund_approved',
                '退款审核通过',
                f'您的退款申请已通过，退款金额：￥{amount}'
            )

            Notifier.update_notification_status(notification_id, 'sent')

            print(f"通知已记录: 用户{user['real_name']}的退款审核通过")

            return True

        except Exception as e:
            print(f"发送退款通知失败: {str(e)}")
            return False

    @staticmethod
    def send_refund_rejected(user_id, item_title, reject_reason):
        """发送退款被拒绝通知"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()


            cursor.execute("SELECT real_name FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()


            cursor.close()
            conn.close()


            if not user:
                return False


            notification_id = Notifier.record_notification(
                user_id,
                'refund_rejected',
                '退款申请被拒绝',
                f'您的退款申请"{item_title}"已被拒绝。\n拒绝原因：{reject_reason}'
            )


            Notifier.update_notification_status(notification_id, 'sent')


            print(f"通知已记录: 用户{user['real_name']}的退款被拒绝 - {item_title}")


            return True


        except Exception as e:
            print(f"发送退款拒绝通知失败: {str(e)}")
            return False

    @staticmethod
    def send_insurance_approved(user_id):
        """发送保险审核通过通知"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute("SELECT real_name FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()

            cursor.close()
            conn.close()

            if not user:
                return False

            notification_id = Notifier.record_notification(
                user_id,
                'insurance_approved',
                '保险凭证审核通过',
                '您提交的保险凭证已审核通过'
            )

            Notifier.update_notification_status(notification_id, 'sent')

            print(f"通知已记录: 用户{user['real_name']}的保险审核通过")

            return True

        except Exception as e:
            print(f"发送保险通知失败: {str(e)}")
            return False

    @staticmethod
    def notify_admin_new_registration(activity_title, user_name, item_type='活动'):
        """通知管理员有新报名"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            # 获取所有管理员
            cursor.execute("SELECT id, real_name FROM users WHERE role = 'admin'")
            admins = cursor.fetchall()

            cursor.close()
            conn.close()

            for admin in admins:
                notification_id = Notifier.record_notification(
                    admin['id'],
                    'new_registration',
                    f'新的{item_type}报名待审核',
                    f'用户"{user_name}"报名了{item_type}"{activity_title}"，请及时审核'
                )

                Notifier.update_notification_status(notification_id, 'sent')

            print(f"已通知{len(admins)}个管理员：新{item_type}报名 - {activity_title}")

            return True

        except Exception as e:
            print(f"通知管理员失败: {str(e)}")
            return False

    @staticmethod
    def notify_course_booking(course_title, user_name, teacher_id):
        """通知教练和管理员有新课程预约"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            # 通知教练
            cursor.execute("SELECT id, real_name FROM users WHERE id = %s", (teacher_id,))
            teacher = cursor.fetchone()

            if teacher:
                notification_id = Notifier.record_notification(
                    teacher['id'],
                    'new_course_booking',
                    '新的课程预约待审核',
                    f'用户"{user_name}"预约了课程"{course_title}"，请及时审核'
                )
                Notifier.update_notification_status(notification_id, 'sent')
                print(f"已通知教练{teacher['real_name']}：新课程预约 - {course_title}")

            # 同时通知管理员
            cursor.execute("SELECT id, real_name FROM users WHERE role = 'admin'")
            admins = cursor.fetchall()

            for admin in admins:
                notification_id = Notifier.record_notification(
                    admin['id'],
                    'new_course_booking',
                    '新的课程预约待审核',
                    f'用户"{user_name}"预约了课程"{course_title}"，请及时审核'
                )
                Notifier.update_notification_status(notification_id, 'sent')

            print(f"已通知{len(admins)}个管理员：新课程预约 - {course_title}")

            cursor.close()
            conn.close()

            return True

        except Exception as e:
            print(f"通知课程预约失败: {str(e)}")
            return False

    @staticmethod
    def notify_admin_new_refund(activity_title, user_name, amount):
        """通知管理员有新退款申请"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute("SELECT id, real_name FROM users WHERE role = 'admin'")
            admins = cursor.fetchall()

            cursor.close()
            conn.close()

            for admin in admins:
                notification_id = Notifier.record_notification(
                    admin['id'],
                    'new_refund',
                    '新的退款待审核',
                    f'用户"{user_name}"申请退款活动"{activity_title}"，金额：￥{amount}'
                )

                Notifier.update_notification_status(notification_id, 'sent')

            print(f"已通知{len(admins)}个管理员：新退款申请 - {activity_title}")

            return True

        except Exception as e:
            print(f"通知管理员失败: {str(e)}")
            return False

    @staticmethod
    def notify_admin_new_insurance(user_name):
        """通知管理员有新保险凭证待审核"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute("SELECT id, real_name FROM users WHERE role = 'admin'")
            admins = cursor.fetchall()

            cursor.close()
            conn.close()

            for admin in admins:
                notification_id = Notifier.record_notification(
                    admin['id'],
                    'new_insurance',
                    '新的保险凭证待审核',
                    f'用户"{user_name}"提交了保险凭证，请及时审核'
                )

                Notifier.update_notification_status(notification_id, 'sent')

            print(f"已通知{len(admins)}个管理员：新保险凭证 - {user_name}")

            return True

        except Exception as e:
            print(f"通知管理员失败: {str(e)}")
            return False

    @staticmethod
    def send_delivery_notification(teacher_id, user_name, product_name, order_no):
        """通知教练有新配送单（站内通知）"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()


            cursor.execute("SELECT id, real_name FROM users WHERE id = %s", (teacher_id,))
            teacher = cursor.fetchone()


            if teacher:
                notification_id = Notifier.record_notification(
                    teacher['id'],
                    'new_delivery',
                    '新的餐饮配送单',
                    f'用户"{user_name}"购买了"{product_name}"（订单号:{order_no}），请及时配送'
                )
                Notifier.update_notification_status(notification_id, 'sent')
                print(f"已通知教练{teacher['real_name']}：新配送单 - {product_name}")


            # 同时通知所有管理员
            cursor.execute("SELECT id FROM users WHERE role = 'admin'")
            admins = cursor.fetchall()
            for admin in admins:
                nid = Notifier.record_notification(
                    admin['id'],
                    'new_delivery',
                    '新的餐饮配送单',
                    f'用户"{user_name}"购买了"{product_name}"（订单号:{order_no}），配送教练已通知'
                )
                Notifier.update_notification_status(nid, 'sent')


            cursor.close()
            conn.close()
            return True
        except Exception as e:
            print(f"发送配送通知失败: {str(e)}")
            return False
