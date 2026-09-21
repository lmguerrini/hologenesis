from __future__ import annotations

import re

import unicodedata

_CONFUSABLE_LETTERS: dict[str, str] = {
    "\u0430": "a",
    "\u0435": "e",
    "\u043e": "o",
    "\u0440": "p",
    "\u0441": "c",
    "\u0443": "y",
    "\u0445": "x",
    "\u0456": "i",
    "\u0458": "j",
    "\u0455": "s",
    "\u0501": "d",
    "\u04bb": "h",
    "\u051b": "q",
    "\u051d": "w",
    "\u0410": "a",
    "\u0412": "b",
    "\u041d": "h",
    "\u041a": "k",
    "\u041c": "m",
    "\u0422": "t",
    "\u0415": "e",
    "\u041e": "o",
    "\u0420": "p",
    "\u0421": "c",
    "\u0423": "y",
    "\u0425": "x",
    "\u0406": "i",
    "\u0408": "j",
    "\u0405": "s",
    "\u0500": "d",
    "\u04ba": "h",
    "\u051a": "q",
    "\u051c": "w",
    "\u03b1": "a",
    "\u03bf": "o",
    "\u03bd": "n",
    "\u03b9": "i",
    "\u03ba": "k",
    "\u03c1": "p",
    "\u03c4": "t",
    "\u03c5": "y",
    "\u03c7": "x",
    "\u03b5": "e",
    "\u03b7": "h",
    "\u0391": "a",
    "\u0392": "b",
    "\u0395": "e",
    "\u0396": "z",
    "\u0397": "h",
    "\u0399": "i",
    "\u039a": "k",
    "\u039c": "m",
    "\u039d": "n",
    "\u039f": "o",
    "\u03a1": "p",
    "\u03a4": "t",
    "\u03a5": "y",
    "\u03a7": "x",
}

def normalise_text(text: str) -> str:

    normalised = unicodedata.normalize("NFKC", text)
    folded = "".join(_CONFUSABLE_LETTERS.get(character, character) for character in normalised).casefold()
    separated = "".join(
        character if unicodedata.category(character)[:1] in ("L", "N") else " " for character in folded
    )
    return " ".join(separated.split())
