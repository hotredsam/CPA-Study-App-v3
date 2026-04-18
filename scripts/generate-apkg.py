#!/usr/bin/env python3
"""
Read JSON card data from stdin, write an Anki .apkg to stdout (binary).

Input schema:
[
  {
    "guid": "<stable-hash-of-questionId>",
    "front": "<html>",   -- question text + choices
    "back": "<html>"     -- correct answer + explanation + feedback items
  },
  ...
]
"""

import sys
import json
import random
import tempfile
import os
import genanki


def main():
    data = json.load(sys.stdin)

    # Stable deck ID derived from deck name hash
    deck_id = 1_736_248_012  # fixed, so re-exports stay the same deck
    model_id = 1_736_248_013

    model = genanki.Model(
        model_id,
        "CPA Study Card",
        fields=[
            {"name": "Front"},
            {"name": "Back"},
        ],
        templates=[
            {
                "name": "CPA Card",
                "qfmt": "{{Front}}",
                "afmt": '{{FrontSide}}<hr id="answer">{{Back}}',
            }
        ],
        css="""
.card { font-family: sans-serif; font-size: 15px; text-align: left; max-width: 700px; margin: 0 auto; }
.question { font-weight: bold; margin-bottom: 12px; }
.choice { padding: 4px 0; }
.correct { color: #22c55e; font-weight: bold; }
.feedback { margin-top: 12px; padding: 10px; background: #1e293b; border-radius: 6px; }
.feedback-item { font-size: 13px; color: #94a3b8; margin-top: 4px; }
.score { display: inline-block; width: 30px; text-align: right; font-weight: bold; color: #f59e0b; }
""",
    )

    deck = genanki.Deck(deck_id, "CPA Study::Graded Questions")

    for card in data:
        note = genanki.Note(
            model=model,
            fields=[card["front"], card["back"]],
            guid=card["guid"],
        )
        deck.add_note(note)

    with tempfile.NamedTemporaryFile(suffix=".apkg", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        genanki.Package(deck).write_to_file(tmp_path)
        with open(tmp_path, "rb") as f:
            sys.stdout.buffer.write(f.read())
    finally:
        os.unlink(tmp_path)


if __name__ == "__main__":
    main()
