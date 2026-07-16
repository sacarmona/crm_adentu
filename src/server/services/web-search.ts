import { env } from "@/lib/env";

const TAVILY_URL = "https://api.tavily.com/search";

export function isTavilyConfigured() {
  return Boolean(env.TAVILY_API_KEY);
}

export async function searchCompanyContext(
  companyName: string,
  industry?: string | null,
): Promise<string | null> {
  if (!env.TAVILY_API_KEY) return null;

  const query = [companyName, "empresa", industry ?? "", "Chile"]
    .filter(Boolean)
    .join(" ")
    .trim();

  try {
    const response = await fetch(TAVILY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: env.TAVILY_API_KEY,
        query,
        search_depth: "basic",
        max_results: 3,
        include_answer: true,
        include_raw_content: false,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      answer?: string;
      results?: { url: string; content: string; title: string }[];
    };

    const parts: string[] = [];
    if (data.answer?.trim()) parts.push(data.answer.trim());
    for (const result of (data.results ?? []).slice(0, 3)) {
      if (result.content?.trim()) {
        parts.push(`[${result.title}] ${result.content.trim()}`);
      }
    }

    return parts.length > 0 ? parts.join("\n\n") : null;
  } catch {
    return null;
  }
}
