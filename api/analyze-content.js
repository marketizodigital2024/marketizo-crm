export const config = { maxDuration: 300 };

const MAX_POSTS = 12;
const MAX_VIDEOS = 3;
const MAX_MEDIA_BYTES = 24 * 1024 * 1024;

function clean(value, max = 1200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function contentTitle(post, index) {
  const source = clean(post.caption, 500).replace(/https?:\/\/\S+/g, "").replace(/[#@][\p{L}\p{N}_.]+/gu, "").replace(/\s+/g, " ").trim();
  const sentence = source.split(/[.!?\n]/).find(part => part.trim().length >= 12) || source;
  const words = sentence.trim().split(/\s+/).slice(0, 9).join(" ");
  return words || `${post.video ? "Reel" : "Objava"} sa profila ${post.username ? `@${post.username}` : index + 1}`;
}

function safeMediaUrl(raw) {
  const url = new URL(raw);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || host === "localhost" || host.endsWith(".local") || /^\d+\.\d+\.\d+\.\d+$/.test(host)) throw new Error("Nedozvoljen media URL.");
  return url.toString();
}

async function downloadMedia(rawUrl) {
  const url = safeMediaUrl(rawUrl);
  const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`Video nije dostupan (${response.status}).`);
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > MAX_MEDIA_BYTES) throw new Error("Video je prevelik za ovu analizu.");
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_MEDIA_BYTES) throw new Error("Video je prevelik za ovu analizu.");
  return { bytes, type: response.headers.get("content-type") || "video/mp4" };
}

async function transcribe(post, apiKey) {
  if (!post.videoUrl) return { status: "unavailable", transcript: "" };
  try {
    const media = await downloadMedia(post.videoUrl);
    const form = new FormData();
    form.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe");
    form.append("language", "sr");
    form.append("prompt", "Marketing sadržaj na srpskom, bosanskom, hrvatskom ili nemačkom jeziku. Sačuvaj nazive brendova, proizvoda i cene tačno.");
    form.append("file", new Blob([media.bytes], { type: media.type }), "reel.mp4");
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form, signal: AbortSignal.timeout(60000) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error?.message || "Transkripcija nije uspela.");
    return { status: "transcribed", transcript: clean(payload.text, 6000) };
  } catch (error) {
    return { status: "unavailable", transcript: "", error: clean(error.message, 240) };
  }
}

function schema() {
  const string = { type: "string" };
  const idea = { type: "object", additionalProperties: false, required: ["title", "execution", "reason"], properties: { title: string, execution: string, reason: string } };
  return {
    type: "object", additionalProperties: false,
    required: ["overallScore", "mainConclusion", "mainReason", "coverage", "scores", "priorities", "examples", "contentIdeas"],
    properties: {
      overallScore: { type: "integer", minimum: 30, maximum: 95 }, mainConclusion: string, mainReason: string,
      coverage: { type: "object", additionalProperties: false, required: ["postsReviewed", "videosFound", "videosTranscribed", "limitations"], properties: { postsReviewed: { type: "integer" }, videosFound: { type: "integer" }, videosTranscribed: { type: "integer" }, limitations: { type: "array", items: string } } },
      scores: { type: "array", minItems: 5, maxItems: 5, items: { type: "object", additionalProperties: false, required: ["name", "value", "reason"], properties: { name: string, value: { type: "integer", minimum: 30, maximum: 95 }, reason: string } } },
      priorities: { type: "array", minItems: 5, maxItems: 5, items: { type: "object", additionalProperties: false, required: ["title", "why", "evidence"], properties: { title: string, why: string, evidence: string } } },
      examples: { type: "array", minItems: 5, maxItems: 5, items: { type: "object", additionalProperties: false, required: ["postIndex", "format", "observed", "works", "improve", "rewrite"], properties: { postIndex: { type: "integer" }, format: string, observed: string, works: string, improve: string, rewrite: string } } },
      contentIdeas: { type: "object", additionalProperties: false, required: ["reels", "stories", "carousels", "posts"], properties: { reels: { type: "array", minItems: 12, maxItems: 12, items: idea }, stories: { type: "array", minItems: 12, maxItems: 12, items: idea }, carousels: { type: "array", minItems: 1, maxItems: 1, items: idea }, posts: { type: "array", minItems: 1, maxItems: 1, items: idea } } }
    }
  };
}

function outputText(payload) {
  if (payload.output_text) return payload.output_text;
  return (payload.output || []).flatMap(item => item.content || []).find(item => item.type === "output_text")?.text || "";
}

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return response.status(503).json({ error: "Dubinska analiza još nije povezana. Potreban je OPENAI_API_KEY." });
  const form = request.body?.form || {};
  const profiles = Array.isArray(request.body?.profiles) ? request.body.profiles : [];
  const posts = profiles.flatMap(profile => (profile.posts || []).map(post => ({ ...post, platform: profile.platform, username: profile.username }))).slice(0, MAX_POSTS);
  if (!posts.length) return response.status(400).json({ error: "Nema sadržaja za dubinsku analizu." });

  const videoPosts = posts.filter(post => post.video && post.videoUrl).slice(0, MAX_VIDEOS);
  const transcripts = await Promise.all(videoPosts.map(post => transcribe(post, apiKey)));
  let videoCursor = 0;
  const evidence = posts.map((post, index) => {
    const transcript = post.video && post.videoUrl && videoCursor < transcripts.length ? transcripts[videoCursor++] : { status: "not_requested", transcript: "" };
    return { index, title: contentTitle(post, index), platform: post.platform, username: post.username, format: post.video ? "reel_video" : "post", caption: clean(post.caption, 4000), image: clean(post.image, 1000), url: clean(post.url, 1000), metrics: { likes: post.likes ?? null, comments: post.comments ?? null, views: post.views ?? null }, transcript };
  });

  const input = [{ type: "input_text", text: `Ti si senior Marketizo strateg. Piši prirodnim, gramatički tačnim srpskim jezikom (ekavica), kao iskusan čovek, bez AI fraza. Analiziraš samo dokaze koje dobiješ. Ne pretpostavljaj da nešto nedostaje ako to nisi proverio. Ne menjaj korisnikove reči prostim ubacivanjem u šablon. Ne izmišljaj grad, trajanje, cenu, format, rezultat ili CTA. Razlikuj podatak iz upitnika od onoga što je javno pronađeno. Ako se prodaja završava pozivom, cena i svi detalji ne moraju biti javni. Svaki prioritet i svaka ocena moraju navesti konkretan dokaz. Primer prepravke mora biti smislen za konkretnu objavu, bez neprirodnih padeža. Kada se pozivaš na sadržaj, UVEK koristi njegovo polje title u navodnicima. Nikada u tekstu za klijenta nemoj koristiti interne oznake poput #0, #1 ili izraze transkript, transkripcija i video transkript. Umesto toga reci da je govor u videu analiziran ili da je Reel detaljno pregledan. Ograničenja objasni kratko, mirno i klijentskim jezikom, bez tehničkih detalja.\n\nPODACI O BIZNISU:\n${JSON.stringify(form)}\n\nPREGLEDANI SADRŽAJ:\n${JSON.stringify(evidence.map(({ image, ...item }) => item))}` }];
  evidence.filter(item => item.image).slice(0, 10).forEach(item => {
    try {
      input.push({ type: "input_text", text: `Vizuelni dokaz za sadržaj „${item.title}“:` });
      input.push({ type: "input_image", image_url: safeMediaUrl(item.image), detail: "high" });
    } catch {}
  });
  const aiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(90000),
    body: JSON.stringify({ model: process.env.OPENAI_AUDIT_MODEL || "gpt-5.6-luna", reasoning: { effort: "medium" }, input: [{ role: "user", content: input }], text: { format: { type: "json_schema", name: "marketizo_brand_audit", strict: true, schema: schema() } } })
  });
  const payload = await aiResponse.json().catch(() => ({}));
  if (!aiResponse.ok) return response.status(aiResponse.status).json({ error: payload.error?.message || "Dubinska analiza nije uspela." });
  const raw = outputText(payload);
  let audit;
  try { audit = JSON.parse(raw); }
  catch { return response.status(502).json({ error: "Analiza je završena, ali rezultat nije mogao pouzdano da se prikaže. Pokušaj ponovo." }); }
  return response.status(200).json({ audit, evidence, model: process.env.OPENAI_AUDIT_MODEL || "gpt-5.6-luna" });
}
