// Vercel serverless function: estimate a meal's calories/macros from a photo.
// The image is sent to an AI provider and immediately discarded — never stored.
//
// Set ONE of these env vars in your Vercel project (NOT prefixed with VITE_):
//   GEMINI_API_KEY     -> free tier, no credit card (aistudio.google.com)  [preferred]
//   ANTHROPIC_API_KEY  -> paid (console.anthropic.com)
const GEMINI_MODEL = "gemini-2.5-flash";       // free-tier eligible, supports images
const ANTHROPIC_MODEL = "claude-sonnet-4-6";   // or "claude-haiku-4-5-20251001"

const PROMPT =
  "Estimate the food in this photo for a calorie tracker. Give the total for everything visible on the plate. " +
  "Respond with ONLY minified JSON, no markdown, in this exact shape: " +
  '{"name":string,"kcal":number,"protein":number,"carbs":number,"fat":number,"fiber":number,"note":string}. ' +
  "name = short description; numbers are grams except kcal; note = one short caveat. Best guess if unsure.";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  const { image, media_type } = req.body || {};
  if (!image) return res.status(400).json({ error: "no_image" });
  const mt = media_type || "image/jpeg";
  try {
    if (process.env.GEMINI_API_KEY) return res.status(200).json(await viaGemini(image, mt));
    if (process.env.ANTHROPIC_API_KEY) return res.status(200).json(await viaAnthropic(image, mt));
    return res.status(503).json({ error: "not_configured" });
  } catch (e) {
    return res.status(500).json({ error: "estimate_failed", detail: String(e.message || e) });
  }
}

async function viaGemini(image, mt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const r = await fetch(url, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ inline_data: { mime_type: mt, data: image } }, { text: PROMPT }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    }),
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error.message || "gemini");
  const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text).filter(Boolean).join("");
  if (!text) throw new Error("empty response");
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

async function viaAnthropic(image, mt) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL, max_tokens: 400,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: mt, data: image } },
        { type: "text", text: PROMPT },
      ] }],
    }),
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error.message || "anthropic");
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}
