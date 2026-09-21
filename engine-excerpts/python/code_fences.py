from __future__ import annotations

import re

FENCE_PATTERN = re.compile(r"```([^\n`]*)\n([\s\S]*?)```")

UNCLOSED_FENCE_PATTERN = re.compile(r"```([^\n`]*)\n([\s\S]+)$")

def fence_tag(info: str) -> str:

    tokens = info.split()
    return tokens[0].strip().lower().replace("-", "_") if tokens else ""

def find_fences(answer: str) -> tuple[tuple[re.Match[str], ...], re.Match[str] | None]:

    closed = tuple(FENCE_PATTERN.finditer(answer))
    last_closed_end = closed[-1].end() if closed else 0
    return closed, UNCLOSED_FENCE_PATTERN.search(answer, last_closed_end)
