from text_normalization import (
    _CONFUSABLE_LETTERS,
    _NON_CONFUSABLE_LETTERS,
    _PRE_NORMALISATION_CONFUSABLES,
    normalise_text,
)

import unicodedata

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
            "l": "\u04cf\u03bb",
            "m": "\u043c\u03bc\u03fb",
            "r": "\u0433",
            "o": "\u043e\u03bf",
            "p": "\u0440\u03c1",
            "q": "\u051b\u03d9",
            "s": "\u0455",
            "t": "\u0442\u03c4",
            "u": "\u0438\u03c5",
            "v": "\u0475\u03bd",
            "w": "\u051d",
            "x": "\u0445\u03c7",
            "y": "\u0443",
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
                    if letter not in ("\u03bd", "\u03c5"):
                        self.assertEqual(normalise_text(letter.upper()), latin)
        self.assertEqual(normalise_text("\u039d"), "n")
        self.assertEqual(normalise_text("\u03a5"), "y")
        self.assertEqual(normalise_text("\u00b5"), "m")
        self.assertEqual(normalise_text("\u0436"), "\u0436")
        self.assertEqual(normalise_text("\u03c9"), "\u03c9")

    def test_every_normalised_greek_and_cyrillic_letter_has_an_explicit_coverage(self) -> None:
        covered_letters = set(_CONFUSABLE_LETTERS) | _NON_CONFUSABLE_LETTERS
        self.assertFalse(set(_CONFUSABLE_LETTERS) & _NON_CONFUSABLE_LETTERS)
        reachable = {
            letter
            for start, end in ((0x0370, 0x0400), (0x0400, 0x0500), (0x0500, 0x0530))
            for codepoint in range(start, end)
            if unicodedata.category(chr(codepoint)).startswith("L")
            for letter in unicodedata.normalize("NFKC", chr(codepoint)).casefold()
            if unicodedata.category(letter).startswith("L")
        }
        self.assertEqual(covered_letters, reachable)
        for letter in _NON_CONFUSABLE_LETTERS:
            with self.subTest(letter=letter):
                self.assertEqual(normalise_text(letter), letter)

    def test_pre_normalisation_lunate_sigma_keeps_its_latin_shape(self) -> None:
        self.assertEqual(_PRE_NORMALISATION_CONFUSABLES["\u03f2"], "c")
        self.assertEqual(_PRE_NORMALISATION_CONFUSABLES["\u03f9"], "c")
        self.assertEqual(normalise_text("\u03f2\u03f9"), "cc")

    def test_non_ascii_texts_survive_and_letterless_texts_stay_empty(self) -> None:
        self.assertTrue(normalise_text(_CJK_TEXT))
        self.assertEqual(normalise_text(_CJK_TEXT), _CJK_TEXT)
        self.assertEqual(normalise_text("!!!"), "")
