/**
 * PlayValorant pages are Next.js pages whose content is embedded as `__NEXT_DATA__` JSON.
 * The structures here are undocumented; parsing is defensive and returns nothing rather
 * than throwing on unexpected shapes, so a site redesign degrades to "unavailable".
 */

export function extractNextData(html: string): unknown {
  const match = /<script id="__NEXT_DATA__" type="application\/json"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!match?.[1]) return undefined;
  try {
    return JSON.parse(match[1]);
  } catch {
    return undefined;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Depth-first walk yielding every object node. */
function* walkObjects(root: unknown, maxDepth = 24): Generator<Record<string, unknown>> {
  const stack: Array<{ node: unknown; depth: number }> = [{ node: root, depth: 0 }];
  while (stack.length > 0) {
    const { node, depth } = stack.pop()!;
    if (depth > maxDepth) continue;
    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i -= 1) stack.push({ node: node[i], depth: depth + 1 });
    } else if (isObject(node)) {
      yield node;
      const values = Object.values(node);
      for (let i = values.length - 1; i >= 0; i -= 1) stack.push({ node: values[i], depth: depth + 1 });
    }
  }
}

/** Removes `<...>` tags in one linear pass (a `<[^>]+>` regex backtracks on unclosed tags). */
function removeTags(value: string): string {
  let out = "";
  let inTag = false;
  for (const ch of value) {
    if (ch === "<") inTag = true;
    else if (ch === ">" && inTag) inTag = false;
    else if (!inTag) out += ch;
  }
  return out;
}

function stripHtml(value: string): string {
  return removeTags(value.replaceAll(/<br\s*\/?>/gi, "\n"))
    .replaceAll("&nbsp;", " ")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .trim();
}

export interface ParsedAbilityVideo {
  title: string;
  description?: string;
  videoUrl: string;
  mimeType?: string;
  thumbnailUrl?: string;
}

const str = (v: unknown): string | undefined => (typeof v === "string" && v.length > 0 ? v : undefined);

function toAbilityVideo(node: Record<string, unknown>): ParsedAbilityVideo | undefined {
  const content = node.content;
  if (!isObject(content)) return undefined;
  const media = content.media;
  const title = str(content.title);
  if (!title || !isObject(media) || media.type !== "video" || !Array.isArray(media.sources)) return undefined;
  const sources = media.sources.filter(isObject);
  // Prefer MP4 (universally decodable on iOS/Android) over WebM.
  const chosen = sources.find((s) => s.type === "video/mp4") ?? sources[0];
  if (!chosen) return undefined;
  const src = str(chosen.src);
  if (!src?.startsWith("https://")) return undefined;
  const item: ParsedAbilityVideo = { title, videoUrl: src };
  const type = str(chosen.type);
  if (type) item.mimeType = type;
  const body = isObject(content.description) ? str(content.description.body) : undefined;
  if (body) item.description = stripHtml(body);
  const thumb = isObject(node.thumbnail) ? str(node.thumbnail.url) : undefined;
  if (thumb?.startsWith("https://")) item.thumbnailUrl = thumb;
  return item;
}

/** Finds `{ thumbnail, content: { title, description, media: { type: "video", sources } } }` groups. */
export function parseAgentAbilityVideos(nextData: unknown): ParsedAbilityVideo[] {
  const out: ParsedAbilityVideo[] = [];
  const seen = new Set<string>();
  for (const node of walkObjects(nextData)) {
    const item = toAbilityVideo(node);
    if (!item || seen.has(item.videoUrl)) continue;
    seen.add(item.videoUrl);
    out.push(item);
  }
  return out;
}

export interface ParsedArticle {
  title: string;
  description?: string;
  url: string;
  imageUrl?: string;
  publishedAt: string;
  category?: string;
}

function toArticle(node: Record<string, unknown>, origin: string): ParsedArticle | undefined {
  const title = str(node.title);
  const publishedAt = str(node.publishedAt);
  if (!title || !publishedAt || !isObject(node.action)) return undefined;
  const payload = node.action.payload;
  let href = isObject(payload) ? str(payload.url) : undefined;
  if (href?.startsWith("/")) href = origin + href;
  if (!href?.startsWith("https://")) return undefined;
  const article: ParsedArticle = { title, url: href, publishedAt };
  const description = node.description;
  const body = isObject(description) ? str(description.body) : undefined;
  if (body) article.description = stripHtml(body);
  else if (str(description)) article.description = description as string;
  const imageUrl = isObject(node.media) ? str(node.media.url) : undefined;
  if (imageUrl) article.imageUrl = imageUrl;
  const category = isObject(node.category) ? str(node.category.title) : undefined;
  if (category) article.category = category;
  return article;
}

/** Finds `{ title, publishedAt, action: { payload: { url } } }` article cards. */
export function parseArticleCards(nextData: unknown, origin: string): ParsedArticle[] {
  const out: ParsedArticle[] = [];
  const seen = new Set<string>();
  for (const node of walkObjects(nextData)) {
    const article = toArticle(node, origin);
    if (!article || seen.has(article.url)) continue;
    seen.add(article.url);
    out.push(article);
  }
  return out.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
