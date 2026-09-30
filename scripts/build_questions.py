#!/usr/bin/env python3
"""Validate the hand-authored question bank and make an offline browser copy."""

import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
questions = json.loads((ROOT / "calibration/questions.json").read_text(encoding="utf-8"))
questions += json.loads((ROOT / "calibration/additional_questions.json").read_text(encoding="utf-8"))
assert len(questions) == 80
assert len({q["id"] for q in questions}) == len(questions)
for pack in "ABCDE":
    pack_questions = [q for q in questions if q["pack"] == pack]
    assert len(pack_questions) == 16
    assert Counter(q["category"] for q in pack_questions) == {
        "logic": 4, "numeric": 4, "reading": 4, "rules": 4
    }
    assert Counter(q["answer"] for q in pack_questions) == {0: 4, 1: 4, 2: 4, 3: 4}
for q in questions:
    assert len(q["options"]) == 4 and len(set(q["options"])) == 4, q["id"]
    assert q["answer"] in range(4) and q["explanation"], q["id"]

payload = json.dumps(questions, ensure_ascii=False, separators=(",", ":"))
(ROOT / "questions-data.js").write_text(
    "/* Generated from calibration/questions.json. Do not edit directly. */\n"
    f"window.BRAIN_QUESTIONS={payload};\n",
    encoding="utf-8",
)
print("Validated 80 questions and generated questions-data.js")
