export type PageSnapshot = {
  url: string;
  title: string;
  text: string;
  links: { label: string; url: string }[];
};

function decode(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(value: string, base: string) {
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

export async function fetchPublicPage(input: string): Promise<PageSnapshot> {
  const parsed = new URL(input);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error("Only public http(s) pages are supported.");

  const response = await fetch(parsed, {
    headers: { "User-Agent": "ManusResearch/1.0 (+public-page-reader)" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Page returned HTTP ${response.status}.`);
  const html = (await response.text()).slice(0, 2_000_000);
  const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "Untitled page");
  const text = decode(html).slice(0, 30_000);
  const links: PageSnapshot["links"] = [];
  const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(linkPattern)) {
    const url = normalizeUrl(match[1] ?? "", parsed.toString());
    const label = decode(match[2] ?? "");
    if (!url || !label || links.some((link) => link.url === url)) continue;
    links.push({ label: label.slice(0, 120), url });
    if (links.length >= 20) break;
  }
  return { url: parsed.toString(), title, text, links };
}
