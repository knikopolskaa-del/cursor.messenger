from __future__ import annotations

import logging
import os
import secrets
from dataclasses import dataclass

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

log = logging.getLogger(__name__)


class StorageUnavailable(RuntimeError):
    pass


@dataclass(frozen=True)
class YosConfig:
    endpoint: str
    bucket: str
    access_key_id: str
    secret_access_key: str
    region: str
    presign_ttl_seconds: int
    prefix: str


def get_yos_config() -> YosConfig:
    endpoint = os.environ.get("YOS_ENDPOINT", "").strip()
    bucket = os.environ.get("YOS_BUCKET", "").strip()
    access_key_id = os.environ.get("YOS_ACCESS_KEY_ID", "").strip()
    secret_access_key = os.environ.get("YOS_SECRET_ACCESS_KEY", "").strip()
    region = os.environ.get("YOS_REGION", "ru-central1").strip()
    presign_ttl_seconds = int(os.environ.get("YOS_PRESIGN_TTL_SECONDS", "900"))
    prefix = os.environ.get("YOS_PREFIX", "messenger/").lstrip("/")
    if prefix and not prefix.endswith("/"):
        prefix += "/"
    if not endpoint or not bucket or not access_key_id or not secret_access_key:
        raise StorageUnavailable("Object Storage is not configured")
    return YosConfig(
        endpoint=endpoint,
        bucket=bucket,
        access_key_id=access_key_id,
        secret_access_key=secret_access_key,
        region=region,
        presign_ttl_seconds=presign_ttl_seconds,
        prefix=prefix,
    )


def _client(cfg: YosConfig):
    # Conservative timeouts; keep UI responsive.
    c = Config(
        region_name=cfg.region,
        connect_timeout=3,
        read_timeout=15,
        retries={"max_attempts": 2, "mode": "standard"},
    )
    return boto3.client(
        "s3",
        endpoint_url=cfg.endpoint,
        aws_access_key_id=cfg.access_key_id,
        aws_secret_access_key=cfg.secret_access_key,
        config=c,
    )


def make_object_key(kind: str, filename_hint: str | None = None) -> str:
    # Keep keys opaque and short; filename is stored in DB separately.
    token = secrets.token_hex(16)
    suffix = ""
    if filename_hint and "." in filename_hint:
        ext = filename_hint.rsplit(".", 1)[-1].strip().lower()
        if 1 <= len(ext) <= 10 and ext.replace("-", "").replace("_", "").isalnum():
            suffix = f".{ext}"
    return f"{kind}/{token}{suffix}"


def upload_bytes(
    *,
    object_key: str,
    data: bytes,
    content_type: str,
    filename: str | None = None,
) -> None:
    cfg = get_yos_config()
    s3 = _client(cfg)
    key = f"{cfg.prefix}{object_key}".lstrip("/")
    try:
        extra = {"ContentType": content_type}
        if filename:
            extra["ContentDisposition"] = f'attachment; filename="{filename}"'
        s3.put_object(Bucket=cfg.bucket, Key=key, Body=data, **extra)
    except (BotoCoreError, ClientError) as exc:
        log.exception("YOS upload failed: bucket=%s key=%s", cfg.bucket, key)
        raise StorageUnavailable("Object Storage upload failed") from exc


def presign_get_url(*, object_key: str, inline: bool, filename: str) -> str:
    cfg = get_yos_config()
    s3 = _client(cfg)
    key = f"{cfg.prefix}{object_key}".lstrip("/")
    dispo = "inline" if inline else "attachment"
    params = {
        "Bucket": cfg.bucket,
        "Key": key,
        "ResponseContentDisposition": f'{dispo}; filename="{filename}"',
    }
    try:
        return s3.generate_presigned_url(
            "get_object",
            Params=params,
            ExpiresIn=cfg.presign_ttl_seconds,
        )
    except (BotoCoreError, ClientError) as exc:
        log.exception("YOS presign failed: bucket=%s key=%s", cfg.bucket, key)
        raise StorageUnavailable("Object Storage presign failed") from exc

