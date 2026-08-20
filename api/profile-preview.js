export const config = { maxDuration: 120 };

const PLATFORM_CONFIG = {
  instagram: {
    host: "instagram.com",
    actorEnv: "APIFY_INSTAGRAM_ACTOR_ID",
    fallbackActor: "apify~instagram-scraper",
    input: (url) => ({ directUrls: [url], resultsType: "posts", resultsLimit: 12 }),
  },
  facebook: {
    host: "facebook.com",
    actorEnv: "APIFY_FACEBOOK_ACTOR_ID",
    fallbackActor: "netdesignr~facebook-posts-scraper",
    input: (url) => ({ startUrls: [{ url }], pageOrProfileUrls: [url], maxPosts: 12, extractionMode: "balanced", includeTopComments: false }),
  },
  tiktok: {
    host: "tiktok.com",
    actorEnv: "APIFY_TIKTOK_ACTOR_ID",
    fallbackActor: "clockworks~tiktok-scraper",
    input: (url) => ({ profiles: [tiktokHandle(url)], profileScrapeSections: ["videos"], profileSorting: "latest", resultsPerPage: 12, shouldDownloadVideos: false, shouldDownloadCovers: true, shouldDownloadAvatars: true }),
  },
};

const NETWORK_NAME = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok" };

function tiktokHandle(url) {
  const handle = new URL(url).pathname.split("/").filter(Boolean).pop();
  if (!handle) throw new Error("Link ne sadrži TikTok korisničko ime.");
  return handle.replace(/^@/, "");
}

function safeUrl(raw, expectedHost) {
  const url = new URL(raw);
  const host = url.hostname.replace(/^www\./, "");
  if (url.protocol !== "https:" || !(host === expectedHost || host.endsWith(`.${expectedHost}`))) throw new Error("Link ne pripada izabranoj mreži.");
  return url.toString();
}

async function proxyImage(request, response) {
  try {
    const raw = Array.isArray(request.query?.image) ? request.query.image[0] : request.query?.image;
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    const allowed = ["cdninstagram.com", "fbcdn.net", "tiktokcdn.com", "tiktokcdn-us.com", "tiktokcdn-eu.com", "byteimg.com", "ibytedtos.com", "akamaized.net", "api.apify.com"];
    if (url.protocol !== "https:" || !allowed.some((domain) => host === domain || host.endsWith(`.${domain}`))) return response.status(400).end();
    const headers = { "User-Agent": "Mozilla/5.0", Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" };
    if (host === "api.apify.com" && process.env.APIFY_TOKEN && /^\/v2\/(key-value-stores|datasets)\//.test(url.pathname)) headers.Authorization = `Bearer ${process.env.APIFY_TOKEN}`;
    const upstream = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
    if (!upstream.ok) return response.status(404).end();
    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) return response.status(415).end();
    response.setHeader("Content-Type", contentType);
    response.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    return response.status(200).send(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    return response.status(400).end();
  }
}

function imageOf(item) {
  const candidates = [item.displayUrl, item.imageUrl, item.image, item.thumbnailUrl, item.thumbnail, item.coverImageUrl, item.cover, item.coverPhotoUrl, item.picture, item.images?.[0], item.media?.[0]?.url, item.attachments?.[0]?.media?.image?.src, item.videoMeta?.coverUrl, item.videoMeta?.originalCoverUrl, item.mediaUrl];
  return candidates.find((value) => typeof value === "string" && value.startsWith("https://") && !/facebook\.com\/(?:permalink|reel|watch|share)/i.test(value)) || "";
}

function authorOf(item = {}) {
  return item.owner || item.author || item.authorMeta || item.channel || item.user || item.userInfo?.user || {};
}

function normalize(platform, url, items, postItems) {
  const usable = items.filter((item) => item && typeof item === "object");
  const profileScore=item=>{const author=authorOf(item);return (item.profilePicUrlHD?12:0)+(item.profilePicUrl?10:0)+(item.ownerProfilePicUrl?9:0)+(item.avatarUrl||item.avatar?8:0)+(author.avatarLarger||author.profilePicUrl?7:0)+(item.biography||item.bio||item.signature?4:0)+(item.fullName||item.ownerFullName||item.nickname?2:0)};
  const profile = [...usable].sort((a,b)=>profileScore(b)-profileScore(a))[0] || {};
  const author = authorOf(profile);
  const source = Array.isArray(postItems) && postItems.length ? postItems.filter((item) => item && typeof item === "object") : usable;
  const posts = source.map((item) => ({
    image: imageOf(item),
    video: Boolean(item.videoUrl || item.isVideo || item.type === "Video" || item.mediaType === "VIDEO"),
    videoUrl: item.videoUrl || item.videoPlayUrl || item.downloadUrl || item.mediaUrl || "",
    caption: item.caption || item.text || item.description || item.videoDescription || item.title || "",
    likes: item.likesCount ?? item.diggCount ?? item.likes ?? null,
    comments: item.commentsCount ?? item.commentCount ?? item.comments ?? null,
    views: item.videoViewCount ?? item.playCount ?? item.viewsCount ?? item.views ?? null,
    timestamp: item.timestamp || item.createTimeISO || item.date || item.publishedAt || "",
    type: item.type || item.mediaType || (item.videoUrl ? "video" : "image"),
    url: item.url || item.postUrl || item.webVideoUrl || item.shareUrl || "",
  })).filter((post) => post.image).slice(0, 12);
  return {
    platform,
    sourceUrl: url,
    username: String(profile.username || profile.ownerUsername || profile.uniqueId || profile.pageName || author.username || author.uniqueId || author.name || new URL(url).pathname.split("/").filter(Boolean)[0] || platform).replace(/^@/,""),
    displayName: profile.fullName || profile.ownerFullName || profile.nickname || profile.name || profile.title || author.fullName || author.nickname || profile.username || profile.ownerUsername || new URL(url).pathname.split("/").filter(Boolean)[0] || platform,
    bio: profile.biography || profile.bio || profile.signature || profile.about || author.biography || author.signature || "",
    avatar: profile.profilePicUrlHD || profile.profilePicUrl || profile.ownerProfilePicUrlHD || profile.ownerProfilePicUrl || profile.avatarUrl || profile.avatar || profile.profilePicture || profile.pageProfilePictureUrl || profile.personalProfile?.profilePictureLarge || profile.personalProfile?.profilePictureMedium || profile.profileImageUrl || author.profilePicUrlHD || author.profilePicUrl || author.avatarLarger || author.avatarMedium || author.avatar || author.avatarUrl || "",
    followers: profile.followersCount ?? profile.fans ?? profile.followers ?? null,
    posts,
  };
}

async function fetchProfile(platform, rawUrl, token, debug) {
  const config = PLATFORM_CONFIG[platform];
  const url = safeUrl(rawUrl, config.host);
  const actor = process.env[config.actorEnv] || config.fallbackActor;
  const endpoint = `https://api.apify.com/v2/actors/${encodeURIComponent(actor)}/run-sync-get-dataset-items?clean=true&format=json`;
  const run = input => fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(input), signal: AbortSignal.timeout(90000),
  });
  const extra=[];
  if(platform==="instagram") extra.push(run({directUrls:[url],resultsType:"details",resultsLimit:1}));
  if(platform==="facebook"){
    const detailsEndpoint=`https://api.apify.com/v2/actors/${encodeURIComponent("apify~facebook-pages-scraper")}/run-sync-get-dataset-items?clean=true&format=json`;
    extra.push(fetch(detailsEndpoint,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({startUrls:[{url}]}),signal:AbortSignal.timeout(90000)}));
  }
  const responses=await Promise.all([run(config.input(url)),...extra]);
  const items=(await Promise.all(responses.map(async item=>item.ok?item.json():[]))).flat();
  const list = Array.isArray(items) ? items : [];
  let result = normalize(platform, url, list);
  // Za neke profile Apify vrati objave samo ugnjezdene unutar detalja profila.
  // Bez ovoga bi analiza ostala bez ijedne objave i pala bi na opsti tekst.
  if (!result.posts.length) {
    const nested = list.flatMap((item) => [
      ...(Array.isArray(item?.latestPosts) ? item.latestPosts : []),
      ...(Array.isArray(item?.topPosts) ? item.topPosts : []),
      ...(Array.isArray(item?.posts) ? item.posts : []),
      ...(Array.isArray(item?.edge_owner_to_timeline_media?.edges) ? item.edge_owner_to_timeline_media.edges.map((edge) => edge?.node).filter(Boolean) : []),
    ]);
    if (nested.length) result = normalize(platform, url, list, nested);
  }
  if (platform === "facebook" && /^(people|profile\.php|pages)$/i.test(result.username)) result.username = String(result.displayName || "Facebook profil").replace(/\s+/g, "");
  const blocked = list.find((item) => item && (item.error || item.isRestrictedProfile || item.private));
  if (debug) {
    // Samo imena polja i brojevi, bez sadrzaja. Sluzi za trazenje uzroka kad objava nema.
    result.diagnostics = {
      items: list.length,
      posts: result.posts.length,
      keys: list.slice(0, 3).map((item) => Object.keys(item || {}).slice(0, 40)),
      flags: list.slice(0, 3).map((item) => ({
        error: String(item?.error || "").slice(0, 90),
        reason: String(item?.restrictionReason || "").slice(0, 90),
        restricted: Boolean(item?.isRestrictedProfile),
        private: Boolean(item?.private),
        latestPosts: Array.isArray(item?.latestPosts) ? item.latestPosts.length : null,
      })),
    };
  }
  // Analiza bez ijedne objave nema na cemu da se zasnuje. Takav profil je greska,
  // a ne uspeh, jer bi klijent inace platio izvestaj pisan bez dokaza sa profila.
  if (!result.posts.length) {
    if (blocked?.private) throw new Error("Profil je privatan, pa ne možemo da pročitamo objave.");
    if (blocked) throw new Error(`${NETWORK_NAME[platform] || "Mreža"} trenutno ne dozvoljava pregled ovog profila, pa nismo mogli da učitamo objave.`);
    throw new Error("Na ovom profilu nismo pronašli nijednu javnu objavu.");
  }
  return result;
}

export default async function handler(request, response) {
  if (request.method === "GET" && request.query?.image) return proxyImage(request, response);
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
  if (!process.env.APIFY_TOKEN) return response.status(503).json({ error: "Prikupljanje javnih profila još nije povezano. Dodajte APIFY_TOKEN na serveru." });
  const supplied = request.body?.profiles || {};
  const entries = Object.entries(supplied).filter(([platform, url]) => PLATFORM_CONFIG[platform] && typeof url === "string" && url.trim());
  if (!entries.length) return response.status(400).json({ error: "Dodajte najmanje jedan profil." });
  const debug = request.body?.debug === true;
  const settled = await Promise.allSettled(entries.map(([platform, url]) => fetchProfile(platform, url.trim(), process.env.APIFY_TOKEN, debug)));
  const profiles = settled.filter((item) => item.status === "fulfilled").map((item) => item.value);
  const sharedAvatar = profiles.find((profile) => profile.avatar)?.avatar || "";
  profiles.forEach((profile) => { if (!profile.avatar && sharedAvatar) profile.avatar = sharedAvatar; });
  const failures = settled.map((item, index) => ({ item, index })).filter(({ item }) => item.status === "rejected").map(({ item, index }) => ({ platform: entries[index]?.[0], message: /[čćžšđ]/i.test(String(item.reason?.message || "")) ? item.reason.message : "Profil nije javno dostupan ili link nije unet tačno." }));
  if (!profiles.length) {
    console.error("Profile preview failed", failures);
    return response.status(422).json({ error: "Nijedan profil nije mogao biti javno učitan.", failures });
  }
  return response.status(200).json({ profiles, failures, disclosure: "Prikazani su samo javno dostupni podaci sa unetih profila." });
}
