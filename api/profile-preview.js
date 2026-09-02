const PLATFORM_CONFIG = {
  instagram: {
    host: "instagram.com",
    actorEnv: "APIFY_INSTAGRAM_ACTOR_ID",
    fallbackActor: "apify~instagram-scraper",
    input: (url) => ({ directUrls: [url], resultsType: "posts", resultsLimit: 12, searchType: "hashtag" }),
  },
  facebook: {
    host: "facebook.com",
    actorEnv: "APIFY_FACEBOOK_ACTOR_ID",
    fallbackActor: "apify~facebook-pages-scraper",
    input: (url) => ({ startUrls: [{ url }], maxPosts: 12 }),
  },
  tiktok: {
    host: "tiktok.com",
    actorEnv: "APIFY_TIKTOK_ACTOR_ID",
    fallbackActor: "clockworks~tiktok-scraper",
    input: (url) => ({ profiles: [url], resultsPerPage: 12, shouldDownloadVideos: false, shouldDownloadCovers: false }),
  },
};

function safeUrl(raw, expectedHost) {
  const url = new URL(raw);
  const host = url.hostname.replace(/^www\./, "");
  if (url.protocol !== "https:" || !(host === expectedHost || host.endsWith(`.${expectedHost}`))) throw new Error("Link ne pripada izabranoj mreži.");
  return url.toString();
}

function imageOf(item) {
  return item.displayUrl || item.imageUrl || item.thumbnailUrl || item.thumbnail || item.coverImageUrl || item.cover || item.mediaUrl || item.picture || "";
}

function normalize(platform, url, items) {
  const usable = items.filter((item) => item && typeof item === "object");
  const profile = usable.find((item) => item.profilePicUrl || item.avatarUrl || item.avatar || item.biography || item.bio) || usable[0] || {};
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
    username: profile.username || profile.uniqueId || profile.pageName || new URL(url).pathname.split("/").filter(Boolean)[0] || platform,
    displayName: profile.fullName || profile.nickname || profile.name || profile.title || "Javni profil",
    bio: profile.biography || profile.bio || profile.signature || profile.about || "",
    avatar: profile.profilePicUrl || profile.profilePicUrlHD || profile.avatarUrl || profile.avatar || profile.profilePicture || "",
    followers: profile.followersCount ?? profile.fans ?? profile.followers ?? null,
    posts,
  };
}

async function fetchProfile(platform, rawUrl, token) {
  const config = PLATFORM_CONFIG[platform];
  const url = safeUrl(rawUrl, config.host);
  const actor = process.env[config.actorEnv] || config.fallbackActor;
  const endpoint = `https://api.apify.com/v2/actors/${encodeURIComponent(actor)}/run-sync-get-dataset-items?clean=true&format=json`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(config.input(url)),
  });
  if (!response.ok) throw new Error(`Servis za ${platform} je vratio status ${response.status}.`);
  const items = await response.json();
  const result = normalize(platform, url, Array.isArray(items) ? items : []);
  if (!result.posts.length) throw new Error("Nema javno dostupnih objava za prikaz.");
  return result;
}

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
  if (!process.env.APIFY_TOKEN) return response.status(503).json({ error: "Prikupljanje javnih profila još nije povezano. Dodajte APIFY_TOKEN na serveru." });
  const supplied = request.body?.profiles || {};
  const entries = Object.entries(supplied).filter(([platform, url]) => PLATFORM_CONFIG[platform] && typeof url === "string" && url.trim());
  if (!entries.length) return response.status(400).json({ error: "Dodajte najmanje jedan profil." });
  const settled = await Promise.allSettled(entries.map(([platform, url]) => fetchProfile(platform, url.trim(), process.env.APIFY_TOKEN)));
  const profiles = settled.filter((item) => item.status === "fulfilled").map((item) => item.value);
  const failures = settled.map((item, index) => ({ item, index })).filter(({ item }) => item.status === "rejected").map(({ item, index }) => ({ platform: entries[index]?.[0], message: item.reason?.message || "Profil nije dostupan." }));
  if (!profiles.length) return response.status(422).json({ error: "Nijedan profil nije mogao biti javno učitan.", failures });
  return response.status(200).json({ profiles, failures, disclosure: "Prikazani su samo javno dostupni podaci sa unetih profila." });
}
