from __future__ import annotations

import re

import unicodedata

_CONFUSABLE_LETTERS: dict[str, str] = {
    "\u0430": "a",
    "\u0432": "b",
    "\u0441": "c",
    "\u0501": "d",
    "\u0435": "e",
    "\u050d": "g",
    "\u043d": "h",
    "\u04bb": "h",
    "\u0456": "i",
    "\u0458": "j",
    "\u043a": "k",
    "\u04cf": "l",
    "\u043c": "m",
    "\u043e": "o",
    "\u0440": "p",
    "\u051b": "q",
    "\u0455": "s",
    "\u0442": "t",
    "\u0475": "v",
    "\u051d": "w",
    "\u0445": "x",
    "\u0443": "y",
    "\u03b1": "a",
    "\u03b2": "b",
    "\u03b5": "e",
    "\u03dd": "f",
    "\u03b7": "h",
    "\u03b9": "i",
    "\u03f3": "j",
    "\u03ba": "k",
    "\u03bc": "m",
    "\u03fb": "m",
    "\u03bd": "n",
    "\u03bf": "o",
    "\u03c1": "p",
    "\u03d9": "q",
    "\u03c4": "t",
    "\u03c5": "y",
    "\u03c7": "x",
    "\u03b6": "z",
}

def normalise_text(text: str) -> str:

    normalised = unicodedata.normalize("NFKC", text)
    folded = "".join(_CONFUSABLE_LETTERS.get(character, character) for character in normalised.casefold())
    separated = "".join(
        character if unicodedata.category(character)[:1] in ("L", "N") else " " for character in folded
    )
    return " ".join(separated.split())
