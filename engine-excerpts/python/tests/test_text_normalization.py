from text_normalization import (
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

    def test_non_ascii_texts_survive_and_letterless_texts_stay_empty(self) -> None:
        self.assertTrue(normalise_text(_CJK_TEXT))
        self.assertEqual(normalise_text(_CJK_TEXT), _CJK_TEXT)
        self.assertEqual(normalise_text("!!!"), "")
