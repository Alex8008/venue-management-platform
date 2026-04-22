# AI_MASTER_MAP.md — 凌峰探险项目全量审计文档

> 本文件是未来所有 AI 协作的"灵魂文档"，包含完整的代码地图、数据库全景、已解决 Bug 记录、未完成需求及技术陷阱。
>
> **最后更新**：2026-03-24（Bug #12 + 改版 #17：赠送弹窗事件穿透修复/课程人员详情增强/课程状态CSS/咨询信息自定义编辑弹窗/会员卡编辑输入框居中灰色/课程预约数字隐藏）

---

## 目录

1. [项目概览](#1-项目概览)
2. [后端代码地图](#2-后端代码地图)
3. [前端代码地图](#3-前端代码地图)
4. [数据库全景图](#4-数据库全景图)
5. [已解决的 Bug 历史记录](#5-已解决的-bug-历史记录)
6. [未完成的需求清单](#6-未完成的需求清单)
7. [技术选型与陷阱](#7-技术选型与陷阱)

---

## 1. 项目概览

| 项 | 值 |
|---|---|
| 项目名称 | 凌峰探险（微信小程序 + Flask 后端） |
| 后端路径 | `~/PycharmProjects/outdoor_activity_backend/` |
| 前端路径 | `~/WeChatProjects/miniprogram-3/` |
| 后端技术栈 | Python 3 / Flask / PyMySQL / DBUtils (PooledDB) / openpyxl / Pillow / requests / cryptography（WeChat Pay V3 签名） |
| 前端技术栈 | 微信小程序原生开发（WXML + WXSS + JS） |
| 数据库 | MySQL 8.0 `outdoor_activities` @ localhost |
| 后端端口 | 5001 |
| 认证机制 | 请求头 `OpenId` 或 `User-Id`，后端 `@login_required` / `@admin_required` 装饰器 |

### 目录结构

```
outdoor_activity_backend/
├── app.py                 # 主应用（所有 90+ 路由）
├── auth.py                # 认证模块
├── utils.py               # 工具函数（DB 连接池、文件上传、响应格式）
├── config.py              # 配置（含微信支付V3参数）
├── wechat_pay.py          # 微信支付V3模块（JSAPI下单、签名、回调验签解密、退款）
├── logger.py              # 日志模块
├── notifier.py            # 通知模块（含课程预约通知教练+管理员）
├── activity_reminder.py   # 定时任务：活动提醒
├── backup.py              # 定时任务：数据库备份
├── cleanup_logs.py        # 定时任务：日志清理
├── init_system.py         # 系统初始化检查
├── main.py                # PyCharm 生成的占位文件（未使用）
├── .env.local             # 本地环境变量（含微信支付密钥路径，不提交到仓库）
├── certs/                 # 微信支付证书目录（不提交到仓库）
│   ├── apiclient_key.pem  # 商户私钥
│   └── pub_key.pem        # 微信支付平台公钥
├── migrations/            # 数据库迁移脚本
│   ├── 001_add_teacher_courses_system.sql
│   └── 002_add_product_categories.sql
├── uploads/               # 上传文件目录
│   ├── images/
│   ├── activity_photos/
│   ├── avatars/
│   └── exports/
├── backups/               # 数据库备份目录
└── logs/                  # 日志目录

miniprogram-3/
├── app.js / app.json / app.wxss
├── utils/
│   ├── api.js             # 70+ API 调用方法
│   └── payment.js         # 微信支付封装（triggerPayment）
├── pages/                 # 47 个页面（含 order-detail, course-participants, teacher-activity-management）
└── images/                # 静态资源
```

---

## 2. 后端代码地图

### 2.1 app.py — 全部 API 路由（96 个）

#### 静态文件
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| GET | `/uploads/<path:filename>` | `uploaded_file` | 无 |

#### 认证模块 `/api/auth/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| GET | `/api/auth/check` | `check_auth` | 无 |
| GET | `/api/auth/admin-check` | `check_admin` | `@admin_required` |
| POST | `/api/auth/wechat-login` | `wechat_login_api` | 无 |
| POST | `/api/auth/password-login` | `password_login` | 无 |
| POST | `/api/auth/logout` | `logout` | 无 |

#### 活动模块 `/api/activities/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| GET | `/api/activities` | `get_activities` | 无 |
| GET | `/api/activities/carousel` | `get_carousel_activities` | 无 |
| GET | `/api/activities/<id>` | `get_activity_detail` | 无 |
| POST | `/api/activities/<id>/register` | `register_activity` | `@login_required` + rate_limit |
| GET | `/api/activities/<id>/photos` | `get_activity_photos` | 无 |
| POST | `/api/activities/<id>/photos` | `upload_activity_photo` | `@login_required` |

#### 用户模块 `/api/users/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| GET | `/api/users/profile` | `get_user_profile` | `@login_required` |
| PUT | `/api/users/profile` | `update_user_profile` | `@login_required` |
| GET | `/api/users/activities` | `get_user_activities` | `@login_required` |
| POST | `/api/users/activities/<id>/cancel` | `cancel_activity_registration` | `@login_required` |
| POST | `/api/users/activities/<id>/refund` | `request_refund` | `@login_required` |
| GET | `/api/users/insurance-status` | `get_user_insurance_status` | `@login_required` |
| GET | `/api/users/training-stats` | `get_user_training_stats` | `@login_required` |
| PUT | `/api/users/<id>/set-type` | `set_user_type` | `@admin_required` |
| GET | `/api/users/<id>/history` | `get_user_history` | `@admin_required` |

#### 商品模块 `/api/products/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| GET | `/api/products` | `get_products` | 无 |
| GET | `/api/products/<id>` | `get_product_detail` | 无 |

#### 商品分类 `/api/product-categories/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| GET | `/api/product-categories` | `get_product_categories` | 无 |
| POST | `/api/product-categories` | `create_product_category` | `@admin_required` |
| PUT | `/api/product-categories/<id>` | `update_product_category` | `@admin_required` |
| DELETE | `/api/product-categories/<id>` | `delete_product_category` | `@admin_required` |

#### 购物车 `/api/cart/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| GET | `/api/cart` | `get_cart` | `@login_required` |
| POST | `/api/cart` | `add_to_cart` | `@login_required` |
| PUT | `/api/cart/<id>` | `update_cart_item` | `@login_required` |
| DELETE | `/api/cart/<id>` | `delete_cart_item` | `@login_required` |

#### 订单 `/api/orders/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| POST | `/api/orders` | `create_order` | `@login_required` |
| GET | `/api/orders` | `get_user_orders` | `@login_required` |
| DELETE | `/api/orders/<id>` | `delete_order` | `@login_required` |

#### 收货地址 `/api/addresses/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| GET | `/api/addresses` | `get_user_addresses` | `@login_required` |
| POST | `/api/addresses` | `create_address` | `@login_required` |
| PUT | `/api/addresses/<id>` | `update_address` | `@login_required` |
| DELETE | `/api/addresses/<id>` | `delete_address` | `@login_required` |

#### 保险凭证 `/api/insurance-submissions/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| POST | `/api/insurance-submissions` | `submit_insurance` | `@login_required` |
| GET | `/api/insurance-submissions` | `get_insurance_submissions` | `@login_required` |

#### 通知 `/api/notifications/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| GET | `/api/notifications` | `get_user_notifications` | `@login_required` |
| PUT | `/api/notifications/<id>/read` | `mark_notification_as_read` | `@login_required` |

#### 支付 `/api/payment/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| POST | `/api/payment/create-order` | `create_payment_order` | `@login_required` |
| POST | `/api/payment/callback` | `payment_callback` | 无 |

#### 文件上传 `/api/upload/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| POST | `/api/upload/image` | `upload_image` | 无 |
| POST | `/api/upload/avatar` | `upload_avatar` | `@login_required` |

#### 筛选分类 `/api/filter-categories/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| GET | `/api/filter-categories` | `get_filter_categories` | 无 |
| POST | `/api/filter-categories` | `create_filter_category` | `@admin_required` |
| PUT | `/api/filter-categories/<id>` | `update_filter_category` | `@admin_required` |
| DELETE | `/api/filter-categories/<id>` | `delete_filter_category` | `@admin_required` |

#### 教练 `/api/teachers/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| GET | `/api/teachers` | `get_teachers` | 无 |
| GET | `/api/teachers/<id>` | `get_teacher_detail` | 无 |
| PUT | `/api/teachers/<id>/profile` | `update_teacher_profile` | `@login_required` |

#### 教练课程 `/api/teacher-courses/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| GET | `/api/teacher-courses` | `get_teacher_courses` | 无 |
| GET | `/api/teacher-courses/<id>` | `get_teacher_course_detail` | 无 |
| POST | `/api/teacher-courses` | `create_teacher_course` | `@login_required` |
| PUT | `/api/teacher-courses/<id>` | `update_teacher_course` | `@login_required` |
| DELETE | `/api/teacher-courses/<id>` | `delete_teacher_course` | `@login_required` |
| GET | `/api/teacher-courses/<id>/available-times` | `get_available_times` | 无 |
| POST | `/api/teacher-courses/<id>/schedules` | `create_course_schedule` | `@login_required` |
| GET | `/api/teacher-courses/<id>/participants` | `get_course_participants` | `@login_required` |

#### 会员卡 `/api/membership-cards/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| GET | `/api/membership-cards` | `get_membership_cards` | 无 |
| GET | `/api/membership-cards/<id>` | `get_membership_card_detail` | 无 |
| POST | `/api/membership-cards` | `create_membership_card` | `@admin_required` |
| PUT | `/api/membership-cards/<id>` | `update_membership_card` | `@admin_required` |
| DELETE | `/api/membership-cards/<id>` | `delete_membership_card` | `@admin_required` |
| POST | `/api/membership-cards/<id>/purchase` | `purchase_membership_card` | `@login_required` |

#### 用户会员卡 `/api/user-membership-cards/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| GET | `/api/user-membership-cards` | `get_user_membership_cards` | `@login_required` |
| GET | `/api/user-membership-cards/check` | `check_membership_card` | `@login_required` |
| PUT | `/api/user-membership-cards/<id>/activate` | `activate_user_membership_card` | `@login_required` |

#### 课程预约 `/api/course-bookings/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| POST | `/api/course-bookings` | `create_course_booking` | `@login_required` |
| GET | `/api/course-bookings` | `get_course_bookings` | `@login_required` |
| PUT | `/api/course-bookings/<id>/approve` | `approve_course_booking` | `@login_required` |
| PUT | `/api/course-bookings/<id>/reject` | `reject_course_booking` | `@login_required` |
| POST | `/api/course-booking/<id>/refund` | `request_course_refund` | `@login_required` |

#### 商品订单退款 `/api/order/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| POST | `/api/order/<id>/refund` | `request_order_refund` | `@login_required` |

> **注意**：`GET /api/course-bookings` 的 `role` 参数支持 3 个值：
> - `'user'`（默认）：按 `user_id` 过滤，返回用户自己的预约
> - `'teacher'`：按 `teacher_id` 过滤，返回教练名下的预约
> - `'admin'`：不过滤，返回所有预约（需要 admin 权限）
>
> 返回格式为分页对象 `{list: [...], total, page, limit}`，**不是**直接数组。

#### 场馆内容 `/api/venue-content/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| GET | `/api/venue-content` | `get_venue_content` | 无 |
| POST | `/api/venue-content` | `create_venue_content` | `@admin_required` |
| PUT | `/api/venue-content/<id>` | `update_venue_content` | `@admin_required` |
| DELETE | `/api/venue-content/<id>` | `delete_venue_content` | `@admin_required` |

#### 配送订单 `/api/delivery-orders/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| POST | `/api/delivery-orders` | `create_delivery_order` | `@login_required` |
| GET | `/api/delivery-orders` | `get_delivery_orders` | `@login_required` |
| PUT | `/api/delivery-orders/<id>/confirm` | `confirm_delivery_order` | `@login_required` |

#### 用户积分 `/api/user-points/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| GET | `/api/user-points/current` | `get_current_points` | `@login_required` |
| GET | `/api/user-points` | `get_user_points_history` | `@login_required` |

#### 站点设置 `/api/site-settings/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| GET | `/api/site-settings/consult-info` | `get_consult_info` | 无 |
| PUT | `/api/site-settings/consult-info` | `update_consult_info` | `@admin_required` |

#### 管理员 — 活动 `/api/admin/activities/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| GET | `/api/admin/activities` | `admin_get_activities` | `@admin_required` |
| POST | `/api/admin/activities` | `admin_create_activity` | `@admin_required` |
| PUT | `/api/admin/activities/<id>` | `admin_update_activity` | `@admin_required` |
| DELETE | `/api/admin/activities/<id>` | `admin_delete_activity` | `@admin_required` |
| PUT | `/api/admin/activities/reorder` | `admin_reorder_activities` | `@admin_required` |
| POST | `/api/admin/activities/<id>/save-as-new` | `admin_save_activity_as_new` | `@admin_required` |
| POST | `/api/admin/activities/<id>/copy` | `admin_copy_activity` | `@admin_required` |
| GET | `/api/admin/activities/<id>/export-insurance` | `export_insurance` | `@admin_required` |
| GET | `/api/admin/activities/<id>/export-no-insurance` | `export_no_insurance` | `@admin_required` |

#### 管理员 — 报名审核 `/api/admin/registrations/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| GET | `/api/admin/registrations` | `admin_get_registrations` | `@admin_required` |
| PUT | `/api/admin/registrations/<id>/review` | `admin_review_registration` | `@admin_required` |

#### 管理员 — 用户 `/api/admin/users/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| GET | `/api/admin/users` | `admin_get_users` | `@admin_required` |
| GET | `/api/admin/users/<id>` | `admin_get_user_detail` | `@admin_required` |
| PUT | `/api/admin/users/<id>/role` | `admin_update_user_role` | `@admin_required` |

#### 管理员 — 商品 `/api/admin/products/`
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| GET | `/api/admin/products` | `admin_get_products` | `@admin_required` |
| POST | `/api/admin/products` | `admin_create_product` | `@admin_required` |
| PUT | `/api/admin/products/<id>` | `admin_update_product` | `@admin_required` |
| DELETE | `/api/admin/products/<id>` | `admin_delete_product` | `@admin_required` |

#### 管理员 — 其他
| 方法 | 路径 | 函数 | 认证 |
|---|---|---|---|
| DELETE | `/api/admin/photos/<id>` | `admin_delete_photo` | `@admin_required` |
| POST | `/api/admin/cleanup/photos` | `cleanup_old_photos` | `@admin_required` |
| GET | `/api/admin/statistics` | `get_admin_statistics` | `@admin_required` |
| GET | `/api/admin/insurance-submissions` | `admin_get_insurance_submissions` | `@admin_required` |
| PUT | `/api/admin/insurance-submissions/<id>/review` | `review_insurance_submission` | `@admin_required` |
| GET | `/api/admin/refunds` | `admin_get_refunds` | `@admin_required` |
| PUT | `/api/admin/refunds/<id>/review` | `admin_review_refund` | `@admin_required` |
| GET | `/api/admin/logs/operations` | `get_operation_logs` | `@admin_required` |
| GET | `/api/admin/logs/errors` | `get_error_logs` | `@admin_required` |
| POST | `/api/admin/backup/manual` | `manual_backup` | `@admin_required` |
| POST | `/api/admin/membership-cards/<id>/gift` | `admin_gift_membership_card` | `@admin_required` |

#### app.py 辅助函数（非路由）
| 函数 | 说明 |
|---|---|
| `rate_limit(max_requests, time_window)` | 内存级速率限制装饰器工厂 |
| `format_date_to_chinese(date_obj)` | 日期格式化为 "2024年03月01日" |
| `format_datetime_to_chinese(datetime_obj)` | 日期时间格式化 |
| `add_user_points(user_id, amount, ...)` | 增加积分（100元 = 1积分） |
| `deduct_user_points(user_id, amount, ...)` | 扣减积分（退款时） |

---

### 2.2 auth.py — 认证模块

| 函数/装饰器 | 说明 |
|---|---|
| `get_current_user()` | 从请求头 OpenId/User-Id 查询 users 表返回用户字典 |
| `login_required(f)` | 装饰器：未登录返回 401，设置 `request.current_user` |
| `admin_required(f)` | 装饰器：非管理员返回 403，检查 `role != 'admin'` |
| `admin_or_teacher_required(f)` | 装饰器：检查 `role=='admin'` 或 `user_type=='teacher'`，否则返回 403。用于活动管理、报名审核、导出等 10 个共享路由 |
| `wechat_login(code)` | 调用微信 jscode2session API 换取 openid |
| `create_or_update_wechat_user(openid, user_info)` | 创建或更新微信用户记录 |

### 2.3 utils.py — 工具函数

| 函数 | 说明 |
|---|---|
| `init_db_pool()` | 初始化 PooledDB 连接池（最大 20 连接） |
| `get_db_connection()` | 从连接池获取连接 |
| `allowed_file(filename)` | 检查文件扩展名 |
| `save_uploaded_file(file, folder)` | 保存上传文件，返回访问 URL |
| `calculate_age_from_id_card(id_card)` | 从身份证号计算年龄 |
| `get_gender_from_id_card(id_card)` | 从身份证号获取性别 |
| `success_response(data, message)` | 返回 `{success:True, code:200, message, data}` |
| `error_response(message, code)` | 返回 `{success:False, message, code}` |

### 2.8 config.py — 关键配置

| 配置项 | 值 |
|---|---|
| DB_HOST / DB_USER / DB_PASSWORD / DB_NAME | localhost / root / 12345678 / outdoor_activities |
| SERVER_HOST | `http://localhost:5001` |
| MAX_CONTENT_LENGTH | 16 MB |
| ALLOWED_EXTENSIONS | png, jpg, jpeg, gif |
| LOG_RETENTION_DAYS | 30 |
| AUDIT_LOG_RETENTION_DAYS | 90 |
| BACKUP_RETENTION_DAYS | 30 |
| WECHAT_APP_ID / WECHAT_APP_SECRET | 占位符（需替换） |
| WECHAT_MCH_ID | 商户号（从 `.env.local` 读取） |
| WECHAT_MCH_SERIAL_NO | 商户证书序列号（从 `.env.local` 读取） |
| WECHAT_APIV3_KEY | APIv3 密钥（从 `.env.local` 读取） |
| WECHAT_PAY_PUB_KEY_ID | 微信支付平台公钥 ID（从 `.env.local` 读取） |
| WECHAT_MCH_KEY_PATH | 商户私钥文件路径，默认 `certs/apiclient_key.pem` |
| WECHAT_PAY_PUB_KEY_PATH | 微信支付平台公钥文件路径，默认 `certs/pub_key.pem` |
| WECHAT_PAY_NOTIFY_URL | 支付回调通知地址（从 `.env.local` 读取） |
| DEBUG | 调试模式开关，`True` 时支付/退款使用 mock（从 `.env.local` 读取） |

### 2.5 logger.py — 日志模块

| 方法 | 说明 |
|---|---|
| `Logger.get_client_ip()` | 获取客户端 IP（支持 X-Forwarded-For） |
| `Logger.log_operation(...)` | 写入 `operation_logs` 表 |
| `Logger.log_error(...)` | 写入 `error_logs` 表 |
| `Logger.log_audit(...)` | 写入 `audit_logs` 表（敏感操作） |
| `Logger.log_exception(e, ...)` | 自动捕获 stack trace 并写入错误日志 |
| `log_api_call(operation_type, module)` | 装饰器工厂：自动记录 API 调用 |

### 2.6 notifier.py — 通知模块

| 方法 | 说明 |
|---|---|
| `Notifier.record_notification(...)` | 在 `notification_logs` 中插入待发送通知 |
| `Notifier.update_notification_status(...)` | 更新通知状态 |
| `Notifier.send_wechat_template_message(...)` | 调用微信模板消息 API |
| `Notifier.send_registration_approved(...)` | 报名审核通过通知 |
| `Notifier.send_refund_approved(...)` | 退款审核通过通知 |
| `Notifier.send_insurance_approved(...)` | 保险审核通过通知 |
| `Notifier.notify_admin_new_registration(activity_title, user_name, item_type='活动')` | 通知所有管理员有新报名（支持 `item_type` 区分活动/课程） |
| `Notifier.notify_course_booking(course_title, user_name, teacher_id)` | **新增** — 同时通知教练和所有管理员有新课程预约 |
| `Notifier.notify_admin_new_refund(...)` | 通知所有管理员有新退款 |
| `Notifier.notify_admin_new_insurance(...)` | 通知所有管理员有新保险凭证 |

### 2.7 wechat_pay.py — 微信支付V3模块

| 函数 | 说明 |
|---|---|
| `_load_private_key()` | 加载商户 RSA 私钥（PEM 文件） |
| `_load_public_key()` | 加载微信支付平台公钥（PEM 文件） |
| `_generate_nonce(length)` | 生成随机字符串 |
| `_generate_sign(method, url, timestamp, nonce, body)` | RSA-SHA256 签名生成 |
| `_build_auth_header(method, url, body)` | 构建 Authorization 请求头 |
| `create_jsapi_order(openid, out_trade_no, total, description)` | JSAPI 统一下单 |
| `generate_jsapi_sign(prepay_id)` | 生成前端 `wx.requestPayment` 所需签名参数 |
| `verify_callback_signature(headers, body)` | 验证微信支付回调签名（RSA-SHA256） |
| `decrypt_callback_data(resource)` | AES-256-GCM 解密回调通知数据 |
| `create_refund(out_trade_no, out_refund_no, total, refund, reason)` | 发起退款请求 |

> **DEBUG 模式**：当 `Config.DEBUG=True` 时，所有支付/退款函数返回 mock 数据，不调用微信 API。

### 2.7 定时任务脚本

| 文件 | 说明 |
|---|---|
| `activity_reminder.py` | 查询明天开始的活动，给已审核通过的用户发送提醒通知 |
| `backup.py` | 使用 mysqldump 备份数据库，清理 30 天前的备份 |
| `cleanup_logs.py` | 清理 30 天前的操作/错误/通知日志，90 天前的审计日志 |

---

## 3. 前端代码地图

### 3.1 tabBar 配置（4 个 Tab）

| Tab | 页面路径 | 标签 |
|---|---|---|
| 1 | `pages/venue-home/venue-home` | 场馆首页 |
| 2 | `pages/home/home` | 课程预约 |
| 3 | `pages/shop/shop` | 岩馆商城 |
| 4 | `pages/profile/profile` | 个人中心 |

### 3.2 全部 45 个页面

#### 核心 Tab 页（4 页）
| 页面 | 说明 |
|---|---|
| `venue-home` | 场馆首页：轮播图、Banner、文字内容、活动推荐 |
| `home` | 课程预约：团课/私教 Tab 切换，日期选择（±3 周），分类筛选 |
| `shop` | 商城：左侧分类栏 + 右侧商品列表 + 搜索 + 购物车角标 |
| `profile` | 个人中心：橙色头部（头像+累计统计）、本月训练卡片、积分、保险状态、功能图标网格、管理员/教练入口 |

#### 活动相关（6 页）
| 页面 | 说明 |
|---|---|
| `activity-detail` | 活动详情：照片、报名状态、费用明细 |
| `activity-edit` | 活动编辑/新建（管理员） |
| `activity-participants` | 活动参与者列表（管理员） |
| `activity-photos` | 活动照片墙：多选删除 |
| `my-activities` | 我的活动/课程：顶部 Tab 切换（活动/课程），按状态分组，支持取消和退款 |
| `register` | 活动报名：选择附加费用，计算总额 |

#### 课程预约（7 页）
| 页面 | 说明 |
|---|---|
| `teacher-course-detail` | 私教课程详情：日期 + 时段选择 |
| `group-course-detail` | 团课详情：教练信息 |
| `private-booking` | 私教预约：教练列表 + 42 天日期选择 |
| `booking-confirm` | 预约确认：支付方式选择（直付/会员卡） |
| `my-course-bookings` | 我的课程预约：封面图+课程类型标签（团课/私教）+状态筛选（全部/已通过/已取消/未通过）+查看课程跳转+橙色导航栏 |
| `teacher-detail` | 教练公开资料页 |
| `insurance-submit` | 保险凭证上传 |

#### 商城/订单（7 页）
| 页面 | 说明 |
|---|---|
| `cart` | 购物车 |
| `my-orders` | 我的订单 |
| `order-detail` | 订单详情：支付按钮（unpaid）+ 退款按钮（paid） |
| `product-detail` | 商品详情 |
| `product-edit` | 商品编辑/新建（管理员） |
| `address-manage` | 收货地址列表 |
| `address-edit` | 地址编辑/新增 |

#### 会员卡（5 页）
| 页面 | 说明 |
|---|---|
| `membership-cards` | 会员卡列表（按教练筛选） |
| `membership-card-detail` | 会员卡详情 + 购买 |
| `my-membership-cards` | 我的会员卡 |
| `admin-membership-management` | 会员卡管理（管理员） |
| `admin-membership-edit` | 会员卡编辑/新建（管理员） |

#### 教练后台（7 页）
| 页面 | 说明 |
|---|---|
| `teacher-backend` | 教练仪表盘：待处理预约、今日课程、配送订单 |
| `teacher-course-management` | 教练课程管理列表（完全照搬管理员 Tab 3 布局） |
| `teacher-booking-review` | 教练预约审核（完全照搬管理员 Tab 4 布局） |
| `teacher-activity-management` | 教练活动管理（完全照搬管理员 Tab 2 布局） |
| `teacher-delivery-orders` | 教练配送订单 |
| `teacher-profile-edit` | 教练资料编辑 |
| `teacher-course-edit` | 课程编辑/新建（教练） |

#### 管理员后台（5 页 + admin 主页 14 个 Tab）
| 页面 | 说明 |
|---|---|
| `admin` | 管理员主控台（14 个 Tab，见下方） |
| `admin-filter-management` | 课程分类管理 |
| `admin-venue-content` | 首页内容管理 |
| `admin-product-categories` | 商品分类管理 |
| `admin-logs` | 日志查看（占位页） |

**admin 页面 13 个 Tab：**
0. 统计概览 | 1. 首页管理 | 2. 活动管理 | 3. 课程管理 | 4. 报名审核（活动报名/课程预约 视图切换） | 5. 用户管理 | 6. 商品管理 | 7. 会员卡管理 | 8. 保险审核 | 9. 退款审核（活动退款/课程退款/商品退款 三 Tab 切换） | 10. 操作日志 | 11. 错误日志 | 12. 数据备份

#### 其他（4 页）
| 页面 | 说明 |
|---|---|
| `user-detail` | 用户详情（管理员查看）：基本信息、权限/类型修改、教练课程、历史活动/课程/订单 |
| `notifications` | 用户通知中心 |
| `personal-info` | 个人信息编辑：头像、真实姓名、身份证、手机号、性别、年龄、民族、紧急联系人、血型、过敏史、禁忌症 |
| `course-participants` | 课程参与者列表（管理员/教练查看已预约用户） |

### 3.3 utils/api.js — API 调用方法汇总

`api.js` 封装了统一的 `request()` 函数，自动附加 `OpenId`/`User-Id` header，共 70+ 方法。方法命名规则：
- 普通用户方法：`getXxx`, `createXxx`, `updateXxx`, `deleteXxx`
- 管理员方法：`adminGetXxx`, `adminCreateXxx`, `adminUpdateXxx`
- 教练方法：`getTeacherXxx`, `createTeacherXxx`
- 课程预约审核：`approveCourseBooking(id)`, `rejectCourseBooking(id, data)`（2026-03-04 新增）
- 站点设置：`getConsultInfo()`, `updateConsultInfo(data)`（2026-03-23 新增）
- 会员卡增强：`activateUserMembershipCard(id)`, `adminGiftMembershipCard(id, data)`, `getCourseParticipants(courseId)`（2026-03-24 新增）

---

## 4. 数据库全景图

### 4.1 表清单（25 表 + 1 视图）

| # | 表名 | 说明 | 行数级别 |
|---|---|---|---|
| 1 | `users` | 用户表（根表） | 核心 |
| 2 | `activities` | 活动表 | 核心 |
| 3 | `user_activities` | 用户-活动报名关联 | 核心 |
| 4 | `activity_photos` | 活动照片 | — |
| 5 | `insurances` | 保险信息 | — |
| 6 | `insurance_submissions` | 保险凭证审核 | — |
| 7 | `products` | 商品 | 核心 |
| 8 | `product_categories` | 商品分类 | 配置 |
| 9 | `cart` | 购物车 | — |
| 10 | `orders` | 订单 | 核心 |
| 11 | `order_items` | 订单商品明细 | — |
| 12 | `user_addresses` | 收货地址 | — |
| 13 | `delivery_orders` | 配送订单 | — |
| 14 | `teacher_courses` | 教练课程 | 核心 |
| 15 | `teacher_course_schedules` | 私教时间表 | — |
| 16 | `teacher_course_bookings` | 课程预约记录 | 核心 |
| 17 | `membership_cards` | 会员卡产品 | 配置 |
| 18 | `user_membership_cards` | 用户持有的会员卡 | — |
| 19 | `filter_categories` | 课程筛选分类 | 配置 |
| 20 | `venue_content` | 场馆首页内容 | 配置 |
| 21 | `user_points` | 用户积分记录 | — |
| 22 | `notification_logs` | 通知记录 | 日志 |
| 23 | `operation_logs` | 操作日志 | 日志 |
| 24 | `error_logs` | 错误日志 | 日志 |
| 25 | `audit_logs` | 审计日志 | 日志 |
| 26 | `site_settings` | 站点设置（键值对） | 配置 |
| V1 | `teacher_course_stats` | 教练课程统计视图 | 视图 |

### 4.2 核心表字段详情

#### users（25 列）
```
id, real_name, id_card(UNIQUE), phone(UNIQUE), age, gender(男/女),
nation, emergency_contact_name, emergency_contact_phone,
blood_type(A型/B型/O型/AB型), allergy_history, contraindications,
has_annual_insurance, annual_insurance_start, annual_insurance_end,
role(user/admin), user_type(user/teacher/admin),
avatar_url, teacher_cover_image, teacher_intro, teacher_detail,
total_points, openid(UNIQUE), created_at, username(UNIQUE), password
```

#### activities（30 列）
```
id, cover_images(JSON), title, description, category,
registration_start, registration_end, activity_start, activity_end,
cancel_deadline, location, latitude, longitude,
registration_requirements, fee_details, base_fee, companion_fee,
additional_fees(JSON), max_participants, current_participants,
notices, is_top, is_carousel, sort_order,
status(draft/published/closed/cancelled),
creator_id(FK→users), created_at, updated_at,
insurance_fee, transport_fee, meal_fee,
no_review_needed(TINYINT 默认0)  ← 2026-03-21 新增
```

#### user_activities（21 列）
```
id, user_id(FK→users), activity_id(FK→activities),
registration_date, status(pending/approved/rejected/cancelled/completed),
selected_fees(JSON), total_amount,
payment_status(unpaid/paid/refunded),
cancel_reason, admin_notes,
skip_insurance, skip_transport, skip_meal,
transaction_id, paid_at,
refund_reason, refund_status(none/pending/approved/rejected),
refund_request_time, refund_admin_notes, refunded_at,
out_trade_no(VARCHAR 64, INDEX)  ← 2026-03-21 新增
UNIQUE(user_id, activity_id)
```

#### teacher_courses（18 列）
```
id, course_type(group/private), teacher_id(FK→users CASCADE),
title, cover_image, description,
category_id(FK→filter_categories SET NULL),
duration(默认60), price,
course_start, course_end, max_participants(默认20), current_participants,
location, status(active/inactive), created_at, updated_at,
no_review_needed(TINYINT 默认0)  ← 2026-03-21 新增
```

#### teacher_course_bookings（24 列）
```
id, course_id(FK→teacher_courses CASCADE),
user_id(FK→users CASCADE), teacher_id(FK→users CASCADE),
schedule_id(FK→teacher_course_schedules SET NULL),
booking_date, payment_amount, payment_method(默认wechat),
transaction_id, use_membership, membership_card_id(FK→user_membership_cards SET NULL),
status(pending/approved/rejected/cancelled/completed),
reject_reason, admin_note, created_at, updated_at,
payment_status(ENUM unpaid/paid/refunded 默认unpaid)  ← 2026-03-21 新增
paid_at(DATETIME)  ← 2026-03-21 新增
out_trade_no(VARCHAR 64, INDEX)  ← 2026-03-21 新增
refund_reason(VARCHAR 500)  ← 2026-03-21 新增
refund_status(ENUM pending/approved/rejected)  ← 2026-03-21 新增
refund_request_time(DATETIME)  ← 2026-03-21 新增
refund_admin_notes(VARCHAR 500)  ← 2026-03-21 新增
refunded_at(DATETIME)  ← 2026-03-21 新增
```

#### orders（19 列）
```
id, order_no(UNIQUE), user_id(FK→users), total_amount,
status(pending/paid/cancelled/refunded),
created_at, address_id, receiver_name, receiver_phone, shipping_address,
payment_status(unpaid/paid/refunded), transaction_id, paid_at,
out_trade_no(VARCHAR 64, INDEX)  ← 2026-03-21 新增
refund_reason(VARCHAR 500)  ← 2026-03-21 新增
refund_status(ENUM pending/approved/rejected)  ← 2026-03-21 新增
refund_request_time(DATETIME)  ← 2026-03-21 新增
refund_admin_notes(VARCHAR 500)  ← 2026-03-21 新增
refunded_at(DATETIME)  ← 2026-03-21 新增
```

#### site_settings（4 列）← 2026-03-23 新增
```
id(PK AUTO_INCREMENT), setting_key(VARCHAR 100, UNIQUE),
setting_value(TEXT), updated_at(TIMESTAMP ON UPDATE)
```
> 通用键值对配置表，目前存储 `consult_info`（咨询信息）。使用 `INSERT ... ON DUPLICATE KEY UPDATE` 实现 upsert。

#### membership_cards（13 列）
```
id, name, description, card_type(times/period), total_times,
valid_days, price, teacher_id(FK→users),
status(active/inactive), created_at, updated_at,
validity_start(DATE)  ← 2026-03-24 新增
validity_end(DATE)  ← 2026-03-24 新增
```

#### user_membership_cards（16 列）
```
id, user_id(FK→users), card_id(FK→membership_cards),
card_name, card_type(times/period), remaining_times, total_times,
teacher_id(FK→users), status(active/expired/used_up),
purchase_date, created_at,
valid_days(INT)  ← 2026-03-24 新增
validity_start(DATE)  ← 2026-03-24 新增
validity_end(DATE)  ← 2026-03-24 新增
activated_at(DATETIME)  ← 2026-03-24 新增
gift_from_admin(TINYINT DEFAULT 0)  ← 2026-03-24 新增
```
> 期限卡购买时从 `membership_cards` 复制 `valid_days`/`validity_start`/`validity_end`。管理员赠送卡设置 `gift_from_admin=1`。`get_user_membership_cards` 自动检测过期并更新 `status='expired'`。

### 4.3 关键外键关系图

```
users ─┬─── activities (creator_id)
       ├─── user_activities (user_id)
       ├─── activity_photos (user_id)
       ├─── insurance_submissions (user_id)
       ├─── cart (user_id)
       ├─── orders (user_id)
       ├─── user_addresses (user_id)
       ├─── teacher_courses (teacher_id)
       ├─── teacher_course_bookings (user_id, teacher_id)
       ├─── user_membership_cards (user_id, teacher_id)
       ├─── delivery_orders (user_id, teacher_id)
       └─── user_points (user_id)

activities ─── user_activities (activity_id)
           ─── activity_photos (activity_id)

teacher_courses ─── teacher_course_schedules (course_id)
                ─── teacher_course_bookings (course_id)

filter_categories ─── teacher_courses (category_id)

membership_cards ─── user_membership_cards (card_id)

orders ─── order_items (order_id)
       ─── delivery_orders (order_id)

products ─── cart (product_id)
         ─── order_items (product_id)

user_activities ─── insurances (user_activity_id)

site_settings ─── （无外键，独立键值对表）
```

### 4.4 teacher_course_stats 视图

```sql
SELECT u.id AS teacher_id, u.real_name AS teacher_name,
       COUNT(DISTINCT tc.id) AS total_courses,
       COUNT(DISTINCT CASE WHEN tc.course_type='private' THEN tc.id END) AS private_courses,
       COUNT(DISTINCT CASE WHEN tc.course_type='group' THEN tc.id END) AS group_courses,
       COUNT(DISTINCT tcb.id) AS total_bookings,
       SUM(CASE WHEN tcb.status='approved' THEN tcb.payment_amount ELSE 0 END) AS total_revenue
FROM users u
LEFT JOIN teacher_courses tc ON u.id = tc.teacher_id
LEFT JOIN teacher_course_bookings tcb ON u.id = tcb.teacher_id
WHERE u.user_type = 'teacher'
GROUP BY u.id, u.real_name
```

---

## 5. 已解决的 Bug 历史记录

### Bug #1：`success_response()` 缺少 `code: 200` 字段 ★★★ 根因 Bug

**影响范围**：所有使用直接 `wx.request` + `res.data.code === 200` 检查的前端页面

**现象**：
- 课程编辑页点击编辑后表单空白（数据未回显）
- 会员卡编辑页点击编辑后表单空白
- 教练课程列表不显示
- 首页课程分类不加载

**根因**：`utils.py` 的 `success_response()` 返回 `{success: True, message, data}` 但**没有 `code` 字段**。前端 `wx.request` 回调中检查 `res.data.code === 200` 始终为 `false`。

**修复**：在 `success_response()` 中添加 `'code': 200`

**文件**：`utils.py:91-97`

---

### Bug #2：`product_categories` 表不存在

**现象**：管理员创建商品分类报错 `Table 'outdoor_activities.product_categories' doesn't exist`

**根因**：迁移脚本 `002_add_product_categories.sql` 未被执行

**修复**：手动执行 SQL 创建表并插入 3 条默认分类（运动装备、保险、餐饮服务）

---

### Bug #3：admin.wxml 课程字段名错误

**现象**：管理员后台课程管理列表中课程名称显示为空

**根因**：WXML 模板使用 `item.course_name`，但 `teacher_courses` 表的列名是 `title`

**修复**：`admin.wxml` 中 3 处 `item.course_name` → `item.title`；`admin.js` 搜索过滤中 `course.course_name` → `course.title`

---

### Bug #4：场馆首页内容管理字段名不匹配

**现象**：管理员创建场馆首页内容后，前端不显示

**根因**：前端 `admin-venue-content.js` 发送的字段名与后端不一致：
- `type` → 应为 `content_type`
- `display_order` → 应为 `sort_order`
- `link_url` → 应拆分为 `link_type` + `link_id`

**修复**：修正前端字段名与后端 API 及数据库表对齐

---

### 改版 #5：个人中心页面大改版 — 训练统计 + 图标网格 + 个人信息独立页

**改版内容**：将 profile 页面从列表式布局改为：橙色头部（头像居中 + 累计天数/训练次数统计）→ 本月训练卡片 → 积分栏目 → 保险状态 → 个人中心图标网格（6 项）→ 管理员/教练后台 → 退出登录。个人信息编辑迁移至独立的 personal-info 页面。

**涉及文件**（10 个）：

| 文件 | 操作 |
|---|---|
| `app.py` | 新增 `GET /api/users/training-stats` 路由 |
| `utils/api.js` | 新增 `getUserTrainingStats()` 方法 |
| `app.json` | pages 数组添加 `pages/personal-info/personal-info` |
| `pages/personal-info/personal-info.js` | **新建** — 个人信息编辑逻辑（从 profile.js 迁移） |
| `pages/personal-info/personal-info.wxml` | **新建** — 编辑表单（头像、姓名、身份证、手机号等 11 个字段） |
| `pages/personal-info/personal-info.wxss` | **新建** — 表单样式 |
| `pages/personal-info/personal-info.json` | **新建** — 页面配置（橙色导航栏） |
| `pages/profile/profile.js` | 新增 `trainingStats`、`maskedPhone`、`onGoPersonalInfo()`；删除 `onEditProfile`、`onInputChange`、`onGenderChange`、`onBloodTypeChange`、`onSaveProfile` |
| `pages/profile/profile.wxml` | 已登录区域完全重写（橙色头部 + 月度卡片 + 图标网格） |
| `pages/profile/profile.wxss` | 大幅重写（新增头部/网格/月度样式，删除旧编辑/地址/链接行样式） |

**关键逻辑**：
- **训练统计 API**：累计天数 = `(today - user.created_at).days`；累计训练次数 = `user_activities`（多日活动按天展开：`(end.date() - start.date()).days + 1`）+ `teacher_course_bookings` 条数；本月统计同理但限定当月范围
- **手机号遮蔽**：`155****8008` 格式（前 3 后 4）
- **图标方案**：使用 emoji 文字（💳📅📍🔔🏔️📦）代替图片文件

---

### Bug #5：`pendingBookingsCount` undefined + 教练预约审核列表不显示

**影响范围**：教练后台仪表盘、教练预约审核页

**现象**：
- 教练后台 `pendingBookingsCount` 显示 undefined
- 教练预约审核页列表始终为空

**根因**（双重问题）：
1. `get_course_bookings` API 返回分页对象 `{list:[...], total, page, limit}`，但前端当数组用：`(res.data.data || []).length` → 对象无 `.length` 返回 undefined
2. 前端未传 `role: 'teacher'` 参数，后端默认 `role='user'`，用 `user_id` 过滤导致教练看不到自己名下的预约

**修复**：
- `teacher-backend.js`：`(res.data.data || []).length` → `(data && data.list) ? data.list.length : 0`；添加 `role: 'teacher'` 参数
- `teacher-booking-review.js`：`bookings: res.data.data || []` → `bookings: (data && data.list) || []`；添加 `role: 'teacher'` 参数

---

### Bug #6：课程预约拒绝字段名不匹配

**现象**：教练拒绝预约时，拒绝原因未保存到数据库

**根因**：前端发送 `reason` 字段，但后端 `reject_course_booking` 读取 `reject_reason`

**修复**：`teacher-booking-review.js` 中 `reason: this.data.rejectReason` → `reject_reason: this.data.rejectReason`

---

### Bug #7：`get_course_bookings` timedelta/Decimal 序列化报错

**现象**：课程预约列表 API 调用返回 500 错误

**根因**：`teacher_course_schedules` 表的 `start_time`/`end_time` 为 MySQL TIME 类型，PyMySQL 返回 Python `timedelta` 对象；`price` 为 Decimal 类型。两者均无法被 Flask jsonify 序列化。

**修复**：`app.py` `get_course_bookings` 函数，fetchall 后遍历结果格式化：
- `timedelta` → `f"{hours:02d}:{minutes:02d}"` 字符串
- `Decimal` → `float`
- `datetime` → `strftime('%Y-%m-%d %H:%M:%S')` 字符串

---

### Bug #8：管理员后台报名/保险/退款审核复选框不显示勾选标记

**影响范围**：admin 页面 Tab 4（报名审核）、Tab 8（保险审核）、Tab 9（退款审核）、教练预约审核页

**现象**：点击 checkbox 后看不到打勾效果（功能正常但外观无变化）

**根因**：微信小程序原生 `<checkbox>` 组件在某些环境下不渲染勾选标记

**修复尝试（均失败）**：
1. ❌ 替换为 view-based checkbox + CSS 复合选择器 `.custom-checkbox.checked` — WXSS 不可靠地应用复合类选择器
2. ❌ 父级作用域选择器 `.parent .custom-checkbox.checked` — 同样不生效
3. ❌ 内联 `style="{{selectedArray.indexOf(item.id) > -1 ? 'background:...' : ''}}"` — 微信模板引擎不可靠地评估 `Array.indexOf()` 方法调用，`setData` 后不触发视图更新

**最终修复**：完全移除 checkbox，改为"选择模式 + 点击卡片整体变色"方案（见改版 #10）

**文件**：`admin.wxml`/`.js`/`.wxss`（Tab 4/8/9）、`teacher-booking-review.wxml`/`.js`/`.wxss`

---

### 改版 #6：课程预约页导航栏 + 多页面左右留白修复

**修改内容**：
- `home.json`：添加橙色导航栏配置 `navigationBarTitleText: "课程预约"`, `navigationBarBackgroundColor: "#ff9800"`
- `home.wxss`：`.search-section` padding `20rpx` → `20rpx 30rpx`
- `private-booking.wxss`：`.teacher-list` padding `0 20rpx` → `0 30rpx`
- `teacher-course-edit.wxss`：`.content` 添加 `padding: 0 10rpx 150rpx`

---

### 改版 #7：教练预约审核 — 批量操作

**新增功能**：全选/单选复选框 + 批量通过 + 批量拒绝

**涉及文件**：
| 文件 | 修改内容 |
|---|---|
| `teacher-booking-review.js` | 新增 `selectedBookings`/`allBookingsSelected` 数据；新增 `onSelectAllBookings`/`onSelectBooking`/`onBatchApprove`/`doBatchApprove`/`onBatchReject` 方法 |
| `teacher-booking-review.wxml` | 添加全选栏 + 每项 checkbox（仅 pending 状态）+ 底部固定批量操作栏 |
| `teacher-booking-review.wxss` | 新增 `.custom-checkbox`（绿色 `#4caf50`）、`.batch-select`、`.booking-row`、`.batch-actions` 样式 |

**关键逻辑**：
- `onConfirmReject()` 通过 `currentBookingId === null` 区分单个拒绝 vs 批量拒绝模式
- 批量操作并行发送请求，用 `completed` 计数器跟踪全部完成后刷新列表

---

### 改版 #8：管理员课程预约管理（报名审核 + 退款审核）

**新增功能**：管理员可审核和退款课程预约（之前仅支持活动）

**后端修改**：
- `app.py` `get_course_bookings`：新增 `admin` 角色分支，当 `role=='admin'` 且用户是管理员时，不添加 user_id/teacher_id 过滤，返回所有预约

**前端修改**：
| 文件 | 修改内容 |
|---|---|
| `admin.js` | 新增 data：`registrationViewType`/`pendingCourseBookings`/`selectedCourseBookings`/`refundViewType`/`courseRefundBookings`/`selectedCourseRefunds`；新增方法：`loadPendingCourseBookings`/`loadCourseRefundBookings`/`onToggleRegistrationType`/`onToggleRefundType` + 批量选择/通过/拒绝/退款 |
| `admin.wxml` | Tab 4 添加"活动报名/课程预约"切换视图；Tab 9 添加"活动退款/课程退款"切换视图 |
| `admin.wxss` | 新增 `.view-toggle`/`.toggle-item`/`.course-booking-meta` 样式 |
| `utils/api.js` | 新增 `approveCourseBooking(id)`、`rejectCourseBooking(id, data)` |

**关键逻辑**：
- 课程退款视图加载 `status='approved'` 的课程预约，管理员执行 reject 即触发自动退款（后端 `reject_course_booking` 已内置退款逻辑）

---

### 改版 #9：教练操作审计日志

**新增功能**：教练/管理员通过或拒绝课程预约时自动记录审计日志

**修复文件**：`app.py`
- `approve_course_booking`：`conn.commit()` 后添加 `Logger.log_audit(action='审核通过课程预约', target_type='teacher_course_bookings')`
- `reject_course_booking`：`conn.commit()` 后添加 `Logger.log_audit(action='拒绝课程预约', target_type='teacher_course_bookings')`

**关键**：`user_id` 和 `user_name` 来自 `current_user`，无论操作者是教练还是管理员都会被记录

---

### 改版 #10：审核页面选择模式改版 — 移除 checkbox，改为卡片变色选择

**改版原因**：Bug #8 的 view-based checkbox 方案在微信小程序中不可靠（3 种绑定方式均失败）。购物车页虽然使用 `item.selected` 属性成功，但审核页面使用 `selectedArray.indexOf(item.id)` 检查方式无法触发视图更新。

**最终方案**：完全移除所有 checkbox 元素，改为"选择模式 + 点击卡片整体变色"

**交互流程**：
1. 默认状态：无任何选择控件，底部显示"选择"按钮
2. 点击"选择"进入选择模式：顶部出现"全选/取消全选"文字按钮，底部变为"取消 + 批量操作按钮"
3. 点击卡片：整个卡片背景变色（蓝色/绿色）+ 左边框高亮，表示选中
4. 批量操作完成后自动退出选择模式

**核心技术关键点**：
- 使用 `item.selected` 布尔属性（挂在每个数据项上），而非 `selectedArray.indexOf(item.id)` 数组检查
- 选择/取消选择时通过 `setData({ list: list.map(item => ({...item, selected: !item.selected})) })` 触发响应式更新
- WXML 绑定：`style="{{item.selected ? 'background-color:#e3f2fd;border-left-color:#1296db' : ''}}"`
- 使用 `catchtap` 阻止子元素按钮事件冒泡到卡片 `bindtap`

**涉及文件**（6 个）：

| 文件 | 修改内容 |
|---|---|
| `admin.js` | 新增 `isRegistrationSelectionMode`/`isInsuranceSelectionMode`/`isRefundSelectionMode`/`isCourseBookingSelectionMode`/`isCourseRefundSelectionMode`；新增 toggle/cardTap 方法；所有 select/selectAll 方法改写为 `item.selected` 模式；批量操作完成后退出选择模式 |
| `admin.wxml` | Tab 4/8/9 移除所有 `custom-checkbox`，改为 `batch-select-bar` 全选文字按钮 + 卡片 `bindtap` 变色 + 底部选择/取消/批量操作栏 |
| `admin.wxss` | `.registration-card`/`.insurance-card`/`.refund-card` 添加 `transition` 和 `border-left`；新增 `.batch-select-bar`/`.select-all-text-btn`/`.select-mode-btn`/`.cancel-btn`/`.batch-actions-inner` |
| `teacher-booking-review.js` | 新增 `isSelectionMode`；新增 `onToggleSelectionMode`/`onBookingCardTap`；改写 `onSelectBooking`/`onSelectAllBookings` 为 `item.selected` 模式；切换 tab/批量操作完成后退出选择模式 |
| `teacher-booking-review.wxml` | 移除 checkbox，改为选择模式卡片变色；单项通过/拒绝按钮改 `catchtap` 防冒泡（仅非选择模式显示） |
| `teacher-booking-review.wxss` | `.booking-row` 添加 `transition`/`border-left`；新增 `.batch-select-bar`/`.select-all-text-btn`（绿色 `#4caf50`）/`.select-mode-btn`/`.cancel-btn`/`.batch-actions-inner` |

**主题色**：
- 管理员：选中 `#e3f2fd`（浅蓝）/ 边框 `#1296db`（蓝）
- 教练：选中 `#e8f5e9`（浅绿）/ 边框 `#4caf50`（绿）

---

### Bug #9：活动管理设置的轮播活动未在首页显示

**影响范围**：场馆首页（venue-home）轮播图

**现象**：在活动编辑中勾选 `is_carousel` 后，首页轮播不显示该活动，只能显示在「首页内容编辑」（admin-venue-content）中手动创建的轮播条目

**根因**：`venue-home.js` 的 `loadCarousel()` 只从 `venue_content` 表（`GET /api/venue-content?content_type=carousel`）获取轮播数据，从未请求 `GET /api/activities/carousel`（该接口返回 `activities` 表中 `is_carousel=1` 的活动）

**修复**：重写 `loadCarousel()`，同时发起两个并行请求，合并后显示

**涉及文件**（1 个）：

| 文件 | 修改内容 |
|---|---|
| `venue-home.js` | `loadCarousel()` 重写：并行请求 `venue_content` carousel + `activities/carousel`，合并去重后 setData |

**关键逻辑**：
- **去重**：收集 `venue_content` 中 `link_type='activity'` 的 `link_id` 集合，活动轮播中已被关联的 ID 不重复添加
- **格式转换**：活动数据转为 venue_content 格式（`cover_image_url` → `image_url`，自动添加 `link_type='activity'` + `link_id`）
- **排序**：合并后统一按 `sort_order` 升序排列
- **并行加载**：使用 `complete` 回调 + 计数器模式，两个请求均完成后才 `setData`

---

### 改版 #11：venue_content 关联项默认标题和图片自动填充

**改版内容**：当首页内容的发布类型为活动、课程或商品时，标题和图片如不额外设置，自动使用关联项的标题和图片

**涉及文件**（2 个）：

| 文件 | 修改内容 |
|---|---|
| `app.py` `get_venue_content()` | 返回前检查每个条目：若有 `link_type`+`link_id` 且 `title`/`image_url` 为空，从关联表查询并填充默认值 |
| `app.py` `get_venue_content_link_options()` | SQL 查询增加图片字段（activity: `cover_images`、course: `cover_image`、product: `image_url`），返回前统一处理为 `image_url` |
| `admin-venue-content.js` `onSelectLinkItem()` | 选择关联项时，若 `formData.title` 或 `formData.image_url` 为空，自动从关联项填充 |
| `admin-venue-content.js` `onConfirm()` | 放宽校验：有 `link_type`+`link_id` 时允许标题为空（后端展示时自动填充） |

**图片字段映射**：

| 关联类型 | 标题来源 | 图片来源 |
|---------|---------|---------|
| activity | `activities.title` | `activities.cover_images` JSON 第一张 |
| course | `teacher_courses.title` | `teacher_courses.cover_image` |
| product | `products.name` | `products.image_url` |

**关键逻辑**：
- **不覆盖原则**：管理员手动设置的标题/图片不会被覆盖，仅在为空时填充
- **填充层次**：前端选择时即时填充（UX 友好）+ 后端返回时兜底填充（即使前端未填也能正确展示）
- **校验放宽**：`onConfirm()` 中仅在「无标题 AND 无关联项」时提示错误

---

### 改版 #12：敏感参数配置文件集中管理

**改版目的**：将代码中硬编码的敏感参数和环境相关参数统一提取到配置文件中，便于本地/服务器环境切换，避免敏感信息泄露到代码仓库。

#### 后端 `config.py` — 已有配置文件，集中管理以下参数

| 配置项 | 含义 |
|---|---|
| `DB_HOST` | 数据库主机地址 |
| `DB_USER` | 数据库用户名 |
| `DB_PASSWORD` | 数据库密码 |
| `DB_NAME` | 数据库名称 |
| `SERVER_HOST` | 后端服务器访问地址（用于拼接上传文件的访问 URL） |
| `UPLOAD_FOLDER` | 文件上传存储目录路径 |
| `MAX_CONTENT_LENGTH` | 上传文件最大体积限制 |
| `ALLOWED_EXTENSIONS` | 允许上传的文件扩展名集合 |
| `WECHAT_APP_ID` | 微信小程序 AppID |
| `WECHAT_APP_SECRET` | 微信小程序 AppSecret |
| `LOG_RETENTION_DAYS` | 操作日志保留天数 |
| `ERROR_LOG_RETENTION_DAYS` | 错误日志保留天数 |
| `AUDIT_LOG_RETENTION_DAYS` | 审计日志保留天数 |
| `BACKUP_RETENTION_DAYS` | 备份文件保留天数 |
| `BACKUP_DIR` | 备份文件存储目录 |
| `ENABLE_NOTIFICATIONS` | 是否启用通知功能 |
| `NOTIFICATION_BATCH_SIZE` | 批量发送通知数量 |
| `TEMPLATE_REGISTRATION_APPROVED` | 微信模板消息ID — 报名通过 |
| `TEMPLATE_REFUND_APPROVED` | 微信模板消息ID — 退款通过 |
| `TEMPLATE_INSURANCE_APPROVED` | 微信模板消息ID — 保险通过 |
| `TEMPLATE_ACTIVITY_REMINDER` | 微信模板消息ID — 活动提醒 |

**引用方式**：后端各模块通过 `from config import Config` 后使用 `Config.XXX` 访问，不在代码中硬编码具体参数值。

#### 前端 `app.js` — globalData 集中管理

| 配置项 | 含义 |
|---|---|
| `baseUrl` | 后端 API 基础地址 |
| `apiUrl` | 后端 API 基础地址（与 baseUrl 相同，部分页面引用此字段） |

**引用方式**：页面中通过 `const app = getApp()` 后使用 `app.globalData.apiUrl` 访问。

#### 前端 `utils/api.js` — BASE_URL 常量

| 配置项 | 含义 |
|---|---|
| `BASE_URL` | 后端 API 完整基础路径（含 `/api` 前缀） |

**引用方式**：`api.js` 内部所有请求通过 `${BASE_URL}${url}` 拼接，其他文件通过 `api.xxx()` 方法调用，不直接接触 URL。

#### 涉及的代码引用关系

| 代码位置 | 引用的配置 | 说明 |
|---|---|---|
| `utils.py` `save_uploaded_file()` | `Config.SERVER_HOST` | 拼接上传文件的访问 URL |
| `utils.py` `init_db_pool()` | `Config.DB_HOST/DB_USER/DB_PASSWORD/DB_NAME` | 数据库连接池初始化 |
| `auth.py` `wechat_login()` | `Config.WECHAT_APP_ID/WECHAT_APP_SECRET` | 微信登录 jscode2session 调用 |
| `notifier.py` | `Config.WECHAT_APP_ID/WECHAT_APP_SECRET` | 获取 access_token 发送模板消息 |
| `backup.py` | `Config.DB_HOST/DB_USER/DB_PASSWORD/DB_NAME` | mysqldump 备份命令 |
| `app.py` 各路由 | `Config.SERVER_HOST/UPLOAD_FOLDER` | 文件路径处理、URL 生成 |
| 前端直接使用 `wx.request` 的页面 | `app.globalData.apiUrl` | home.js、teacher-course-edit.js、admin-membership-edit.js 等 |
| 前端 `api.js` 封装的请求 | `BASE_URL` | 所有通过 `api.xxx()` 发起的请求 |

**关键原则**：切换部署环境（本地开发 → 服务器）时，只需修改 `config.py`、`app.js`（globalData）、`api.js`（BASE_URL）三处配置值，无需改动业务代码。

---

### 改版 #13：微信支付V3 + 免审核 + 退款 + 积分 + 通知全量移植（2026-03-21）

**改版目的**：从参考项目 `outdoor_family_activity_backend`（端口 5002，miniprogram-4）向本项目移植完整的微信支付、免审核、退款、积分和通知功能。

#### 涉及后端文件（`~/PycharmProjects/outdoor_activity_backend/`）

| 文件 | 操作 | 说明 |
|---|---|---|
| `wechat_pay.py` | **新建** | 微信支付V3模块（293行），含 JSAPI 下单、签名、回调验签解密、退款，支持 DEBUG mock |
| `config.py` | 修改 | 新增 7 个微信支付配置项 + `DEBUG` 开关 |
| `.env.local` | 修改 | 新增微信支付环境变量模板 |
| `app.py` | 修改 | 8 个函数重写/新增（见下方详细清单） |
| `notifier.py` | 修改 | `notify_admin_new_registration` 添加 `item_type` 参数；新增 `notify_course_booking` 方法 |

**app.py 修改清单：**

| 函数 | 操作 | 说明 |
|---|---|---|
| `create_payment_order` | 重写 | 支持三种类型：activity(ACT)、course(CRS)、product(OD)，`out_trade_no` 前缀路由，调用 `wechat_pay.create_jsapi_order()`，DEBUG mock |
| `payment_callback` | 重写 | 验签 + AES-GCM 解密，按 `out_trade_no` 前缀路由更新三张表，幂等处理，积分发放（100元=1积分）via `add_user_points()`，`total_spent` 更新 |
| `register_activity` | 修改 | 新增 rejected 重新报名（DELETE+INSERT）、`no_review_needed` 免审核检查、条件通知 |
| `create_course_booking` | 修改 | 新增 `no_review_needed` 免审核检查、`payment_status='unpaid'`、积分移至 callback、课程预约通知 |
| `admin_get_refunds` | 重写 | 新增 `type` 参数支持 activity/course/product 三种退款查询 |
| `admin_review_refund` | 重写 | 三种类型退款审核，approved 时调用 `wechat_pay.create_refund()`，`deduct_user_points()` 扣积分 |
| `request_course_refund` | **新增** | `POST /api/course-booking/<id>/refund`，课程退款申请 |
| `request_order_refund` | **新增** | `POST /api/order/<id>/refund`，商品退款申请 |
| `admin_get_user_detail` | 修改 | 新增 `activity_history`、`course_history`、`order_history` 查询 |

#### 涉及前端文件（`~/WeChatProjects/miniprogram-3/`）

| 文件 | 操作 | 说明 |
|---|---|---|
| `utils/payment.js` | **新建** | `triggerPayment(type, orderId, totalAmount)` 封装 |
| `utils/api.js` | 修改 | 新增 `requestCourseRefund`、`requestOrderRefund` |
| `pages/order-detail/` | **新建**（4文件） | 订单详情页，支付按钮(unpaid) + 退款按钮(paid) |
| `pages/activity-edit/` | 修改（wxml+js+wxss） | 底部添加"不需要审核"复选框 |
| `pages/teacher-course-edit/` | 修改（wxml+js+wxss） | 底部添加"不需要审核"复选框 |
| `pages/activity-detail/` | 修改（js） | rejected→"重新报名"(不禁用)，approved+unpaid→"去支付" |
| `pages/my-activities/` | 修改（wxml+js+wxss） | 顶部添加"活动/课程"Tab 切换 |
| `pages/admin/` | 修改（wxml+js） | 退款审核新增"商品退款"第三个 Tab |
| `app.json` | 修改 | pages 数组添加 `pages/order-detail/order-detail` |

#### 数据库 ALTER TABLE（已执行 2026-03-21）

```sql
ALTER TABLE activities ADD COLUMN no_review_needed TINYINT(1) DEFAULT 0;
ALTER TABLE teacher_courses ADD COLUMN no_review_needed TINYINT(1) DEFAULT 0;
ALTER TABLE user_activities ADD COLUMN out_trade_no VARCHAR(64) DEFAULT NULL;
ALTER TABLE user_activities ADD INDEX idx_out_trade_no (out_trade_no);
ALTER TABLE teacher_course_bookings ADD COLUMN payment_status ENUM('unpaid','paid','refunded') DEFAULT 'unpaid';
ALTER TABLE teacher_course_bookings ADD COLUMN paid_at DATETIME DEFAULT NULL;
ALTER TABLE teacher_course_bookings ADD COLUMN out_trade_no VARCHAR(64) DEFAULT NULL;
ALTER TABLE teacher_course_bookings ADD COLUMN refund_reason VARCHAR(500) DEFAULT NULL;
ALTER TABLE teacher_course_bookings ADD COLUMN refund_status ENUM('pending','approved','rejected') DEFAULT NULL;
ALTER TABLE teacher_course_bookings ADD COLUMN refund_request_time DATETIME DEFAULT NULL;
ALTER TABLE teacher_course_bookings ADD COLUMN refund_admin_notes VARCHAR(500) DEFAULT NULL;
ALTER TABLE teacher_course_bookings ADD COLUMN refunded_at DATETIME DEFAULT NULL;
ALTER TABLE teacher_course_bookings ADD INDEX idx_out_trade_no (out_trade_no);
ALTER TABLE orders ADD COLUMN out_trade_no VARCHAR(64) DEFAULT NULL;
ALTER TABLE orders ADD COLUMN refund_reason VARCHAR(500) DEFAULT NULL;
ALTER TABLE orders ADD COLUMN refund_status ENUM('pending','approved','rejected') DEFAULT NULL;
ALTER TABLE orders ADD COLUMN refund_request_time DATETIME DEFAULT NULL;
ALTER TABLE orders ADD COLUMN refund_admin_notes VARCHAR(500) DEFAULT NULL;
ALTER TABLE orders ADD COLUMN refunded_at DATETIME DEFAULT NULL;
ALTER TABLE orders ADD INDEX idx_out_trade_no (out_trade_no);
```

#### 关键逻辑点

1. **`out_trade_no` 前缀路由**：`ACT{id}_{timestamp}` → 活动，`CRS{id}_{timestamp}` → 课程，`OD{id}_{timestamp}` → 商品。`payment_callback` 根据前缀决定更新哪张表。
2. **幂等处理**：回调中先检查 `payment_status`，如果已经是 `paid` 则直接返回成功（防止重复积分发放）。
3. **积分统一在 payment_callback 发放**：所有类型（活动/课程/商品）的积分发放逻辑集中在支付回调中，100元=1积分，调用 `add_user_points()`。退款时调用 `deduct_user_points()` 扣减。
4. **课程使用 `payment_amount`**：`teacher_course_bookings` 表的金额字段是 `payment_amount`（非 `total_amount`），payment_callback 中需用此字段计算积分。
5. **免审核逻辑**：`no_review_needed=1` 时，报名直接 `status='approved'`，不发通知，返回 `need_payment=True` 引导前端支付。
6. **rejected 重新报名**：DELETE 旧记录 + INSERT 新记录（因为 `user_activities` 有 UNIQUE(user_id, activity_id) 约束）。
7. **课程通知双发**：`notify_course_booking` 同时通知教练（teacher_id）和所有管理员。一方审核后 status 变更，另一方查询待审核列表时自然不再显示。
8. **前端 my-activities 课程数据分组**：后端 `/api/course-bookings` 返回分页扁平列表，前端 `loadCourses()` 获取后按 `status` 客户端分组，映射字段名（`course_title→title`, `payment_amount→total_amount`, `course_image→cover_image_url`）。

---

### 改版 #15：用户详情页历史记录增强 + 课程预约页面实现 + 免审核验证（2026-03-23）

**改版内容**：
1. 管理员后台用户详情页为所有用户类型（管理员/教练/普通用户）统一显示活动历史、课程历史、订单历史
2. "我的课程预约"页面完整实现：封面图、课程类型标签、状态筛选、查看课程跳转
3. 免审核逻辑代码验证（结论：逻辑已正确，无需修改）

#### 涉及后端文件

| 文件 | 修改内容 |
|---|---|
| `app.py` `admin_get_user_detail` | 活动历史增加 `activity_start`/`activity_end`/`location`；课程历史增加 `course_type`/`cover_image`/`schedule_date`/`start_time`/`end_time`/`teacher_name`；订单历史提取第一个 item 的 `name` 作为 `product_name`；三个历史列表添加通用序列化（Decimal→float、datetime→strftime、timedelta→HH:MM） |

#### 涉及前端文件（7 个）

| 文件 | 操作 | 修改内容 |
|---|---|---|
| `user-detail/user-detail.js` | 修改 | 删除 `loadUserHistory()` 方法；`loadUserDetail()` 从 `admin_get_user_detail` 响应提取 `activity_history`/`course_history`/`order_history` + 字段映射（`activity_title→title`、`course_title→title`、`product_name` 兜底） |
| `user-detail/user-detail.wxml` | 修改 | 三个历史 section 移除 `wx:if="{{xxx.length > 0}}"` 改为始终显示；数据为空时显示"暂无xxx记录"；修复字段引用（`item.title`、`item.total_amount`、`item.teacher_name`）；保留教练"教授课程"section 不动 |
| `user-detail/user-detail.wxss` | 无修改 | `.empty-hint` 样式已存在 |
| `my-course-bookings/my-course-bookings.js` | 修改 | 修复分页响应 `(data && data.list) \|\| []`；tabs 改为 4 个（全部/已通过/已取消/未通过）；实现 `onViewDetail()` 根据 `course_type` 跳转；`_loaded` 标志防双重加载 |
| `my-course-bookings/my-course-bookings.wxml` | 重写 | 数据驱动 tabs；添加课程封面图 `.course-cover`；课程类型标签（团课/私教）；修复字段名（`payment_amount`/`reject_reason`/`schedule_date+start_time`）；添加支付状态和教练名显示；移除手动 header |
| `my-course-bookings/my-course-bookings.json` | 修改 | 添加橙色导航栏 `navigationBarBackgroundColor: "#FF7F50"` |
| `my-course-bookings/my-course-bookings.wxss` | 修改 | 移除 `.header`/`.title`；新增 `.course-cover`/`.booking-header-info`/`.course-title-row`/`.course-type-tag`/`.tag-group`/`.tag-private`/`.paid-text`；`.booking-header` 改为图片+信息横向布局 |

#### 免审核逻辑验证结论

经代码审查确认，免审核逻辑在以下 6 个检查点均正确：

| 检查项 | 状态 |
|--------|------|
| `register_activity` 免审核 → `status='approved'` | ✅ |
| `register_activity` 免审核 → 不发通知 | ✅ |
| `create_course_booking` 免审核 → `status='approved'` | ✅ |
| `create_course_booking` 免审核 → 不发通知 | ✅ |
| 管理员/教练审核页不显示免审核项（`status='pending'` 过滤，免审核项为 `approved`） | ✅ |
| 不给管理员/教练发审核通知 | ✅ |

#### 关键逻辑

1. **历史数据内嵌返回**：`admin_get_user_detail` 已在一次 API 调用中返回 `activity_history`/`course_history`/`order_history`，前端无需调用单独的 `/api/users/{id}/history` 端点
2. **字段映射模式**：后端字段名（如 `activity_title`、`course_title`）与前端模板期望的字段名（如 `title`）不同，前端在 `loadUserDetail()` 中通过 `.map()` 做字段映射
3. **my-course-bookings 分页对象**：`GET /api/course-bookings` 返回 `{list:[...], total, page, limit}` 分页对象，前端必须用 `(data && data.list) || []` 提取数组，与 Bug #5 同类问题
4. **课程详情跳转路由**：`onViewDetail()` 根据 `booking.course_type` 决定跳转页面 — `group` → `group-course-detail`，其他 → `teacher-course-detail`

---

### 改版 #16：R1-R6 六大需求（会员卡赠送 / 期限卡增强 / 课程人员详情 / 教练后台页面复用 / 批量选择改版 / 活动历史简化）（2026-03-24）

**改版内容**：
1. **R1 会员卡赠送**：管理员可在后台将会员卡赠送给指定用户
2. **R2 期限卡增强**：会员卡支持有效期设置、用户侧激活机制、自动过期检测
3. **R3 课程人员详情**：管理员/教练查看课程已预约用户列表
4. **R4 教练后台页面复用**：教练后台课程管理、预约审核、活动管理页面完全照搬管理员后台布局
5. **R5 批量选择改版**：教练课程编辑和管理员会员卡编辑页面改为卡片变色选择模式
6. **R6 活动历史简化**：我的活动页面删除课程视图，仅保留活动列表

#### 涉及后端文件

| 文件 | 修改内容 |
|---|---|
| `auth.py` | 新增 `admin_or_teacher_required` 装饰器（检查 `role=='admin'` 或 `user_type=='teacher'`） |
| `app.py` 10 个路由 | 装饰器从 `@admin_required` 改为 `@admin_or_teacher_required`（活动 CRUD、报名审核、导出等） |
| `app.py` `create_membership_card` / `update_membership_card` | 新增 `validity_start`, `validity_end` 字段处理 |
| `app.py` `purchase_membership_card` | 期限卡购买时复制 `valid_days`, `validity_start`, `validity_end` 到 `user_membership_cards` |
| `app.py` `get_user_membership_cards` | 返回所有卡（含过期），自动过期检测，返回新字段 |
| `app.py` `get_teacher_courses` | 新增 `show_all` 参数，管理员/教练不过滤 status |
| `app.py` `update_teacher_course` | 新增 `is_active` → `status` 映射（前端传 `is_active` 布尔值，后端映射为 `active`/`inactive`） |
| `app.py` 新增 `activate_user_membership_card` | `PUT /api/user-membership-cards/<id>/activate`，用户激活期限卡 |
| `app.py` 新增 `admin_gift_membership_card` | `POST /api/admin/membership-cards/<id>/gift`，管理员赠送会员卡 |
| `app.py` 新增 `get_course_participants` | `GET /api/teacher-courses/<id>/participants`，课程参与者列表 |

#### 涉及前端文件（15+ 个）

| 文件 | 操作 | 修改内容 |
|---|---|---|
| `utils/api.js` | 修改 | 新增 `activateUserMembershipCard`、`adminGiftMembershipCard`、`getCourseParticipants` 3 个方法 |
| `app.json` | 修改 | 注册 `course-participants`、`teacher-activity-management` 2 个新页面 |
| `pages/admin/admin.wxml/js/wxss` | 修改 | R1 赠送弹窗 + R3 人员详情按钮 |
| `pages/admin-membership-edit/` | 修改 | R2 有效期字段 + R5 卡片变色选择 |
| `pages/my-membership-cards/` | 修改 | R2 状态徽章/激活按钮/过期灰显 |
| `pages/course-participants/` | **新建** | R3 课程人员详情页 |
| `pages/teacher-activity-management/` | **新建** | R4 教练活动管理（完全照搬管理员 Tab 2） |
| `pages/teacher-backend/` | 修改 | 新增活动管理入口 |
| `pages/teacher-course-management/` | **完全重写** | R4 照搬管理员 Tab 3 布局（搜索栏 + 分类管理/创建课程按钮 + 卡片列表 + 编辑/人员详情/删除操作） |
| `pages/teacher-booking-review/` | **完全重写** | R4 照搬管理员 Tab 4 布局（活动报名/课程预约切换 + 选择模式 + 卡片变色 + 批量通过/拒绝） |
| `pages/teacher-course-edit/` | 修改 | R5 教练选择卡片变色 + 中文日期 WXS |
| `pages/my-activities/` | 修改 | R6 删除顶部 toggle 和课程视图 |

#### 数据库变更（需执行 ALTER TABLE）

```sql
-- membership_cards 新增 2 列
ALTER TABLE membership_cards ADD COLUMN validity_start DATE DEFAULT NULL;
ALTER TABLE membership_cards ADD COLUMN validity_end DATE DEFAULT NULL;

-- user_membership_cards 新增 5 列
ALTER TABLE user_membership_cards ADD COLUMN valid_days INT DEFAULT NULL;
ALTER TABLE user_membership_cards ADD COLUMN validity_start DATE DEFAULT NULL;
ALTER TABLE user_membership_cards ADD COLUMN validity_end DATE DEFAULT NULL;
ALTER TABLE user_membership_cards ADD COLUMN activated_at DATETIME DEFAULT NULL;
ALTER TABLE user_membership_cards ADD COLUMN gift_from_admin TINYINT DEFAULT 0;
```

#### 关键逻辑

1. **`admin_or_teacher_required`**：10 个原 `@admin_required` 路由改为此装饰器，使教练可访问活动管理、报名审核、导出等功能
2. **期限卡自动过期**：`get_user_membership_cards` 查询时自动检测 `validity_end < 当前日期`，将 status 更新为 `expired`
3. **教练页面完全照搬管理员**：`teacher-course-management`（对应 Tab 3）、`teacher-booking-review`（对应 Tab 4）、`teacher-activity-management`（对应 Tab 2）三个页面的 WXML/WXSS/JS 完全克隆管理员后台对应 Tab，区别仅在 API 调用（如 `getTeacherCourses({ show_all: 1 })` vs `getTeacherCourses()`）
4. **赠送卡标记**：`gift_from_admin=1` 标识管理员赠送的卡，与用户购买的卡区分

---

### Bug #12 + 改版 #17：5项前端Bug修复与UI增强（2026-03-24）

**改版内容**：5项纯前端修改，无后端或数据库变更。

#### Bug #12：赠送会员卡弹窗点击事件穿透

**影响范围**：管理员后台 → 会员卡管理 → 赠送弹窗

**现象**：点击赠送会员卡弹窗内部任意位置（包括用户列表、搜索框等），弹窗直接关闭

**根因**：`admin.wxml` 中 `<view class="gift-modal" catchtap="">` 的 `catchtap=""` 空值处理器在部分微信版本中不能正确阻止事件冒泡，导致点击事件穿透到外层 `gift-modal-mask` 的 `bindtap="onCloseGiftModal"`

**修复**：`catchtap=""` → `catchtap="noop"`，并在 `admin.js` 新增 `noop() {}` 空方法

**同步修复**：赠送弹窗尺寸增大（`.gift-modal` width 85%→92%, max-height 80vh→85vh；`.gift-user-list` max-height 50vh→60vh）

#### 课程人员详情页增强

参考 `activity-participants` 页面，为 `course-participants` 页面添加：
- 每个参与者卡片 `bindtap="onParticipantClick"` 点击跳转到 `user-detail` 页面
- 状态标签（已通过/待审核/已拒绝）+ 箭头指示器 `›`
- 新增 `.participant-status`、`.status-tag`、`.arrow` 样式

**关键逻辑**：`course-participants` 页面是管理员（admin Tab 3）和教练（teacher-course-management）共享的同一页面，修改一处两端同时生效，无需重复修改。

#### 课程状态CSS样式补全

admin.wxss 中已有 `.status.published`、`.status.draft`、`.status.closed`，但缺少课程用的 `.status.active` 和 `.status.inactive`。新增：
- `.status.active`：绿色背景 `#4caf50`
- `.status.inactive`：红色背景 `#f44336`

#### 咨询信息编辑框改为自定义弹窗

**问题**：`wx.showModal({ editable: true })` 的系统弹窗输入框大小不可自定义，编辑体验差

**方案**：改为自定义弹窗（view + textarea），profile 页面新增：
- `profile.wxml`：编辑弹窗 HTML（遮罩 + 弹窗容器 + textarea `min-height: 300rpx` + 取消/保存按钮）
- `profile.wxss`：`.edit-modal-mask`、`.edit-modal`、`.edit-textarea`、`.edit-modal-footer` 等样式
- `profile.js`：data 新增 `showEditConsultModal`/`editConsultText`；新增 `noop()`、`onCloseEditConsultModal()`、`onConsultInput()`、`onSaveConsultInfo()` 方法；`onEditConsultInfo()` 改为打开自定义弹窗

#### 会员卡编辑页输入框灰色居中

`admin-membership-edit.wxss` 的 `.form-input` 添加 `text-align: center; color: #999;`，新增 `.picker-value { line-height: 80rpx; }` 使日期选择器文字垂直居中。影响字段：总次数、价格、起止日期、有效期。

#### 我的课程预约不显示数字

`profile.wxml` 个人中心网格中"我的课程预约"项移除 `myBookingsCount` 数字显示。

#### 涉及文件（10 个，均为前端）

| 文件 | 修改内容 |
|---|---|
| `pages/admin/admin.wxml` | `catchtap=""` → `catchtap="noop"` |
| `pages/admin/admin.js` | 新增 `noop() {}` |
| `pages/admin/admin.wxss` | 弹窗尺寸增大 + `.status.active`/`.status.inactive` 样式 |
| `pages/course-participants/course-participants.js` | 新增 `onParticipantClick()` 跳转 user-detail |
| `pages/course-participants/course-participants.wxml` | 参与者卡片添加 bindtap、data 属性、状态标签、箭头 |
| `pages/course-participants/course-participants.wxss` | 新增 `.participant-status`/`.status-tag`/`.arrow` |
| `pages/profile/profile.wxml` | 移除课程预约数字 + 新增自定义编辑弹窗 |
| `pages/profile/profile.wxss` | 新增编辑弹窗样式 |
| `pages/profile/profile.js` | 咨询信息编辑改为自定义弹窗逻辑 |
| `pages/admin-membership-edit/admin-membership-edit.wxss` | `.form-input` 居中灰色 + `.picker-value` 行高 |

---

### 6.1 已完成（2026-03-24 更新）
- [x] 教练预约审核功能（批量操作、自定义 checkbox）
- [x] 管理员课程预约管理（Tab 4 报名审核 + Tab 9 退款审核 添加课程预约视图）
- [x] 管理员复选框不显示勾选标记（Tab 4/8/9 替换为 view-based checkbox）
- [x] 教练操作审计日志（approve/reject_course_booking 添加 Logger.log_audit）
- [x] 课程预约页导航栏和多页面左右留白修复
- [x] `pendingBookingsCount` undefined 修复
- [x] 课程预约拒绝字段名不匹配修复
- [x] timedelta/Decimal 序列化修复
- [x] 审核页面选择模式改版（移除 checkbox，改为"选择模式 + 卡片变色"，涵盖 admin Tab 4/8/9 + 教练预约审核）
- [x] 活动管理轮播活动未在首页显示修复（venue-home.js 合并 venue_content + activities/carousel 双数据源）
- [x] venue_content 关联项默认标题和图片自动填充（后端 get_venue_content 兜底填充 + link-options 返回图片 + 前端选择时即时填充 + 校验放宽）
- [x] **微信支付V3集成**：`wechat_pay.py` 新建，`create_payment_order` / `payment_callback` 重写，支持活动/课程/商品三种类型，DEBUG mock
- [x] **免审核功能**：活动和课程编辑页添加"不需要审核"复选框，后端 `register_activity` / `create_course_booking` 支持免审核直接支付
- [x] **拒绝后重新报名**：`register_activity` 支持 rejected 状态 DELETE+INSERT，前端 activity-detail 显示"重新报名"
- [x] **完整退款流程**：新增 `request_course_refund` / `request_order_refund` 接口，`admin_get_refunds` / `admin_review_refund` 支持三种类型，管理员退款审核页新增商品退款 Tab
- [x] **订单详情页**：`order-detail` 页面新建，支持支付和退款操作；`payment.js` 工具新建
- [x] **用户历史数据**：`admin_get_user_detail` 添加 activity_history / course_history / order_history
- [x] **我的活动 Tab 切换**：`my-activities` 页面添加活动/课程顶部 Tab，课程 Tab 从 `/api/course-bookings` 获取数据并客户端分组
- [x] **课程通知增强**：`notifier.py` 新增 `notify_course_booking` 同时通知教练+管理员，`notify_admin_new_registration` 支持 `item_type` 参数
- [x] **积分系统统一**：所有支付（活动/课程/商品）在 `payment_callback` 中统一发放积分，退款时扣减
- [x] **数据库 ALTER TABLE**：activities / teacher_courses 添加 `no_review_needed`；user_activities / teacher_course_bookings / orders 添加支付交易号和退款字段
- [x] **myBookingsCount undefined 修复**（Bug #10）：profile.js `loadMyBookingsCount()` 正确处理分页对象
- [x] **课程编辑按钮布局修复**（Bug #11）：teacher-course-edit.wxss `.actions` 添加 `flex-wrap: wrap`
- [x] **咨询信息系统**（改版 #14）：新建 `site_settings` 表 + GET/PUT API + 4 个详情页底部操作栏（首页/分享/咨询）+ 个人中心咨询信息展示（管理员可编辑）+ activity-detail 咨询改为动态获取
- [x] **用户详情页历史记录增强**（改版 #15）：`admin_get_user_detail` 三个历史查询增强 + 前端字段映射 + 始终显示 + 空状态提示
- [x] **课程预约页面完整实现**（改版 #15）：分页 Bug 修复、tabs 更新为 4 个、封面图+类型标签、查看课程跳转、橙色导航栏
- [x] **免审核逻辑代码验证通过**（改版 #15）：活动和课程的免审核逻辑在 6 个检查点均正确
- [x] **R1 会员卡赠送**（改版 #16）：管理员后台新增赠送弹窗，后端 `POST /api/admin/membership-cards/<id>/gift`，`user_membership_cards` 标记 `gift_from_admin=1`
- [x] **R2 期限卡增强**（改版 #16）：`membership_cards` 新增 `validity_start`/`validity_end`，用户侧激活机制 + 自动过期检测 + 状态徽章
- [x] **R3 课程人员详情**（改版 #16）：新增 `course-participants` 页面 + `GET /api/teacher-courses/<id>/participants` 后端接口
- [x] **R4 教练后台页面复用**（改版 #16）：新增 `teacher-activity-management` 页面（照搬管理员 Tab 2）；`teacher-course-management` 完全重写（照搬管理员 Tab 3）；`teacher-booking-review` 完全重写（照搬管理员 Tab 4）；`auth.py` 新增 `admin_or_teacher_required` 装饰器，10 个路由共享
- [x] **R5 批量选择改版**（改版 #16）：教练课程编辑页卡片变色选择 + 中文日期 WXS；管理员会员卡编辑页有效期字段 + 卡片变色选择
- [x] **R6 活动历史简化**（改版 #16）：`my-activities` 页面删除顶部 toggle 和课程视图，仅保留活动列表
- [x] **Bug #12 赠送弹窗事件穿透修复**（改版 #17）：`catchtap=""` → `catchtap="noop"` + 弹窗尺寸增大
- [x] **课程人员详情增强**（改版 #17）：`course-participants` 页面添加点击跳转 user-detail、状态标签、箭头指示器
- [x] **课程状态CSS补全**（改版 #17）：admin.wxss 新增 `.status.active`/`.status.inactive` 颜色样式
- [x] **咨询信息自定义编辑弹窗**（改版 #17）：profile 页面从 `wx.showModal` 改为自定义弹窗（textarea 300rpx+）
- [x] **会员卡编辑输入框居中灰色**（改版 #17）：`admin-membership-edit.wxss` `.form-input` 居中 + 灰色
- [x] **课程预约数字隐藏**（改版 #17）：profile 页面移除"我的课程预约"下方数字显示

---

### Bug #10：`myBookingsCount` undefined — 课程预约分页对象当数组用（2026-03-23）

**影响范围**：个人中心页面（profile）

**现象**：进入个人中心后控制台报错 `Setting data field 'myBookingsCount' to undefined is invalid`

**根因**：`profile.js` 的 `loadMyBookingsCount()` 中，`GET /api/course-bookings` 返回分页对象 `{list: [...], total, page, limit}`，但代码用 `cards.length` 取长度（对象无 `.length` 返回 undefined）。与 Bug #5 同类问题。

**修复**：改为 `(data && data.total) ? data.total : ((data && data.list) ? data.list.length : 0)`

**文件**：`pages/profile/profile.js` `loadMyBookingsCount()` 方法

---

### Bug #11：课程编辑页底部保存/取消按钮换行错位（2026-03-23）

**影响范围**：教练课程编辑页（teacher-course-edit）

**现象**：底部操作栏的"不需要审核"section 与保存/取消按钮在同一行显示异常

**根因**：`.actions` 使用 `display: flex` 但无 `flex-wrap`，`.no-review-section` 设置 `width: 100%` 但 flex 布局不换行，导致按钮被挤压

**修复**：`.actions` 添加 `flex-wrap: wrap`，使 100% 宽度的 section 独占一行，按钮自动换行到下一行

**文件**：`pages/teacher-course-edit/teacher-course-edit.wxss` `.actions` 样式

---

### 改版 #14：咨询信息系统 + 详情页底部操作栏（2026-03-23）

**改版内容**：
1. 新建 `site_settings` 数据库表，存储咨询信息（可扩展其他站点配置）
2. 后端新增 GET/PUT `/api/site-settings/consult-info` 接口
3. 活动/私教课程/团课/商品 4 个详情页底部栏添加"首页/分享/咨询"操作按钮
4. 活动详情页 `onConsult()` 从硬编码改为调用 API 获取
5. 个人中心页面添加咨询信息展示卡片（管理员可编辑）

#### 数据库变更（已执行 2026-03-23）

```sql
CREATE TABLE site_settings (
  id INT NOT NULL AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_setting_key (setting_key)
);
INSERT INTO site_settings (setting_key, setting_value)
VALUES ('consult_info', '请添加客服微信：outdoor_service\n或拨打电话：400-123-4567');
```

#### 涉及后端文件

| 文件 | 操作 | 说明 |
|---|---|---|
| `app.py` | 修改 | 末尾新增 `get_consult_info()` 和 `update_consult_info()` 两个路由函数 |

#### 涉及前端文件（13 个）

| 文件 | 操作 | 说明 |
|---|---|---|
| `utils/api.js` | 修改 | 新增 `getConsultInfo()` 和 `updateConsultInfo()` 方法 |
| `pages/teacher-course-detail/teacher-course-detail.wxml` | 修改 | 底部栏添加 action-buttons（首页/分享/咨询），移除 price-show |
| `pages/teacher-course-detail/teacher-course-detail.wxss` | 修改 | 重写 `.bottom-bar` 布局，新增 `.action-buttons`/`.action-btn`/`.purchase-area` 样式 |
| `pages/teacher-course-detail/teacher-course-detail.js` | 修改 | 新增 `api` require、`onGoHome()`、`onShareAppMessage()`、`onConsult()` |
| `pages/group-course-detail/group-course-detail.wxml` | 修改 | 底部栏添加 action-buttons，原按钮移入 `.enroll-area` |
| `pages/group-course-detail/group-course-detail.wxss` | 修改 | 重写 `.bottom-bar` 布局，新增 `.action-buttons`/`.action-btn`/`.enroll-area` 样式 |
| `pages/group-course-detail/group-course-detail.js` | 修改 | 新增 `api` require、`onGoHome()`、`onShareAppMessage()`、`onConsult()` |
| `pages/product-detail/product-detail.wxml` | 修改 | 底部栏添加 action-buttons，原按钮移入 `.purchase-area` |
| `pages/product-detail/product-detail.wxss` | 修改 | 重写 `.bottom-bar` 布局，新增 `.action-buttons`/`.action-btn`/`.purchase-area` 样式 |
| `pages/product-detail/product-detail.js` | 修改 | 新增 `api` require、`onGoHome()`、`onShareAppMessage()`、`onConsult()` |
| `pages/activity-detail/activity-detail.js` | 修改 | `onConsult()` 从硬编码改为 `await api.getConsultInfo()` 动态获取 |
| `pages/profile/profile.wxml` | 修改 | 个人中心网格后、教练后台前添加咨询信息卡片（管理员显示"修改"按钮） |
| `pages/profile/profile.wxss` | 修改 | 新增 `.consult-info-card`/`.consult-header`/`.consult-title`/`.consult-edit-btn`/`.consult-content` 样式 |
| `pages/profile/profile.js` | 修改 | data 新增 `consultInfo`；新增 `loadConsultInfo()`、`onEditConsultInfo()` 方法；`checkLoginStatus()` 中调用 `loadConsultInfo()` |

#### 关键逻辑

1. **site_settings 表设计**：通用键值对表，使用 `setting_key` UNIQUE 约束 + `INSERT ... ON DUPLICATE KEY UPDATE` 实现 upsert，未来可扩展存储其他站点级配置
2. **咨询信息获取**：GET 接口无需认证（公开信息），PUT 接口需要 `@admin_required`
3. **底部操作栏布局**：左侧 `.action-buttons`（首页/分享/咨询 三个按钮纵向排列）+ 右侧原有操作区域（购买/报名/购物车等），使用 `justify-content: space-between` 分隔
4. **分享按钮**：使用 `open-type="share"` 触发微信原生分享，对应 `onShareAppMessage()` 返回自定义分享卡片（标题+路径+封面图）
5. **个人中心编辑**：使用 `wx.showModal({ editable: true })` 实现文本编辑弹窗，管理员修改后即时调用 PUT 接口保存

### 6.2 待验证功能
- [ ] 微信支付V3生产环境验证（当前 DEBUG=True 使用 mock，需配置真实商户证书后测试）
- [ ] 微信支付回调通知地址（`WECHAT_PAY_NOTIFY_URL`）需配置为公网可访问地址
- [ ] 微信模板消息发送（template_id 均为占位符）
- [ ] 活动提醒定时任务是否已配置 cron
- [ ] 数据库备份定时任务是否已配置 cron
- [ ] 日志清理定时任务是否已配置 cron
- [ ] 前端 `order-detail` 页面支付和退款流程端到端测试
- [ ] 免审核活动/课程→报名→支付→积分 完整流程测试（代码逻辑已验证正确，待生产环境端到端测试）
- [ ] 退款审核→微信退款→积分扣减 完整流程测试

### 6.3 潜在优化项
- [ ] `upload_image` 接口无认证保护（任何人可上传）
- [ ] 速率限制使用内存存储（重启后丢失，多进程不共享）
- [ ] `products` 表无外键关联 `product_categories`，分类使用字符串匹配
- [ ] 部分管理员接口使用 `@login_required` 而非 `@admin_required`（如 `create_teacher_course`、`approve_course_booking`）
- [ ] 密码存储为明文（`password` 字段 varchar(255)，无 hash）

---

## 7. 技术选型与陷阱

### 7.1 两套 API 调用模式 ★★★ 最重要的陷阱

前端存在两种 API 调用模式，**响应检查方式不同**：

| 模式 | 使用方式 | 检查方式 |
|---|---|---|
| **模式 A**：`api.js` 封装 | `const result = await api.xxx()` | 检查 `result.success` |
| **模式 B**：直接 `wx.request` | `wx.request({...success(res){}})` | 检查 `res.data.code === 200` |

**后端必须同时返回 `success: true` 和 `code: 200`**，否则其中一种模式会失败。

使用模式 B 的页面：`home.js`, `teacher-course-edit.js`, `admin-membership-edit.js`, `admin-venue-content.js`, `user-detail.js`(loadTeacherCourses)

### 7.2 数据库字段命名注意

| 容易混淆的字段 | 正确名称 | 所在表 |
|---|---|---|
| 课程名称 | `title`（不是 `course_name`） | `teacher_courses` |
| 内容类型 | `content_type`（不是 `type`） | `venue_content` |
| 排序字段 | `sort_order`（不是 `display_order`） | `venue_content` |
| 用户角色 | `role`（user/admin） | `users` |
| 用户类型 | `user_type`（user/teacher/admin） | `users` |

**`role` vs `user_type` 的区别**：
- `role`：控制管理员权限（admin_required 检查此字段）
- `user_type`：控制用户身份类型（教练/普通用户，影响 UI 显示）
- 两者独立，一个用户可以是 `role=admin` + `user_type=teacher`

### 7.3 Flask 开发模式

后端运行 `debug=True`，修改 `.py` 文件后自动重载。**不需要手动重启服务**。

### 7.4 文件上传

- 文件保存在本地 `uploads/` 目录
- 文件名格式：`{folder}_{毫秒时间戳}_{4位随机数}.{扩展名}`
- 返回 URL 格式：`http://localhost:5001/uploads/{folder}/{filename}`
- 前端上传使用 `wx.uploadFile()`，不能通过 `api.js` 的 `request()` 方法

### 7.5 数据库连接池

使用 DBUtils 的 PooledDB，最大 20 个连接。每个请求通过 `get_db_connection()` 获取连接，使用后需确保释放（`connection.close()` 归还到池中）。

### 7.6 积分规则

- 每消费 100 元 = 1 积分（`int(amount / 100)`）
- **所有支付类型**（活动/课程/商品）均在 `payment_callback` 中统一发放积分
- 退款时通过 `deduct_user_points()` 扣减对应积分
- 积分记录在 `user_points` 表，当前余额在 `users.total_points`
- `add_user_points(user_id, amount, change_type, order_id, booking_id, description)` — 增加积分
- `deduct_user_points(user_id, amount, change_type, order_id, booking_id, description)` — 扣减积分
- change_type 区分来源：`activity_payment`、`course_payment`、`product_payment`、`activity_refund`、`course_refund`、`product_refund`

### 7.7 训练统计跨表计算

`GET /api/users/training-stats` 涉及的表关联和计算逻辑：

| 统计项 | 数据来源 | 计算方式 |
|---|---|---|
| 累计天数 | `users.created_at` | `(today - created_at).days` |
| 累计训练次数 | `user_activities JOIN activities` + `teacher_course_bookings` | 活动按天展开 `(end-start).days+1` + 课程预约条数 |
| 本月训练次数 | 同上，限定当月 | 活动仅计月内重叠天数 + 当月课程预约 |
| 本月训练天数 | 同上 | 收集所有训练日期去重计数 |
| 本月训练时长 | `activities` 时长 + `teacher_courses.duration` | 活动按比例分配到月内天数 + 课程 duration（分钟） |

- 活动状态筛选：`status IN ('approved', 'completed')`
- 课程预约状态筛选：`status IN ('approved', 'completed')`
- 多日活动跨月时，仅计算当月重叠部分的天数和时长

### 7.8 `get_course_bookings` 返回分页对象（非数组） ★★ 容易踩坑

`GET /api/course-bookings` 返回 `{list: [...], total, page, limit}`，**不是直接数组**。

前端取数据必须用 `(data && data.list) || []`，不能直接用 `data || []`。

`role` 参数支持 3 个值：
| role | 过滤方式 | 用途 |
|---|---|---|
| `'user'`（默认） | 按 `user_id` 过滤 | 用户查看自己的预约 |
| `'teacher'` | 按 `teacher_id` 过滤 | 教练查看名下预约 |
| `'admin'` | 不过滤（需管理员权限） | 管理员查看所有预约 |

### 7.9 MySQL TIME 字段序列化 ★★

MySQL TIME 类型在 PyMySQL 中返回 `datetime.timedelta` 对象（非字符串），Flask jsonify 无法序列化。类似地，`Decimal` 类型也不可序列化。

**解决方案**：fetchall 后遍历结果，手动格式化：
- `timedelta` → `f"{total_secs // 3600:02d}:{(total_secs % 3600) // 60:02d}"`
- `Decimal` → `float(val)`
- `datetime` → `val.strftime('%Y-%m-%d %H:%M:%S')`

### 7.10 微信小程序选择控件与样式绑定陷阱 ★★★

微信小程序中实现"选中/取消选中"的视觉反馈存在多个坑，以下按可靠性排列：

| 方案 | 可靠性 | 说明 |
|---|---|---|
| 原生 `<checkbox>` | ❌ 不可靠 | 某些环境不渲染勾选标记 |
| view-based + CSS `.checked` 类 | ❌ 不可靠 | WXSS 复合选择器 `.classA.classB` 不可靠地应用动态样式 |
| view-based + 父级 CSS `.parent .checked` | ❌ 不可靠 | 同上 |
| 内联 `style` + `array.indexOf()` | ❌ 不可靠 | 模板引擎不可靠地评估数组方法调用，`setData` 后不触发重渲染 |
| 内联 `style` + `item.selected` 布尔属性 | ✅ **可靠** | 数据项自身属性变更可被 `setData` diff 正确检测 |

**唯一可靠方案**：
```javascript
// JS — 选择/取消选择
const list = this.data.list.map(item => {
  if (item.id === targetId) return { ...item, selected: !item.selected }
  return item
})
this.setData({ list })
```
```wxml
<!-- WXML — 样式绑定 -->
<view style="{{item.selected ? 'background-color:#e3f2fd;border-left-color:#1296db' : ''}}">
```

**各页面主题色**：管理员 `#1296db`/`#e3f2fd`（蓝色）、教练 `#4caf50`/`#e8f5e9`（绿色）、购物车 `#ff5722`（橙红色）

### 7.11 WXML 模板 style 绑定的响应式限制 ★★

WXML 模板中 `style` 属性的数据绑定对表达式类型有限制：

| 表达式 | 是否触发更新 | 说明 |
|---|---|---|
| `{{item.selected ? '...' : ''}}` | ✅ 可靠 | 简单属性访问 |
| `{{array.indexOf(item.id) > -1 ? '...' : ''}}` | ❌ 不可靠 | 数组方法调用 |
| `{{obj[item.id] ? '...' : ''}}` | ⚠️ 未验证 | 动态键访问 |

**原理**：`setData` 的 diff 机制基于数据路径（data path）。当使用 `item.selected`（直接属性）时，`setData({ list })` 后框架能正确检测到列表项属性变化并重渲染。但 `array.indexOf()` 依赖的 `selectedArray` 是独立数据路径，框架不会因为 `selectedArray` 变化而重新评估引用它的 `style` 表达式。

**结论**：在 WXML `style` 绑定中，只使用当前迭代项 `item` 自身的属性，避免引用外部数组/对象的方法调用。

### 7.12 首页轮播双数据源架构 ★★

场馆首页轮播图来自**两个独立的数据源**，前端合并后统一显示：

| 数据源 | 表/字段 | 管理入口 | API |
|--------|---------|---------|-----|
| 首页内容管理 | `venue_content` 表 `content_type='carousel'` | admin-venue-content 页面 | `GET /api/venue-content?content_type=carousel` |
| 活动管理 | `activities` 表 `is_carousel=1` | 活动编辑页勾选"设为轮播" | `GET /api/activities/carousel` |

**前端合并逻辑**（`venue-home.js` `loadCarousel()`）：
1. 并行请求两个 API
2. 收集 `venue_content` 中已通过 `link_type='activity'` 关联的活动 ID
3. 活动轮播中排除已被关联的（防重复），剩余转为 venue_content 格式
4. 合并后按 `sort_order` 排序

**`venue_content` 关联项默认填充**：
- 后端 `get_venue_content()` 返回时，自动为有 `link_type`+`link_id` 但缺少 `title`/`image_url` 的条目从关联表填充默认值
- 前端 `admin-venue-content.js` 选择关联项时也会即时填充标题和图片到表单
- 管理员手动设置的值不会被覆盖

### 7.13 venue_content 各表图片字段差异 ★

不同表的图片字段名和格式不同，使用时需注意转换：

| 表 | 字段 | 格式 |
|---|---|---|
| `activities` | `cover_images` | JSON 数组（多张图） |
| `teacher_courses` | `cover_image` | 单个 URL 字符串 |
| `products` | `image_url` | 单个 URL 字符串 |
| `venue_content` | `image_url` | 单个 URL 字符串 |

`link-options` API 和 `get_venue_content` 后端填充时，均将上述字段统一转为 `image_url`（活动取 `cover_images[0]`）。

### 7.14 微信支付V3 `out_trade_no` 前缀路由 ★★★

支付系统使用 `out_trade_no` 前缀区分三种订单类型，payment_callback 根据前缀路由到不同的表：

| 前缀 | 类型 | 更新表 | 金额字段 |
|---|---|---|---|
| `ACT` | 活动报名 | `user_activities` | `total_amount` |
| `CRS` | 课程预约 | `teacher_course_bookings` | `payment_amount` ★ 注意不同 |
| `OD` | 商品订单 | `orders` | `total_amount` |

**格式**：`{前缀}{record_id}_{13位时间戳}`，例如 `ACT123_1711012345678`

**幂等处理**：回调中先查询 `payment_status`，若已是 `paid` 则直接返回成功，避免重复积分发放和状态更新。

### 7.15 免审核 + 支付流程 ★★

免审核逻辑的完整流程（活动和课程通用）：

```
报名请求 → 检查 no_review_needed
  ├─ no_review_needed=1 → status='approved', 不发通知 → 返回 need_payment=True → 前端调起支付
  └─ no_review_needed=0 → status='pending', 发送通知 → 返回 need_payment=False → 等待审核
```

前端根据 `need_payment` 字段决定是否立即调起 `triggerPayment()`。

### 7.16 课程预约通知双发 + 一方审核

课程预约通知机制：
- **需要审核时**：`Notifier.notify_course_booking()` 同时通知教练（teacher_id）和所有管理员
- **免审核时**：不发送任何通知
- **一方审核后**：教练或管理员任一方审核（approve/reject），`status` 从 `pending` 变更，另一方查询待审核列表时自然不再显示（无需额外逻辑）

### 7.17 `teacher_course_bookings` 金额字段差异 ★★

| 表 | 金额字段 | 用途 |
|---|---|---|
| `user_activities` | `total_amount` | 活动报名总金额 |
| `teacher_course_bookings` | `payment_amount` | 课程预约支付金额（**不是** `total_amount`） |
| `orders` | `total_amount` | 商品订单总金额 |

`payment_callback` 中课程积分计算必须使用 `float(record['payment_amount'])`，不能用 `total_amount`（该字段不存在）。

### 7.18 `utils/payment.js` 前端支付封装

```javascript
triggerPayment(type, orderId, totalAmount)
// type: 'activity' | 'course' | 'product'
// 调用 api.createPaymentOrder → wx.requestPayment
// 返回 { success: true } 或 { cancelled: true } 或 throw error
```

`activity-detail.js`（活动支付）和 `order-detail.js`（商品支付）均使用此函数。

### 7.19 `site_settings` 键值对表设计模式 ★

`site_settings` 表采用通用键值对设计，适用于少量全局配置项：

| setting_key | 用途 | 管理入口 |
|---|---|---|
| `consult_info` | 咨询信息（各详情页"咨询"弹窗 + 个人中心展示） | 个人中心管理员"修改"按钮 |

**upsert 语法**：`INSERT INTO site_settings (setting_key, setting_value) VALUES (%s, %s) ON DUPLICATE KEY UPDATE setting_value = %s`

**前端调用模式**：
- 详情页 `onConsult()`：`await api.getConsultInfo()` → `wx.showModal({ content: result.data.consult_info })`
- 个人中心展示：`loadConsultInfo()` → `setData({ consultInfo })`
- 管理员编辑：`wx.showModal({ editable: true })` → `await api.updateConsultInfo({ consult_info: res.content })`

### 7.20 详情页底部操作栏统一布局 ★

4 个详情页（activity-detail / teacher-course-detail / group-course-detail / product-detail）均采用统一的底部栏布局：

```
┌─────────────────────────────────────────┐
│  🏠  📤  💬  │       [原有操作按钮]     │
│ 首页 分享 咨询 │  价格/购买/报名/购物车等  │
└─────────────────────────────────────────┘
```

- 左侧 `.action-buttons`：三个小按钮（emoji图标 + 文字），flex 纵向排列
- 右侧：各页面原有的操作区域（购买按钮、报名按钮、购物车等）
- 整体使用 `justify-content: space-between` 分隔
- `open-type="share"` 触发原生分享，需配合 `onShareAppMessage()` 方法

### 7.21 `admin_get_user_detail` 历史数据架构 ★★

`GET /api/admin/users/{id}` 的 `admin_get_user_detail` 函数在一次 API 调用中内嵌返回三项历史数据：

| 返回字段 | 数据来源 | 关联查询 |
|---|---|---|
| `activity_history` | `user_activities JOIN activities` | `a.title as activity_title`、`a.activity_start`、`a.activity_end`、`a.location` |
| `course_history` | `teacher_course_bookings JOIN teacher_courses LEFT JOIN teacher_course_schedules LEFT JOIN users(教练)` | `tc.title as course_title`、`tc.course_type`、`tc.cover_image`、`tcs.schedule_date/start_time/end_time`、`t.real_name as teacher_name` |
| `order_history` | `orders` + 循环查询 `order_items JOIN products` | 第一个 item 的 `name` 作为 `product_name` |

**前端字段映射**（`user-detail.js` `loadUserDetail()` 中）：
- `activity_title` → `title`
- `course_title` → `title`
- 订单：`product_name` 兜底为 `'订单#' + item.id`

**通用序列化**：三个历史列表的 fetchall 结果均需遍历处理：
- `Decimal` → `float(val)`
- `datetime` → `val.strftime('%Y-%m-%d %H:%M:%S')`
- `timedelta`（MySQL TIME 类型）→ `f"{hours:02d}:{minutes:02d}"`

**注意**：前端**不需要**调用单独的 `GET /api/users/{id}/history` 端点，所有历史数据已在 `admin_get_user_detail` 响应中返回。

---

### 7.22 `admin_or_teacher_required` 装饰器 ★★

`auth.py` 中新增的装饰器，用于 10 个需要管理员或教练都能访问的路由。检查逻辑：`role == 'admin'` **或** `user_type == 'teacher'`。

使用此装饰器的路由包括：活动 CRUD（4 个）、活动报名审核（2 个）、报名列表导出、教练课程（2 个）、课程预约审核（2 个）等。

**注意**：新增管理员/教练共享路由时，应使用 `@admin_or_teacher_required` 而非 `@admin_required`。仅限管理员的操作（如用户权限修改、数据备份）继续使用 `@admin_required`。

### 7.23 会员卡自动过期检测机制 ★★

`get_user_membership_cards` 接口在查询用户持有的会员卡时，会自动检测期限卡是否过期（`validity_end < 当前日期`），如果过期则自动将 `status` 更新为 `expired`。

这意味着：
- 不需要定时任务来过期会员卡
- 过期检测是**惰性的**（lazy），仅在用户查询自己的会员卡时触发
- 前端 `my-membership-cards` 页面根据 `status` 字段显示不同样式（过期灰显 + 状态徽章）

### 7.24 `catchtap=""` 空值事件穿透陷阱 ★★

微信小程序中 `catchtap=""` 空字符串处理器在**部分微信版本中不能正确阻止事件冒泡**，导致弹窗内部点击事件穿透到外层遮罩。

**正确做法**：
```wxml
<!-- ✅ 绑定到实际方法名 -->
<view class="modal-mask" bindtap="onClose">
  <view class="modal" catchtap="noop">  <!-- 阻止冒泡 -->
    ...
  </view>
</view>
```
```javascript
// JS 中定义空方法
noop() {},
```

**错误做法**：
```wxml
<!-- ❌ 空值在部分版本不生效 -->
<view class="modal" catchtap="">
```

项目中已在 `admin.js` 和 `profile.js` 中使用此 `noop()` 模式。

### 7.25 `wx.showModal({ editable: true })` 输入框大小限制 ★

`wx.showModal` 的 `editable: true` 模式提供的输入框大小由系统控制，**不可自定义**。对于需要较大编辑区域的场景（如咨询信息编辑），应使用自定义弹窗（view + textarea）替代。

**自定义弹窗模式**（profile 页面已使用）：
- 遮罩层 `bindtap` 关闭 + 弹窗容器 `catchtap="noop"` 防穿透
- `<textarea>` 组件可自由设置 `min-height`（如 300rpx+）
- 手动管理弹窗状态（`showEditModal` 布尔值）和输入数据（`editText`）

### 7.26 `course-participants` 页面共享架构 ★

`course-participants` 页面被两个入口共享：
- 管理员后台 admin.wxml Tab 3（课程管理）→ "人员详情"按钮
- 教练后台 teacher-course-management.wxml → "人员详情"按钮

两者均通过 `wx.navigateTo({ url: '/pages/course-participants/course-participants?courseId=' + courseId })` 导航到同一页面。因此对 `course-participants` 的修改会同时影响两个入口，无需重复修改。

---

> **文档结束** — 本文件应随项目演进持续更新。
