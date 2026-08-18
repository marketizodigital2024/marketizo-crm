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
    input: (url) => ({ profiles: [new URL(url).pathname.split("/").filter(Boolean).pop().replace(/^@/,"")], profileScrapeSections: ["videos"], profileSorting: "latest", resultsPerPage: 12, shouldDownloadVideos: false, shouldDownloadCovers: true, shouldDownloadAvatars: true }),
  },
};

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
    const upstream = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" }, signal: AbortSignal.timeout(15000) });
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
  return item.displayUrl || item.imageUrl || item.thumbnailUrl || item.thumbnail || item.coverImageUrl || item.cover || item.coverPhotoUrl || item.mediaUrl || item.picture || item.images?.[0] || item.media?.[0]?.url || item.attachments?.[0]?.media?.image?.src || item.videoMeta?.coverUrl || item.videoMeta?.originalCoverUrl || "";
}

function authorOf(item = {}) {
  return item.owner || item.author || item.authorMeta || item.channel || item.user || item.userInfo?.user || {};
}

function normalize(platform, url, items) {
  const usable = items.filter((item) => item && typeof item === "object");
  const profileScore=item=>{const author=authorOf(item);return (item.profilePicUrlHD?12:0)+(item.profilePicUrl?10:0)+(item.ownerProfilePicUrl?9:0)+(item.avatarUrl||item.avatar?8:0)+(author.avatarLarger||author.profilePicUrl?7:0)+(item.biography||item.bio||item.signature?4:0)+(item.fullName||item.ownerFullName||item.nickname?2:0)};
  const profile = [...usable].sort((a,b)=>profileScore(b)-profileScore(a))[0] || {};
  const author = authorOf(profile);
  const posts = usable.map((item) => ({
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

async function fetchProfile(platform, rawUrl, token) {
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
  const result = normalize(platform, url, Array.isArray(items) ? items : []);
  if (!result.posts.length && !result.avatar) throw new Error("Nema javno dostupnih objava za prikaz.");
  return result;
}

export default async function handler(request, response) {
  if (request.method === "GET" && request.query?.image) return proxyImage(request, response);
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
  if (!process.env.APIFY_TOKEN) return response.status(503).json({ error: "Prikupljanje javnih profila još nije povezano. Dodajte APIFY_TOKEN na serveru." });
  const supplied = request.body?.profiles || {};
  const entries = Object.entries(supplied).filter(([platform, url]) => PLATFORM_CONFIG[platform] && typeof url === "string" && url.trim());
  if (!entries.length) return response.status(400).json({ error: "Dodajte najmanje jedan profil." });
  const settled = await Promise.allSettled(entries.map(([platform, url]) => fetchProfile(platform, url.trim(), process.env.APIFY_TOKEN)));
  const profiles = settled.filter((item) => item.status === "fulfilled").map((item) => item.value);
  const sharedAvatar = profiles.find((profile) => profile.avatar)?.avatar || "";
  profiles.forEach((profile) => { if (!profile.avatar && sharedAvatar) profile.avatar = sharedAvatar; });
  const failures = settled.map((item, index) => ({ item, index })).filter(({ item }) => item.status === "rejected").map(({ item, index }) => ({ platform: entries[index]?.[0], message: item.reason?.message || "Profil nije dostupan." }));
  if (!profiles.length) {
    console.error("Profile preview failed", failures);
    return response.status(422).json({ error: "Nijedan profil nije mogao biti javno učitan.", failures });
  }
  return response.status(200).json({ profiles, failures, disclosure: "Prikazani su samo javno dostupni podaci sa unetih profila." });
}
