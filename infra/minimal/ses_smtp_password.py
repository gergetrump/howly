#!/usr/bin/env python3
"""Derive an SES SMTP password from an IAM secret access key.

Amazon SES SMTP authentication does not accept the IAM secret itself.
The algorithm is the one documented by AWS for SMTP credentials.
"""

import base64
import hashlib
import hmac
import json
import sys

DATE = "11111111"
SERVICE = "ses"
MESSAGE = "SendRawEmail"
TERMINAL = "aws4_request"
VERSION = 0x04


def sign(key, msg):
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()


def smtp_password(secret_access_key, region):
    signature = sign(("AWS4" + secret_access_key).encode("utf-8"), DATE)
    signature = sign(signature, region)
    signature = sign(signature, SERVICE)
    signature = sign(signature, TERMINAL)
    signature = sign(signature, MESSAGE)
    return base64.b64encode(bytes([VERSION]) + signature).decode("utf-8")


def main():
    query = json.load(sys.stdin)
    password = smtp_password(query["secret"], query["region"])
    json.dump({"password": password}, sys.stdout)


if __name__ == "__main__":
    main()
