export const config = { maxDuration: 300 };

const MAX_POSTS = 12;
const MAX_VIDEOS = 12;
const MAX_MEDIA_BYTES = 16 * 1024 * 1024;
const MODEL = process.env.OPENAI_AUDIT_MODEL || "gpt-5.6-luna";

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
  const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(20000) });
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
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form, signal: AbortSignal.timeout(28000) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error?.message || "Transkripcija nije uspela.");
    return { status: "transcribed", transcript: clean(payload.text, 6000) };
  } catch (error) {
    return { status: "unavailable", transcript: "", error: clean(error.message, 240) };
  }
}

const STRING = { type: "string" };

function coreSchema() {
  const string = STRING;
  return {
    type: "object", additionalProperties: false,
    required: ["overallScore", "offerRead", "headline", "mainConclusion", "mainReason", "urgency", "consequence", "previewCards", "coverage", "scores", "priorities", "examples"],
    properties: {
      overallScore: { type: "integer", minimum: 30, maximum: 95 },
      offerRead: string, headline: string, mainConclusion: string, mainReason: string, urgency: string, consequence: string,
      previewCards: { type: "array", minItems: 6, maxItems: 6, items: { type: "object", additionalProperties: false, required: ["label", "title", "body"], properties: { label: string, title: string, body: string } } },
      coverage: { type: "object", additionalProperties: false, required: ["postsReviewed", "videosFound", "videosTranscribed", "limitations"], properties: { postsReviewed: { type: "integer" }, videosFound: { type: "integer" }, videosTranscribed: { type: "integer" }, limitations: { type: "array", items: string } } },
      scores: { type: "array", minItems: 5, maxItems: 5, items: { type: "object", additionalProperties: false, required: ["name", "value", "reason"], properties: { name: string, value: { type: "integer", minimum: 30, maximum: 95 }, reason: string } } },
      priorities: { type: "array", minItems: 5, maxItems: 5, items: { type: "object", additionalProperties: false, required: ["title", "why", "evidence"], properties: { title: string, why: string, evidence: string } } },
      examples: { type: "array", minItems: 5, maxItems: 5, items: { type: "object", additionalProperties: false, required: ["postIndex", "format", "observed", "works", "improve", "rewrite"], properties: { postIndex: { type: "integer" }, format: string, observed: string, works: string, improve: string, rewrite: string } } }
    }
  };
}

function ideasSchema() {
  const string = STRING;
  const idea = { type: "object", additionalProperties: false, required: ["title", "execution", "reason"], properties: { title: string, execution: string, reason: string } };
  return {
    type: "object", additionalProperties: false,
    required: ["offerRead", "contentIdeas"],
    properties: {
      offerRead: string,
      contentIdeas: { type: "object", additionalProperties: false, required: ["reels", "stories", "carousels", "posts"], properties: { reels: { type: "array", minItems: 12, maxItems: 12, items: idea }, stories: { type: "array", minItems: 12, maxItems: 12, items: idea }, carousels: { type: "array", minItems: 1, maxItems: 1, items: idea }, posts: { type: "array", minItems: 1, maxItems: 1, items: idea } } }
    }
  };
}

// Zajednicka pravila glasa i tacnosti — vaze za oba poziva modela.
const RULES = `Ti si Marketizo strateg sa dugogodišnjim iskustvom u sadržaju za uslužne biznise. Ovo nije automatski izveštaj, nego tvoje lično mišljenje posle pažljivog pregleda profila. Piši prirodnim srpskim jezikom (ekavica, sa svim našim slovima), kratkim rečenicama, direktno klijentu na ti, kao da sediš preko puta njega i objašnjavaš mu šta si video.

GLAS: bez marketinških fraza tipa u današnje vreme, digitalni svet, ključno je, potencijal, optimizovati, unaprediti; bez gomilanja prideva; bez uvodnih rečenica koje ne nose informaciju. Nijedna rečenica ne sme da bude takva da bi jednako važila za bilo koji drugi biznis. Ako rečenica važi za svakoga, obriši je i napiši konkretnu. Svaka tvrdnja mora da se oslanja na nešto što si stvarno video: naziv pregledanog sadržaja, broj, rečenicu iz opisa ili ono što se vidi na slici.

UPITNIK NIJE ISTINA: klijent je upitnik popunio na brzinu, često nepismeno, nepotpuno ili uopšteno. Upitnik ti služi samo kao nagoveštaj, a ne kao izvor teksta. Iz biografije, opisa objava i onoga što se čuje u Reelovima sam zaključi šta ovaj biznis stvarno prodaje, kome i kako se do njega dolazi, pa to nazovi svojim rečima, kratko i prirodno. U polje offerRead upiši tu svoju formulaciju ponude, u najviše osam reči, tako da zvuči kao da je piše profesionalac.

ZABRANJENO PREPISIVANJE: nijedan deo teksta iz upitnika ne smeš da preneseš doslovno, ni u navodnicima ni bez njih, ni u naslovima, ni u idejama za sadržaj. Ako u upitniku piše nešto poput svi proizvodi, sve usluge ili rečenica sa greškama, potpuno je zanemari i napiši svoju formulaciju. Navodnici se koriste isključivo za naziv pregledanog sadržaja iz polja title ili za rečenicu koju si stvarno pročitao u opisu, odnosno čuo u Reelu.

TAČNOST: analiziraj samo dokaze koje si dobio. Ne pretpostavljaj da nešto nedostaje ako to nisi proverio. Ne izmišljaj grad, trajanje, cenu, format, rezultat ni poziv na akciju. Ako se prodaja završava pozivom, cena i detalji ne moraju biti javni. Nikada ne koristi interne oznake poput #0 ili #1, niti reči transkript i transkripcija; reci da je govor u Reelu analiziran ili da je Reel detaljno pregledan. Nikada ne piši konstrukcije poput samo 0 od 12; ako nečega nema, napiši to kao rečenicu.

OBRAĆANJE: analizu čita vlasnik profila. Njemu se obraćaš sa ti. Osobe koje se vide i čuju u pregledanom sadržaju su vlasnik profila i njegov tim, dakle upravo oni kojima pišeš. Nikada ih ne imenuj niti opisuj u trećem licu. Umesto da napišeš da neko objašnjava nešto u Reelu, napiši da ti objašnjavaš ili da vi objašnjavate. Ime koristi jedino za nekoga ko očigledno nije deo tima, na primer klijenta iz preporuke.`;

const CORE_TASK = `${RULES}

DIJAGNOZA: najvažnije je da pogodiš pravi problem. Pre pisanja odredi tri stvari: šta ovaj biznis zapravo prodaje, zašto konkretno čovek koji naiđe na profil ne ostavi upit, i šta ga to košta. Glavni zaključak mora da imenuje baš taj problem, a ne opšte stanje profila. Klijent koji ga pročita treba da pomisli da je to tačno njegov slučaj.

FORMA: glavni zaključak 55 do 85 reči, 2 do 4 rečenice, sa ocenom profila, najvećom snagom, najvećom preprekom i poslovnim efektom. Obrazloženje 45 do 75 reči, sa konkretnim brojevima ili nazivima pregledanih sadržaja. Svaka ocena i svaki prioritet moraju navesti konkretan dokaz. Svaki primer prepravke mora biti potpuna, objavljiva i gramatički prirodna rečenica napisana baš za tu objavu, nikako po šablonu. Ograničenja objasni kratko i klijentskim jezikom, bez tehničkih detalja.

LICE BRENDA: proceni da li se u pregledanom sadržaju dosledno pojavljuje prepoznatljiva osoba koja govori, objašnjava ili predstavlja brend. Ako to ne možeš potvrditi na najmanje dva sadržaja, među prva dva prioriteta jasno napiši da brendu nedostaje lice brenda i preporuči da vlasnik ili stalni predstavnik redovno govori pred kamerom. Ne tvrdi da lica nema ako vizuelni dokazi nisu dovoljni; tada napiši da dosledno lice brenda nije potvrđeno u pregledanom javnom sadržaju.

NASLOV: polje headline je prvo što klijent vidi. Dve kratke rečenice, ukupno najviše dvanaest reči. Prva imenuje ono što u ovom konkretnom poslu već radiš dobro, druga imenuje šta te trenutno stanje košta. Naslov mora da pomene delatnost ili temu ovog profila tako da bi bio besmislen na bilo kom drugom profilu. Strogo je zabranjen svaki uopšten naslov tipa Tvoj trud se vidi, Profil tiho gubi klijente, Sadržaj ne prodaje i slično.

PREGLED PRE PLAĆANJA: previewCards su šest nalaza koje klijent vidi pre nego što plati i to je jedini deo koji dobija besplatno. Zato svaki nalaz mora sam po sebi da vredi. Polje label je kratka oznaka velikim slovima. Polje title je jedna rečenica koja iznosi nalaz, konkretno i bez šablona. Polje body ima tri do četiri rečenice, ukupno 45 do 80 reči, i mora da sadrži: konkretan dokaz iz profila (naziv pregledanog sadržaja pod navodnicima, broj ili ono što se vidi na slici), objašnjenje šta to znači za upite, i jednu stvar koju klijent može odmah da uradi ili da zadrži. Šest kartica moraju pokrivati različite teme i nijedna ne sme da ponavlja drugu. Polje urgency je jedna rečenica koja imenuje najskuplju posledicu trenutnog stanja, a consequence jedna rečenica o tome šta se dešava ako se to ne promeni. Nijedna od tih rečenica ne sme da zvuči kao šablon.`;

const IDEAS_TASK = `${RULES}

TVOJ ZADATAK: napiši plan sadržaja za narednih 30 dana, isključivo za ovaj profil. Dvanaest ideja za Reelove, dvanaest ideja za storije, jedan karusel i jednu objavu.

Svaka ideja ima title, execution i reason. Title je naslov ili udica koja bi stvarno stajala na ekranu, napisan jezikom kojim ovaj biznis govori sa svojim ljudima, bez navodnika oko ponude. Execution je konkretno uputstvo kako se snima ili piše: šta se vidi u prvom kadru, šta se kaže, čime se završava. Reason je jedna rečenica zašto baš ta ideja pomaže ovom profilu, vezana za ono što si video u pregledanom sadržaju.

Ideje moraju da se nadovezuju na teme, format i ton koji već postoje na profilu, a da popune ono što nedostaje: dokaz, jasna ponuda, put do upita, lice brenda. Ne ponavljaj isti ugao dva puta. Ne piši uopštene ideje tipa predstavi svoj tim ili podeli savet dana bez konteksta. Nijedan naslov ne sme da sadrži rečenicu prepisanu iz upitnika.`;

function outputText(payload) {
  if (payload.output_text) return payload.output_text;
  return (payload.output || []).flatMap(item => item.content || []).find(item => item.type === "output_text")?.text || "";
}

async function ask({ apiKey, task, name, schema, evidenceInput, timeoutMs, effort }) {
  const input = [{ type: "input_text", text: task }, ...evidenceInput];
  const aiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model: MODEL,
      reasoning: { effort },
      input: [{ role: "user", content: input }],
      text: { format: { type: "json_schema", name, strict: true, schema } }
    })
  });
  const payload = await aiResponse.json().catch(() => ({}));
  if (!aiResponse.ok) throw new Error(payload.error?.message || "Dubinska analiza nije uspela.");
  return JSON.parse(outputText(payload));
}

// Jedan pokusaj sa punim razmisljanjem, pa jedan brzi pokusaj ako prvi padne ili istekne.
async function askWithRetry(options) {
  try {
    return await ask(options);
  } catch (error) {
    return await ask({ ...options, effort: "low", timeoutMs: Math.min(options.timeoutMs, 90000) });
  }
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
  const budget = Number(process.env.MARKETIZO_TRANSCRIBE_BUDGET_MS || 30000);
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

  const evidenceInput = [{
    type: "input_text",
    text: `ODGOVORI IZ UPITNIKA (samo nagoveštaj, nikako izvor teksta):\n${JSON.stringify(form)}\n\nPREGLEDANI SADRŽAJ (ovo je tvoj glavni izvor):\n${JSON.stringify(evidence.map(({ image, ...item }) => item))}`
  }];
  evidence.filter(item => item.image).slice(0, 6).forEach(item => {
    try {
      evidenceInput.push({ type: "input_text", text: `Vizuelni dokaz za sadržaj „${item.title}“:` });
      evidenceInput.push({ type: "input_image", image_url: safeMediaUrl(item.image), detail: "high" });
    } catch {}
  });

  // Dva poziva idu paralelno: dijagnoza i plan sadrzaja. Tako je ukupno cekanje
  // jednako duzem od dva, a ne njihovom zbiru, i svaki poziv ima uzi zadatak.
  const [core, ideas] = await Promise.all([
    askWithRetry({ apiKey, task: CORE_TASK, name: "marketizo_brand_audit", schema: coreSchema(), evidenceInput, timeoutMs: 130000, effort: "medium" })
      .then(result => ({ ok: true, result }))
      .catch(error => ({ ok: false, error })),
    askWithRetry({ apiKey, task: IDEAS_TASK, name: "marketizo_content_plan", schema: ideasSchema(), evidenceInput, timeoutMs: 150000, effort: "medium" })
      .then(result => ({ ok: true, result }))
      .catch(() => ({ ok: false }))
  ]);

  if (!core.ok) {
    return response.status(502).json({ error: clean(core.error?.message, 240) || "Dubinska analiza nije uspela. Pokušaj ponovo." });
  }

  const audit = { ...core.result, contentIdeas: ideas.ok ? ideas.result.contentIdeas : null };
  return response.status(200).json({ audit, evidence, model: MODEL });
}
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
    input.push({ type: "input_text", text: "OBAVEZNO: osobe koje se vide i čuju u pregledanom sadržaju su vlasnik profila i njegov tim, dakle upravo oni kojima pišeš. Nikada ih ne imenuj niti opisuj u trećem licu. Umesto da napišeš da neko objašnjava nešto u Reelu, napiši da ti objašnjavaš ili da vi objašnjavate. Ime koristi jedino za nekoga ko očigledno nije deo tima, na primer klijenta iz preporuke." });
evidence.filter(item => item.image).slice(0, 6).forEach(item => {
    try {
      input.push({ type: "input_text", text: `Vizuelni dokaz za sadržaj „${item.title}“:` });
      input.push({ type: "input_image", image_url: safeMediaUrl(item.image), detail: "high" });
    } catch {}
  });
  const aiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(175000),
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
