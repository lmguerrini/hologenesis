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
    "\u03bd": "v",
    "\u03bf": "o",
    "\u03c1": "p",
    "\u03d9": "q",
    "\u03c4": "t",
    "\u03c5": "u",
    "\u03c7": "x",
    "\u03b6": "z",
    "\u03bb": "l",
    "\u0433": "r",
    "\u0438": "u",
}

_NON_CONFUSABLE_LETTERS = frozenset(
    "\u02b9\u0371\u0373\u0377\u037b\u037c\u037d\u03ac\u03ad\u03ae\u03af\u03b3\u03b4\u03b8\u03be\u03c0"
    "\u03c3\u03c6\u03c8\u03c9\u03ca\u03cb\u03cc\u03cd\u03ce\u03d7\u03db\u03df\u03e1\u03e3\u03e5\u03e7"
    "\u03e9\u03eb\u03ed\u03ef\u03f8\u03fc\u0431\u0434\u0436\u0437\u0439\u043b\u043f\u0444\u0446\u0447"
    "\u0448\u0449\u044a\u044b\u044c\u044d\u044e\u044f\u0450\u0451\u0452\u0453\u0454\u0457\u0459\u045a"
    "\u045b\u045c\u045d\u045e\u045f\u0461\u0463\u0465\u0467\u0469\u046b\u046d\u046f\u0471\u0473\u0477"
    "\u0479\u047b\u047d\u047f\u0481\u048b\u048d\u048f\u0491\u0493\u0495\u0497\u0499\u049b\u049d\u049f"
    "\u04a1\u04a3\u04a5\u04a7\u04a9\u04ab\u04ad\u04af\u04b1\u04b3\u04b5\u04b7\u04b9\u04bd\u04bf\u04c2"
    "\u04c4\u04c6\u04c8\u04ca\u04cc\u04ce\u04d1\u04d3\u04d5\u04d7\u04d9\u04db\u04dd\u04df\u04e1\u04e3"
    "\u04e5\u04e7\u04e9\u04eb\u04ed\u04ef\u04f1\u04f3\u04f5\u04f7\u04f9\u04fb\u04fd\u04ff\u0503\u0505"
    "\u0507\u0509\u050b\u050f\u0511\u0513\u0515\u0517\u0519\u051f\u0521\u0523\u0525\u0527\u0529\u052b"
    "\u052d\u052f"
)

_PRE_NORMALISATION_CONFUSABLES = {
    "\u03f2": "c",
    "\u03f9": "c",
    "\u039d": "n",
    "\u03a5": "y",
}

def normalise_text(text: str) -> str:

    raw_folded = "".join(_PRE_NORMALISATION_CONFUSABLES.get(character, character) for character in text)
    normalised = unicodedata.normalize("NFKC", raw_folded)
    folded = "".join(_CONFUSABLE_LETTERS.get(character, character) for character in normalised.casefold())
    separated = "".join(
        character if unicodedata.category(character)[:1] in ("L", "N") else " " for character in folded
    )
    return " ".join(separated.split())
