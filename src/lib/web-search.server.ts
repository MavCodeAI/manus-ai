export type SearchResult = { title: string; url: string; snippet: string };

function decode(html: string) {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export async function searchWeb(query: string): Promise<SearchResult[]> {
  const res = await fetch("https://html.duckduckgo.com/html/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
    },
    body: new URLSearchParams({ q: query }).toString(),
  });

  if (!res.ok) return [];
  const html = await res.text();

  const results: SearchResult[] = [];
  const blocks = html.split('class="result results_links');
  for (const block of blocks.slice(1)) {
    const linkMatch = block.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
    if (!linkMatch) continue;
    let url = decode(linkMatch[1] ?? "");
    const uddg = url.match(/uddg=([^&]+)/);
    if (uddg) url = decodeURIComponent(uddg[1] ?? "");
    results.push({
      title: decode(linkMatch[2] ?? ""),
      url,
      snippet: snippetMatch ? decode(snippetMatch[1] ?? "") : "",
    });
    if (results.length >= 6) break;
  }
  return results;
}