export const config = { maxDuration: 300 };

const MAX_POSTS = 12;
const MAX_VIDEOS = 7;
const MAX_MEDIA_BYTES = 16 * 1024 * 1024;
const MODEL = process.env.OPENAI_AUDIT_MODEL || "gpt-5.6-luna";
const AUDIT_TABLE = process.env.MARKETIZO_AUDIT_TABLE || "marketizo_audits";

// Sta klijent sme da vidi pre uplate. Sve ostalo ostaje na serveru.
const FREE_FIELDS = ["overallScore", "offerRead", "headline", "mainConclusion", "mainReason", "urgency", "consequence", "previewCards", "coverage"];

function store() {
  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return null;
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" } };
}

async function existingRow(db, auditId) {
  try {
    const response = await fetch(`${db.url}/rest/v1/${AUDIT_TABLE}?id=eq.${encodeURIComponent(auditId)}&select=lead`, {
      headers: db.headers,
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return (await response.json().catch(() => []))[0] || null;
  } catch {
    return null;
  }
}

async function saveAudit(db, auditId, audit, evidence, form) {
  // Ako je ova analiza vec placena, ne diramo je. Inace bi svako ko zna oznaku
  // analize mogao da prepise izvestaj koji je klijent kupio.
  const previous = await existingRow(db, auditId);
  if (previous?.lead?.paidAt) return true;

  const response = await fetch(`${db.url}/rest/v1/${AUDIT_TABLE}?on_conflict=id`, {
    method: "POST",
    headers: { ...db.headers, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      id: auditId,
      audit,
      evidence,
      lead: { name: clean(form.name, 120), email: clean(form.email, 200), phone: clean(form.phone, 50), business: clean(form.business, 120), location: clean(form.location, 120) },
      updated_at: new Date().toISOString(),
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(clean(await response.text(), 200) || "Čuvanje analize nije uspelo.");
  return true;
}

function clean(value, max = 1200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function contentTitle(post, index) {
  const source = clean(post.caption, 500).replace(/https?:\/\/\S+/g, "").replace(/[#@][\p{L}\p{N}_.]+/gu, "").replace(/\s+/g, " ").trim();
  const sentence = source.split(/[.!?\n]/).find(part => part.trim().length >= 12) || source;
  const words = sentence.trim().split(/\s+/).slice(0, 9).join(" ");
  return words || `${post.video ? "Reel" : "Objava"} sa profila ${post.username ? `@${post.username}` : index + 1}`;
}

const MEDIA_HOSTS = ["cdninstagram.com", "fbcdn.net", "tiktokcdn.com", "tiktokcdn-us.com", "tiktokcdn-eu.com", "byteimg.com", "ibytedtos.com", "akamaized.net", "api.apify.com"];

function safeMediaUrl(raw) {
  const url = new URL(raw);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:") throw new Error("Nedozvoljen media URL.");
  if (host.startsWith("[") || host.includes(":")) throw new Error("Nedozvoljen media URL.");
  if (!MEDIA_HOSTS.some((domain) => host === domain || host.endsWith("." + domain))) throw new Error("Nedozvoljen media URL.");
  return url.toString();
}

function withDeadline(signal, ms) {
  const timeout = AbortSignal.timeout(ms);
  if (!signal) return timeout;
  return typeof AbortSignal.any === "function" ? AbortSignal.any([signal, timeout]) : signal;
}

async function downloadMedia(rawUrl, signal) {
  const url = safeMediaUrl(rawUrl);
  const response = await fetch(url, { redirect: "follow", signal: withDeadline(signal, 20000) });
  if (!response.ok) throw new Error(`Video nije dostupan (${response.status}).`);
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > MAX_MEDIA_BYTES) throw new Error("Video je prevelik za ovu analizu.");
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_MEDIA_BYTES) throw new Error("Video je prevelik za ovu analizu.");
  return { bytes, type: response.headers.get("content-type") || "video/mp4" };
}

async function transcribe(post, apiKey, signal) {
  if (!post.videoUrl) return { status: "unavailable", transcript: "" };
  try {
    const media = await downloadMedia(post.videoUrl, signal);
    const form = new FormData();
    form.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe");
    form.append("language", "sr");
    form.append("prompt", "Marketing sadržaj na srpskom, bosanskom, hrvatskom ili nemačkom jeziku. Sačuvaj nazive brendova, proizvoda i cene tačno.");
    form.append("file", new Blob([media.bytes], { type: media.type }), "reel.mp4");
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form, signal: withDeadline(signal, 28000) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error?.message || "Transkripcija nije uspela.");
    return { status: "transcribed", transcript: clean(payload.text, 1600) };
  } catch (error) {
    return { status: "unavailable", transcript: "", error: clean(error.message, 240) };
  }
}

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

async function inlineImage(rawUrl, signal) {
  const url = safeMediaUrl(rawUrl);
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0", Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" },
    signal: withDeadline(signal, 12000),
  });
  if (!response.ok) throw new Error(`Slika nije dostupna (${response.status}).`);
  const type = response.headers.get("content-type") || "image/jpeg";
  if (!type.startsWith("image/")) throw new Error("Odgovor nije slika.");
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("Slika je prevelika.");
  return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
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

LICE BRENDA: gledaj poslate vizuelne dokaze i ono što se čuje u Reelovima. Ako se ista osoba pojavljuje na dva ili više vizuelnih dokaza, ili ako iz govora jasno sledi da isti čovek vodi objašnjenje kroz više Reelova, to je potvrđeno lice brenda: napiši to kao snagu i opiši tu osobu onako kako se vidi, bez pogađanja imena. Gosti, saradnje, najave događaja i objave sa više ljudi ne obaraju tu ocenu i ne pominju se kao nedoslednost, jer ih ima malo. Da profil nema lice brenda napiši samo ako ni na jednom vizuelnom dokazu nema čoveka i ako se ni iz govora ne prepoznaje stalni glas; tek tada to ide među prva dva prioriteta. Ako si dobio manje od tri vizuelna dokaza, nemoj tvrditi ni da lice postoji ni da ne postoji, nego oceni ostale oblasti.

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
  const text = outputText(payload);
  if (!text.trim()) throw new Error("Model nije vratio rezultat.");
  return JSON.parse(text);
}

// Jedan pokusaj sa punim razmisljanjem, pa jedan brzi pokusaj ako prvi padne ili istekne.
// Oba staju u isti rok, da ukupno cekanje nikada ne prodje ono sto browser ceka.
async function askWithRetry(options) {
  const left = () => options.deadline - Date.now();
  try {
    return await ask({ ...options, timeoutMs: Math.max(15000, Math.min(options.timeoutMs, left())) });
  } catch (error) {
    if (left() < 35000) throw error;
    return await ask({ ...options, effort: "low", timeoutMs: Math.max(15000, Math.min(80000, left())) });
  }
}

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return response.status(503).json({ error: "Dubinska analiza još nije povezana. Potreban je OPENAI_API_KEY." });
  // Browser prekida cekanje na 250 s. Server zato drzi ceo posao ispod ovoga,
  // da klijent nikada ne dobije prazan odgovor posle punog cekanja.
  const started = Date.now();
  const CLIENT_LIMIT = Number(process.env.MARKETIZO_ANALYZE_LIMIT_MS) || 225000;
  const remaining = () => CLIENT_LIMIT - (Date.now() - started);
  const form = request.body?.form || {};
  const profiles = Array.isArray(request.body?.profiles) ? request.body.profiles : [];
  // Uzimamo naizmenicno po jednu objavu iz svake povezane mreze. Ranije je prva
  // mreza popunila celu kvotu, pa druga i treca nisu ulazile u analizu uopste.
  const buckets = profiles
    .filter(profile => profile && typeof profile === "object")
    .map(profile => (Array.isArray(profile.posts) ? profile.posts : [])
      .filter(post => post && typeof post === "object")
      .map(post => ({ ...post, platform: profile.platform, username: profile.username })));
  const posts = [];
  for (let round = 0; posts.length < MAX_POSTS; round += 1) {
    let added = false;
    for (const bucket of buckets) {
      if (round < bucket.length && posts.length < MAX_POSTS) { posts.push(bucket[round]); added = true; }
    }
    if (!added) break;
  }
  if (!posts.length) return response.status(400).json({ error: "Nema sadržaja za dubinsku analizu." });

  const videoPosts = posts.filter(post => post.video && post.videoUrl).slice(0, MAX_VIDEOS);
  // Vremenski budzet: uzimamo sve Reelove koje stignemo da preslusamo, ostali se citaju iz opisa i slika.
  const wanted = Number(process.env.MARKETIZO_TRANSCRIBE_BUDGET_MS) || 40000;
  const budget = Math.max(8000, Math.min(wanted, remaining() - 170000));
  const stopListening = new AbortController();
  const budgetTimer = setTimeout(() => stopListening.abort(), budget);
  const transcripts = await Promise.all(videoPosts.map(post => transcribe(post, apiKey, stopListening.signal)));
  clearTimeout(budgetTimer);

  let videoCursor = 0;
  const evidence = posts.map((post, index) => {
    const transcript = post.video && post.videoUrl && videoCursor < transcripts.length ? transcripts[videoCursor++] : { status: "not_requested", transcript: "" };
    return { index, title: contentTitle(post, index), platform: post.platform, username: post.username, format: post.video ? "reel_video" : "post", caption: clean(post.caption, 1000), image: clean(post.image, 1000), url: clean(post.url, 1000), metrics: { likes: post.likes ?? null, comments: post.comments ?? null, views: post.views ?? null }, transcript };
  });

  const evidenceInput = [{
    type: "input_text",
    text: `ODGOVORI IZ UPITNIKA (samo nagoveštaj, nikako izvor teksta):\n${JSON.stringify(form)}\n\nPREGLEDANI SADRŽAJ (ovo je tvoj glavni izvor):\n${JSON.stringify(evidence.map(({ image, ...item }) => item))}`
  }];
  const withImage = evidence.filter(item => item.image);
  const visualOrder = [...withImage.filter(item => item.format === "reel_video"), ...withImage.filter(item => item.format !== "reel_video")].slice(0, 6);
  const stopImages = new AbortController();
  const imageTimer = setTimeout(() => stopImages.abort(), Math.max(6000, Math.min(26000, remaining() - 150000)));
  const visuals = await Promise.all(
    visualOrder.map(item =>
      inlineImage(item.image, stopImages.signal)
        .then(data => ({ title: item.title, data }))
        .catch(() => null)
    )
  );
  clearTimeout(imageTimer);
  visuals.filter(Boolean).forEach(visual => {
    evidenceInput.push({ type: "input_text", text: `Vizuelni dokaz za sadržaj „${visual.title}“:` });
    evidenceInput.push({ type: "input_image", image_url: visual.data, detail: "high" });
  });

  // Dva poziva idu paralelno: dijagnoza i plan sadrzaja. Tako je ukupno cekanje
  // jednako duzem od dva, a ne njihovom zbiru, i svaki poziv ima uzi zadatak.
  const aiDeadline = started + CLIENT_LIMIT;
  const [core, ideas] = await Promise.all([
    askWithRetry({ apiKey, task: CORE_TASK, name: "marketizo_brand_audit", schema: coreSchema(), evidenceInput, timeoutMs: 125000, effort: "low", deadline: aiDeadline })
      .then(result => ({ ok: true, result }))
      .catch(error => ({ ok: false, error })),
    askWithRetry({ apiKey, task: IDEAS_TASK, name: "marketizo_content_plan", schema: ideasSchema(), evidenceInput, timeoutMs: 125000, effort: "low", deadline: aiDeadline })
      .then(result => ({ ok: true, result }))
      .catch(error => ({ ok: false, error }))
  ]);

  if (!core.ok) {
    console.error("Deep audit failed", core.error?.message, "| ideas:", ideas.error?.message);
    const body = { error: "Dubinska analiza nije uspela iz prvog pokušaja. Pokušaj ponovo za trenutak." };
    if (request.query?.debug === "1") {
      body.detail = clean(core.error?.message, 300);
      body.ideasDetail = clean(ideas.error?.message, 300);
    }
    return response.status(502).json(body);
  }

  const reviewedCoverage = {
    postsReviewed: evidence.length,
    videosFound: videoPosts.length,
    videosTranscribed: transcripts.filter(item => item.status === "transcribed").length,
    limitations: Array.isArray(core.result.coverage?.limitations) ? core.result.coverage.limitations : [],
  };
  const audit = { ...core.result, coverage: reviewedCoverage, contentIdeas: ideas.ok ? ideas.result.contentIdeas : null };

  // Ako je baza povezana, ceo izvestaj ostaje na serveru i klijent dobija samo pregled.
  // Bez baze aplikacija radi kao i ranije, da nista ne stane dok se baza ne podesi.
  const db = store();
  const auditId = clean(form.auditId, 100);
  let gated = false;
  if (db) {
    // Bez oznake analize ne bismo znali za koju uplatu izdajemo izvestaj, pa bi
    // ceo izvestaj otisao besplatno. Zato je oznaka obavezna kada baza postoji.
    if (!auditId) return response.status(400).json({ error: "Nedostaje oznaka analize." });
    try {
      await saveAudit(db, auditId, audit, evidence, form);
      gated = true;
    } catch (error) {
      // Ako izvestaj nije sacuvan, klijent posle uplate ne bi imao sta da otvori.
      console.error("Audit store write failed", error?.message);
      return response.status(503).json({ error: "Analiza je gotova, ali je čuvanje trenutno nedostupno. Pokušaj ponovo za trenutak." });
    }
  }

  const visible = gated ? Object.fromEntries(FREE_FIELDS.filter((key) => audit[key] !== undefined).map((key) => [key, audit[key]])) : audit;
  return response.status(200).json({ audit: visible, evidence, gated, partial: !ideas.ok, model: MODEL });
}
