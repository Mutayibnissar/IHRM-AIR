# Versioned course and assessment data

This folder is the start of separating assessment content from the interface. The current live quiz content remains in the existing course pages until each item can be migrated and checked without changing scoring behaviour.

## Question record contract

Use `question.schema.json` as the record contract for new or migrated single-answer MCQs. A question record includes:

- A stable, unique `id` and `unitId` (1–4).
- A question `prompt`, 2–6 options with stable option IDs, and one `correctOptionId`.
- An explanatory answer, difficulty, and topic tags.
- A source record so editors can distinguish course material, academic research, official guidance, and original practice items.
- Optional review status to make editorial verification visible.

Example shape (illustrative only; not a factual IHRM question):

```json
{
  "id": "example-item-001",
  "unitId": 1,
  "type": "single-choice",
  "prompt": "Replace this placeholder with a reviewed question prompt.",
  "options": [
    {"id": "a", "text": "Option A"},
    {"id": "b", "text": "Option B"}
  ],
  "correctOptionId": "a",
  "explanation": "Replace this placeholder with a verified explanation.",
  "difficulty": "foundation",
  "tags": ["example-topic"],
  "source": {
    "kind": "original",
    "title": "Original practice item",
    "author": null,
    "year": null,
    "url": null,
    "page": null
  },
  "review": {
    "status": "draft",
    "reviewedAt": null,
    "reviewerNote": "Illustrative structure only; do not publish as a real question."
  }
}
```

## Migration and quality rules

1. Do not replace the live quiz bank wholesale until migrated questions have parity checks against the current item, answer, explanation, and unit.
2. Do not invent academic citations. If an item relies on a source, record the real source details and verify it before marking the item reviewed.
3. A structurally valid record is not automatically accurate. Subject-matter review remains necessary.
4. Keep question IDs stable so attempt history and mistake review can refer to the same item.
5. Add a schema validation step to CI before the first JSON question-bank file is introduced.

The app currently remains a static, browser-local study tool. This schema does not introduce an account, remote sync, or AI dependency.
