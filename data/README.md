# Versioned course and assessment data

The practice and mock-exam controller loads its live question records from `question-bank.json`; the embedded duplicate has been removed. A parity regression check and browser scoring tests protect the adapter between the structured records and the legacy exam controller.

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

1. Keep the structured bank as the single source of truth. When editing or adding questions, preserve stable IDs and run the bank validator, parity check, and browser scoring tests.
2. Do not invent academic citations. If an item relies on a source, record the real source details and verify it before marking the item reviewed.
3. A structurally valid record is not automatically accurate. Subject-matter review remains necessary.
4. Keep question IDs stable so attempt history and mistake review can refer to the same item.
5. CI validates the record structure, IDs, unit distribution, option/answer mapping, source metadata, review state, and live loader. The schema is documented in `question.schema.json`; the dependency-free validator covers the active constraints.

The app currently remains a static, browser-local study tool. This schema does not introduce an account, remote sync, or AI dependency.
