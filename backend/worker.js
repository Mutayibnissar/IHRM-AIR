/**
 * IHRM Air secure Gemini proxy for Cloudflare Workers.
 * Configure GEMINI_API_KEY as a Worker secret in Cloudflare.
 */
const ALLOWED_ORIGIN = "https://mutayibnissar.github.io";
const MODEL = "gemini-2.5-flash";
const MAX_BODY_BYTES = 30000;
const ALLOWED_AGENTS = new Set([
  "coach", "explainer", "exam", "flashcards", "planner", "navigator", "orchestrator"
]);

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      if (origin !== ALLOWED_ORIGIN) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (origin !== ALLOWED_ORIGIN) return json({ error: "Origin not allowed." }, 403, origin);
    if (request.method !== "POST" || url.pathname !== "/api/agent") {
      return json({ error: "Not found." }, 404, origin);
    }

    const declaredLength = Number(request.headers.get("Content-Length") || 0);
    if (declaredLength > MAX_BODY_BYTES) return json({ error: "Request is too large." }, 413, origin);
    if (!env.GEMINI_API_KEY) return json({ error: "Backend secret GEMINI_API_KEY is not configured." }, 503, origin);

    let input;
    try {
      const raw = await request.text();
      if (raw.length > MAX_BODY_BYTES) return json({ error: "Request is too large." }, 413, origin);
      input = JSON.parse(raw);
    } catch {
      return json({ error: "Request body must be valid JSON." }, 400, origin);
    }

    const agentId = String(input.agentId || "");
    const q = String(input.q || "").trim();
    const context = String(input.context || "").slice(0, 12000);
    if (!ALLOWED_AGENTS.has(agentId)) return json({ error: "Unknown specialist agent." }, 400, origin);
    if (!q) return json({ error: "Enter a study task first." }, 400, origin);
    if (q.length > 6000) return json({ error: "Study task is too long (maximum 6,000 characters)." }, 413, origin);

    const roles = {
      coach: "Act as a supportive MBA study coach. Make a practical, prioritised study plan for the exact task.",
      explainer: "Act as a patient IHRM professor. Explain concepts in plain English, define terms, give examples, compare similar ideas, and flag limitations.",
      exam: "Act as a rigorous MBA examiner. Create exam-style MCQs with answer key and explanations, short-answer questions, and long-answer prompts as appropriate to the request.",
      flashcards: "Act as a spaced-repetition specialist. Produce concise question/answer flashcards, one concept per card, based on the provided notes.",
      planner: "Act as a revision-planning specialist. Turn the user's deadline and available time into a realistic schedule with active recall and practice.",
      navigator: "Act as a course-material research librarian. Identify the most relevant note passages, organise them by heading, and distinguish missing information from supported facts.",
      orchestrator: "Act as the lead study-agent orchestrator. Coordinate a notes navigator, concept explainer, exam setter, and revision coach. Provide a concise unified result with sources from the provided course notes."
    };

    const prompt = [
      "You are a specialist inside IHRM Air, an MBA International Human Resource Management study platform.",
      "ROLE: " + roles[agentId],
      "",
      "GROUNDING RULES: Prioritise supplied course notes. Do not invent course facts or pretend missing information is in the notes. If adding general knowledge, label it clearly. Use accurate academic terminology, examples, clear headings, and exam-ready structure. Answer the user directly.",
      "",
      "USER TASK:",
      q,
      "",
      "RELEVANT COURSE NOTES (may be incomplete):",
      context || "No matching note passages were found in the local page. State this limitation and answer carefully.",
      "",
      "Return readable plain text with headings and numbered lists where useful."
    ].join("\n");

    let upstream;
    try {
      upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.35, maxOutputTokens: 4096 }
        })
      });
    } catch {
      return json({ error: "Could not reach the Gemini service. Try again shortly." }, 502, origin);
    }

    let data;
    try { data = await upstream.json(); } catch {
      return json({ error: "Gemini returned an invalid response." }, 502, origin);
    }
    if (!upstream.ok) {
      const message = data && data.error && data.error.message ? data.error.message : "Gemini request failed (" + upstream.status + ").";
      return json({ error: message.slice(0, 500) }, upstream.status === 429 ? 429 : 502, origin);
    }

    const answer = (data.candidates || [])
      .map(candidate => (candidate.content && candidate.content.parts || []).map(part => part.text || "").join(""))
      .join("\n\n")
      .trim();

    if (!answer) return json({ error: "Gemini returned no text. Check API access and quota." }, 502, origin);
    return json({ answer }, 200, origin);
  }
};
