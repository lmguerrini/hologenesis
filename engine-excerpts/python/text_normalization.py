from __future__ import annotations

import re

_NON_WORD = re.compile(r"[^0-9a-z]+")

def normalise_text(text: str) -> str:

    return _NON_WORD.sub(" ", text.lower()).strip()
