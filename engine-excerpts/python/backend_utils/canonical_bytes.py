from __future__ import annotations

import hashlib

import json

from typing import TYPE_CHECKING, Any

def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def canonical_json_bytes(document: Any) -> bytes:

    return (
        json.dumps(document, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False) + "\n"
    ).encode("utf-8")
