export const config = { maxDuration: 300 };

const MAX_POSTS = 12;
const MAX_VIDEOS = 12;
const MAX_MEDIA_BYTES = 16 * 1024 * 1024;

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
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form, signal: AbortSignal.timeout(35000) });
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
    required: ["overallScore", "offerRead", "headline", "mainConclusion", "mainReason", "urgency", "consequence", "previewCards", "coverage", "scores", "priorities", "examples", "contentIdeas"],
    properties: {
      overallScore: { type: "integer", minimum: 30, maximum: 95 }, offerRead: string, headline: string, mainConclusion: string, mainReason: string, urgency: string, consequence: string, previewCards: { type: "array", minItems: 6, maxItems: 6, items: { type: "object", additionalProperties: false, required: ["label", "title", "body"], properties: { label: string, title: string, body: string } } },
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
  // Vremenski budzet: uzimamo sve Reelove koje stignemo da preslusamo, ostali se citaju iz opisa i slika.
  const budget = Number(process.env.MARKETIZO_TRANSCRIBE_BUDGET_MS || 45000);
  const deadline = Date.now() + budget;
  const transcripts = await Promise.all(videoPosts.map(post => Promise.race([
    transcribe(post, apiKey),
    new Promise(resolve => setTimeout(() => resolve({ status: "unavailable", transcript: "" }), Math.max(0, deadline - Date.now()))),
  ])));
let videoCursor = 0;
  const evidence = posts.map((post, index) => {
    const transcript = post.video && post.videoUrl && videoCursor < transcripts.length ? transcripts[videoCursor++] : { status: "not_requested", transcript: "" };
    return { index, title: contentTitle(post, index), platform: post.platform, username: post.username, format: post.video ? "reel_video" : "post", caption: clean(post.caption, 4000), image: clean(post.image, 1000), url: clean(post.url, 1000), metrics: { likes: post.likes ?? null, comments: post.comments ?? null, views: post.views ?? null }, transcript };
  });

  const input = [{ type: "input_text", text: `Ti si Marketizo strateg sa dugogodišnjim iskustvom u sadržaju za uslužne biznise. Ovo nije automatski izveštaj, nego tvoje lično mišljenje posle pažljivog pregleda profila. Piši prirodnim srpskim jezikom (ekavica, sa svim našim slovima), kratkim rečenicama, direktno klijentu na ti, kao da sediš preko puta njega i objašnjavaš mu šta si video. GLAS: bez marketinških fraza tipa u današnje vreme, digitalni svet, ključno je, potencijal, optimizovati, unaprediti; bez gomilanja prideva; bez uvodnih rečenica koje ne nose informaciju. Nijedna rečenica ne sme da bude takva da bi jednako važila za bilo koji drugi biznis. Ako rečenica važi za svakoga, obriši je i napiši konkretnu. Svaka tvrdnja mora da se oslanja na nešto što si stvarno video: naziv pregledanog sadržaja, broj, rečenicu iz opisa ili ono što se vidi na slici. DIJAGNOZA: najvažnije je da pogodiš pravi problem. Pre pisanja odredi tri stvari: šta ovaj biznis zapravo prodaje, zašto konkretno čovek koji naiđe na profil ne ostavi upit, i šta ga to košta. Glavni zaključak mora da imenuje baš taj problem, a ne opšte stanje profila. Klijent koji ga pročita treba da pomisli da je to tačno njegov slučaj. TAČNOST: analiziraj samo dokaze koje si dobio. Ne pretpostavljaj da nešto nedostaje ako to nisi proverio. Ne izmišljaj grad, trajanje, cenu, format, rezultat ni poziv na akciju. Razlikuj podatak iz upitnika od onoga što je javno pronađeno. Ako se prodaja završava pozivom, cena i detalji ne moraju biti javni. Polje audience služi da razumeš publiku: nikada ga nemoj kopirati kao početak rečenice ili obraćanje, već ga preformuliši prirodno. FORMA: glavni zaključak 55 do 85 reči, 2 do 4 rečenice, sa ocenom profila, najvećom snagom, najvećom preprekom i poslovnim efektom. Obrazloženje 45 do 75 reči, sa konkretnim brojevima ili nazivima pregledanih sadržaja. Svaka ocena i svaki prioritet moraju navesti konkretan dokaz. Svaki primer prepravke mora biti potpuna, objavljiva i gramatički prirodna rečenica napisana baš za tu objavu, nikako po šablonu. Kada pominješ sadržaj, uvek koristi njegovo polje title pod navodnicima. Nikada ne koristi interne oznake poput #0 ili #1, niti reči transkript i transkripcija; reci da je govor u Reelu analiziran ili da je Reel detaljno pregledan. Ograničenja objasni kratko i klijentskim jezikom, bez tehničkih detalja. LICE BRENDA: proceni da li se u pregledanom sadržaju dosledno pojavljuje prepoznatljiva osoba koja govori, objašnjava ili predstavlja brend. Ako to ne možeš potvrditi na najmanje dva sadržaja, među prva dva prioriteta jasno napiši da brendu nedostaje lice brenda i preporuči da vlasnik ili stalni predstavnik redovno govori pred kamerom. Ne tvrdi da lica nema ako vizuelni dokazi nisu dovoljni; tada napiši da dosledno lice brenda nije potvrđeno u pregledanom javnom sadržaju. UPITNIK NIJE ISTINA: klijent često upiše nešto neodređeno ili nepotpuno. Ako je odgovor o ponudi uopšten, na primer svi proizvodi ili sve usluge, nemoj ga doslovno ponavljati niti stavljati pod navodnike. Iz biografije, opisa objava i onoga što se čuje u Reelovima zaključi šta biznis stvarno prodaje i nazovi to svojim rečima, prirodno. Isto važi za publiku, grad i cilj. U polje offerRead upiši kako si razumeo ponudu na osnovu samog profila. BROJEVI: nikada ne piši konstrukcije poput samo 0 od 12. Ako nečega nema, napiši to kao rečenicu, na primer da nijedna od dvanaest pregledanih objava ne pokazuje rezultat klijenta. PREGLED PRE PLAĆANJA: previewCards su šest nalaza koje klijent vidi pre nego što plati. Svaki mora biti konkretan nalaz o ovom profilu, napisan kao da si upravo odgledao Reelove i pročitao objave. Polje label je kratka oznaka velikim slovima, title je jedna rečenica koja iznosi nalaz, body su dve do tri rečenice sa konkretnim dokazom iz profila. Polje urgency je jedna rečenica koja imenuje najskuplju posledicu trenutnog stanja, a consequence jedna rečenica o tome šta se dešava ako se to ne promeni. Nijedna od tih rečenica ne sme da zvuči kao šablon. OBRAĆANJE: analizu čita vlasnik profila. Njemu se obraćaš sa ti. Nikada ne piši o njemu u trećem licu i nikada ga ne oslovljavaj imenom kao da je neko treći. Umesto da napišeš da neka osoba dobro objašnjava, napiši da ti dobro objašnjavaš. Ako u sadržaju govori više osoba iz istog tima, koristi vi ili vaš tim. Ime vlasnika koristi samo ako je stvarno neophodno, i to kao deo obraćanja, ne kao subjekat o kome pričaš. NASLOV: polje headline je naslov koji klijent prvo vidi, najviše devet reči, u dve rečenice: prva imenuje ono što već radi dobro, druga imenuje šta ga to košta. Mora biti napisan baš za ovaj profil i ovu delatnost, nikako uopšteno.\n\nPODACI O BIZNISU:\n${JSON.stringify(form)}\n\nPREGLEDANI SADRŽAJ:\n${JSON.stringify(evidence.map(({ image, ...item }) => item))}` }];
  evidence.filter(item => item.image).slice(0, 6).forEach(item => {
    try {
      input.push({ type: "input_text", text: `Vizuelni dokaz za sadržaj „${item.title}“:` });
      input.push({ type: "input_image", image_url: safeMediaUrl(item.image), detail: "high" });
    } catch {}
  });
  const aiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(100000),
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
