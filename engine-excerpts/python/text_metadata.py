from __future__ import annotations

import re

from collections.abc import Iterable, Sequence

_TOKEN_PATTERN = re.compile(r"[a-z0-9_.+#-]+")

def _clip(value: str, limit: int = 360) -> str:
    normalized = " ".join(value.strip().split())
    if len(normalized) <= limit:
        return normalized
    return normalized[: limit - 1].rstrip() + "."

def _dedupe(
    values: Iterable[str],
    *,
    clip_limit: int | None = 360,
) -> tuple[str, ...]:
    deduped: list[str] = []
    for value in values:
        if clip_limit is None:
            cleaned = " ".join(value.split())
        else:
            cleaned = _clip(value, clip_limit)
        if cleaned and cleaned not in deduped:
            deduped.append(cleaned)
    return tuple(deduped)

def _contains_any(value: str, needles: Iterable[str]) -> bool:
    lowered = value.lower()
    return any(needle in lowered for needle in needles)

def _token_set(value: str) -> set[str]:
    return set(_TOKEN_PATTERN.findall(value.lower()))

def _metadata_values(
    item: object,
    attribute: str,
    *,
    stringify_before_filter: bool = False,
) -> tuple[str, ...]:
    value = getattr(item, attribute, ())
    if value is None:
        return ()
    if isinstance(value, str):
        return (value,)
    if isinstance(value, Sequence):
        if stringify_before_filter:
            return tuple(str(entry) for entry in value if str(entry))
        return tuple(str(entry) for entry in value if entry)
    return ()

def _metadata_label(item: object) -> str:
    role = getattr(item, "role", None)
    if isinstance(role, str) and role:
        return role
    return item.__class__.__name__
