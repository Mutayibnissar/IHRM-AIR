// Supabase Edge Function: authenticated Gemini proxy for IHRM AIR.
// Configure GEMINI_API_KEY with: supabase secrets set GEMINI_API_KEY=...
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const allowedOrigin = "https://mutayibnissar.github.io";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const allowedAgents = new Set(["coach", "explainer", "exam", "flashcards", "planner", "navigator", "orchestrator"]);

serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  if (origin !== allowedOrigin) return new Response("Origin not allowed", { status: 403 });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Supabase's built-in JWT verification must remain enabled for this function.
  if (!req.headers.get("authorization")?.startsWith("Bearer ")) {
    return json({ error: "Sign in to IHRM AIR before using live AI agents." }, 401);
  }

  let body: { agentId?: string; q?: string; context?: string };
  try {
    const raw = await req.text();
    if (raw.length > 24_000) return json({ error: "Request too large" }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!body.q?.trim() || !body.agentId || !allowedAgents.has(body.agentId)) {
    return json({ error: "Missing task or unsupported agent" }, 400);
  }

  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return json({ error: "GEMINI_API_KEY is not configured in Supabase secrets" }, 500);

  const systemPrompts: Record<string, string> = {
    coach: "You are a supportive MBA study coach. Give a practical prioritized study plan.",
    explainer: "You are a patient IHRM professor. Explain plainly, define terms, give examples, comparisons and limitations.",
    exam: "You are a rigorous MBA examiner. Create exam-style MCQs with answer keys and explanations, short answers and essay prompts as appropriate.",
    flashcards: "You are a spaced-repetition specialist. Create concise question/answer flashcards, one concept per card.",
    planner: "You are a revision-planning specialist. Build a realistic schedule using deadline and available time.",
    navigator: "You are a course-material librarian. Identify relevant supplied passages and clearly flag unsupported gaps.",
    orchestrator: "You coordinate a notes navigator, concept explainer, exam setter and revision coach. Produce a unified, source-grounded result."
  };

  const prompt = [
    systemPrompts[body.agentId],
    "Answer in clear, exam-useful English. Treat supplied course context as the source; do not invent textbook claims.",
    "USER TASK:\n" + body.q.trim(),
    "COURSE NOTES CONTEXT:\n" + (body.context ?? "").slice(0, 12_000)
  ].join("\n\n");

  try {
    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.35, maxOutputTokens: 4096 } })
    });
    const result = await upstream.json();
    if (!upstream.ok) return json({ error: result?.error?.message ?? "Gemini request failed" }, upstream.status);
    const answer = result?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("").trim();
    if (!answer) return json({ error: "Gemini returned an empty answer" }, 502);
    return json({ answer, model: "gemini-2.5-flash" });
  } catch {
    return json({ error: "Could not reach Gemini" }, 502);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
