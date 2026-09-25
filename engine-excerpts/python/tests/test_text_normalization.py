from text_normalization import (
    _CONFUSABLE_LETTERS,
    normalise_text,
)

import unittest

_CYRILLIC_A = "\u0430"

_CJK_TEXT = "\u533b\u5b66"

_FULLWIDTH_VISUAL = "\uff56\uff49\uff53\uff55\uff41\uff4c"

_RIGHT_SINGLE_QUOTE = "\u2019"

_SHARP_S = "\u00df"

_GREEK_CAPITAL_RHO = "\u03a1"

_GREEK_SMALL_ALPHA = "\u03b1"

class NormaliseTextTests(unittest.TestCase):
    def test_width_case_and_punctuation_fold_to_one_spelling(self) -> None:
        self.assertEqual(normalise_text(_FULLWIDTH_VISUAL), "visual")
        self.assertEqual(
            normalise_text("Visual" + _RIGHT_SINGLE_QUOTE + "s"), normalise_text("visual's")
        )
        self.assertEqual(normalise_text(_SHARP_S), "ss")

    def test_confusable_scripts_fold_to_latin(self) -> None:
        self.assertEqual(normalise_text("p" + _CYRILLIC_A + "ttern"), "pattern")
        self.assertEqual(normalise_text(_GREEK_CAPITAL_RHO + _GREEK_SMALL_ALPHA + "in"), "pain")
        self.assertEqual(normalise_text("\u0392\u0395\u03a4\u0391"), "beta")
        self.assertEqual(normalise_text("\u0422est"), "test")

    def test_every_documented_cyrillic_and_greek_lookalike_folds(self) -> None:
        expected = {
            "a": "\u0430\u03b1",
            "b": "\u0432\u03b2",
            "c": "\u0441",
            "d": "\u0501",
            "e": "\u0435\u03b5",
            "f": "\u03dd",
            "g": "\u050d",
            "h": "\u043d\u04bb\u03b7",
            "i": "\u0456\u03b9",
            "j": "\u0458\u03f3",
            "k": "\u043a\u03ba",
            "l": "\u04cf",
            "m": "\u043c\u03bc\u03fb",
            "n": "\u03bd",
            "o": "\u043e\u03bf",
            "p": "\u0440\u03c1",
            "q": "\u051b\u03d9",
            "s": "\u0455",
            "t": "\u0442\u03c4",
            "v": "\u0475",
            "w": "\u051d",
            "x": "\u0445\u03c7",
            "y": "\u0443\u03c5",
            "z": "\u03b6",
        }
        self.assertEqual(
            _CONFUSABLE_LETTERS,
            {letter: latin for latin, letters in expected.items() for letter in letters},
        )
        for latin, letters in expected.items():
            for letter in letters:
                with self.subTest(letter=letter):
                    self.assertEqual(normalise_text(letter), latin)
                    self.assertEqual(normalise_text(letter.upper()), latin)
        self.assertEqual(normalise_text("\u00b5"), "m")
        self.assertEqual(normalise_text("\u0436"), "\u0436")
        self.assertEqual(normalise_text("\u03c9"), "\u03c9")

    def test_non_ascii_texts_survive_and_letterless_texts_stay_empty(self) -> None:
        self.assertTrue(normalise_text(_CJK_TEXT))
        self.assertEqual(normalise_text(_CJK_TEXT), _CJK_TEXT)
        self.assertEqual(normalise_text("!!!"), "")
