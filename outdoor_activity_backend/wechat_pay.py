"""
微信支付 V3 工具模块
封装 JSAPI 统一下单、签名生成、回调验签、回调解密、退款等核心逻辑。
所有敏感参数通过 Config.xxx 引用，不硬编码任何密钥/商户号/路径。
"""

import os
import time
import json
import uuid
import base64
import requests
from config import Config

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# 模块级缓存
_private_key = None
_public_key = None


def _load_private_key():
    """从 Config.WECHAT_MCH_KEY_PATH 加载商户 RSA 私钥（缓存）"""
    global _private_key
    if _private_key is not None:
        return _private_key

    key_path = os.path.join(os.path.dirname(__file__), Config.WECHAT_MCH_KEY_PATH)
    with open(key_path, 'rb') as f:
        _private_key = serialization.load_pem_private_key(f.read(), password=None)
    return _private_key


def _load_public_key():
    """从 Config.WECHAT_PAY_PUB_KEY_PATH 加载微信支付公钥（缓存）"""
    global _public_key
    if _public_key is not None:
        return _public_key

    key_path = os.path.join(os.path.dirname(__file__), Config.WECHAT_PAY_PUB_KEY_PATH)
    with open(key_path, 'rb') as f:
        _public_key = serialization.load_pem_public_key(f.read())
    return _public_key


def _generate_nonce():
    """生成随机字符串"""
    return uuid.uuid4().hex


def _generate_sign(method, url_path, timestamp, nonce_str, body):
    """
    构建签名串并用商户私钥 RSA-SHA256 签名。
    签名串格式：{method}\n{url_path}\n{timestamp}\n{nonce_str}\n{body}\n
    """
    sign_str = f"{method}\n{url_path}\n{timestamp}\n{nonce_str}\n{body}\n"
    private_key = _load_private_key()
    signature = private_key.sign(
        sign_str.encode('utf-8'),
        padding.PKCS1v15(),
        hashes.SHA256()
    )
    return base64.b64encode(signature).decode('utf-8')


def _build_auth_header(method, url_path, body=''):
    """
    生成 Authorization header。
    格式：WECHATPAY2-SHA256-RSA2048 mchid="...",nonce_str="...",signature="...",timestamp="...",serial_no="..."
    """
    timestamp = str(int(time.time()))
    nonce_str = _generate_nonce()
    signature = _generate_sign(method, url_path, timestamp, nonce_str, body)

    auth = (
        f'WECHATPAY2-SHA256-RSA2048 '
        f'mchid="{Config.WECHAT_MCH_ID}",'
        f'nonce_str="{nonce_str}",'
        f'signature="{signature}",'
        f'timestamp="{timestamp}",'
        f'serial_no="{Config.WECHAT_MCH_SERIAL_NO}"'
    )
    return auth


def create_jsapi_order(openid, out_trade_no, total_fen, description):
    """
    调用微信支付 V3 JSAPI 统一下单接口。

    参数：
        openid: 用户的微信 openid
        out_trade_no: 商户订单号
        total_fen: 支付金额（单位：分）
        description: 商品描述

    返回：prepay_id 字符串

    DEBUG 模式下返回模拟 prepay_id。
    """
    if Config.DEBUG:
        return f"mock_prepay_{int(time.time())}"

    url_path = '/v3/pay/transactions/jsapi'
    url = f'https://api.mch.weixin.qq.com{url_path}'

    body_dict = {
        'appid': Config.WECHAT_APP_ID,
        'mchid': Config.WECHAT_MCH_ID,
        'description': description,
        'out_trade_no': out_trade_no,
        'notify_url': Config.WECHAT_PAY_NOTIFY_URL,
        'amount': {
            'total': total_fen,
            'currency': 'CNY'
        },
        'payer': {
            'openid': openid
        }
    }
    body = json.dumps(body_dict, ensure_ascii=False)
    auth_header = _build_auth_header('POST', url_path, body)

    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': auth_header
    }

    resp = requests.post(url, data=body.encode('utf-8'), headers=headers, timeout=10)

    if resp.status_code == 200:
        result = resp.json()
        return result['prepay_id']
    else:
        error_info = resp.json() if resp.headers.get('Content-Type', '').startswith('application/json') else resp.text
        raise Exception(f"微信支付下单失败: {resp.status_code} - {error_info}")


def generate_jsapi_sign(prepay_id):
    """
    生成 wx.requestPayment 所需的 5 个参数。

    返回 dict: {timeStamp, nonceStr, package, signType, paySign}

    DEBUG 模式下返回模拟参数。
    """
    timestamp = str(int(time.time()))
    nonce_str = _generate_nonce()
    package = f"prepay_id={prepay_id}"

    if Config.DEBUG:
        return {
            'timeStamp': timestamp,
            'nonceStr': nonce_str,
            'package': package,
            'signType': 'RSA',
            'paySign': 'mock_pay_sign'
        }

    # V3 签名：{appId}\n{timeStamp}\n{nonceStr}\n{package}\n
    sign_str = f"{Config.WECHAT_APP_ID}\n{timestamp}\n{nonce_str}\n{package}\n"
    private_key = _load_private_key()
    signature = private_key.sign(
        sign_str.encode('utf-8'),
        padding.PKCS1v15(),
        hashes.SHA256()
    )
    pay_sign = base64.b64encode(signature).decode('utf-8')

    return {
        'timeStamp': timestamp,
        'nonceStr': nonce_str,
        'package': package,
        'signType': 'RSA',
        'paySign': pay_sign
    }


def verify_callback_signature(headers, body):
    """
    验证微信支付回调的签名。

    参数：
        headers: 请求头字典（需包含 Wechatpay-Timestamp, Wechatpay-Nonce, Wechatpay-Signature）
        body: 原始请求体字符串

    返回：True/False

    DEBUG 模式下跳过验签。
    """
    if Config.DEBUG:
        return True

    timestamp = headers.get('Wechatpay-Timestamp', '')
    nonce = headers.get('Wechatpay-Nonce', '')
    signature_b64 = headers.get('Wechatpay-Signature', '')

    if not all([timestamp, nonce, signature_b64]):
        return False

    # 构建验签字符串
    verify_str = f"{timestamp}\n{nonce}\n{body}\n"
    signature = base64.b64decode(signature_b64)

    public_key = _load_public_key()
    try:
        public_key.verify(
            signature,
            verify_str.encode('utf-8'),
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        return True
    except Exception:
        return False


def decrypt_callback_data(resource):
    """
    AES-256-GCM 解密回调通知数据。

    参数：
        resource: 回调 JSON 中的 resource 字典，包含 ciphertext, nonce, associated_data

    返回：解密后的 dict（包含 out_trade_no, transaction_id, trade_state 等）

    DEBUG 模式下不会被调用（由调用方处理）。
    """
    ciphertext = base64.b64decode(resource['ciphertext'])
    nonce = resource['nonce'].encode('utf-8')
    associated_data = resource.get('associated_data', '').encode('utf-8')

    key = Config.WECHAT_APIV3_KEY.encode('utf-8')
    aesgcm = AESGCM(key)

    plaintext = aesgcm.decrypt(nonce, ciphertext, associated_data)
    return json.loads(plaintext.decode('utf-8'))


def create_refund(out_trade_no, out_refund_no, total_fen, refund_fen, reason=''):
    """
    调用微信支付 V3 退款接口。

    参数：
        out_trade_no: 原商户订单号
        out_refund_no: 商户退款单号
        total_fen: 原订单金额（分）
        refund_fen: 退款金额（分）
        reason: 退款原因

    返回：退款结果 dict

    DEBUG 模式下直接返回模拟成功结果。
    """
    if Config.DEBUG:
        return {
            'status': 'SUCCESS',
            'refund_id': f"mock_refund_{int(time.time())}",
            'out_refund_no': out_refund_no
        }

    url_path = '/v3/refund/domestic/refunds'
    url = f'https://api.mch.weixin.qq.com{url_path}'

    body_dict = {
        'out_trade_no': out_trade_no,
        'out_refund_no': out_refund_no,
        'reason': reason,
        'amount': {
            'refund': refund_fen,
            'total': total_fen,
            'currency': 'CNY'
        }
    }
    body = json.dumps(body_dict, ensure_ascii=False)
    auth_header = _build_auth_header('POST', url_path, body)

    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': auth_header
    }

    resp = requests.post(url, data=body.encode('utf-8'), headers=headers, timeout=10)

    if resp.status_code == 200:
        return resp.json()
    else:
        error_info = resp.json() if resp.headers.get('Content-Type', '').startswith('application/json') else resp.text
        raise Exception(f"微信退款失败: {resp.status_code} - {error_info}")
