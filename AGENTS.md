# IHRM Air Agent Crew

This repository adapts the specialist-agent approach used by the owner's agency-agents repository into six education-focused roles:
- Study Coach
- Concept Explainer
- Exam Setter
- Flashcard Maker
- Revision Planner
- Notes Navigator

The website's current Agent Crew panel runs lightweight, browser-local study helpers and does not call a hosted LLM. The role specifications in `agents/` are the agent contracts for a future model-backed implementation.

## To enable true model-backed agents
Add a server-side API route or serverless function that authenticates requests, retrieves the relevant course-note passages, calls a chosen model provider using these agent instructions, and returns grounded answers. Store provider credentials only in server-side secrets; never put API keys in this static HTML repository. Add rate limits, request-size limits, error handling, and a clear disclosure when an answer uses AI.
