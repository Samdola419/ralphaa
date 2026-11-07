/**
 * Built-in tools for the agent.
 * Search uses a simple public endpoint (or you can replace with Firecrawl).
 * Code runs in a sandboxed iframe.
 */

export function createSearchTool() {
  return {
    name: "search",
    description: "Search the web for current information. Args: { query: string }",
    async run({ query }) {
      if (!query) throw new Error("query required");
      // Free, no-key option. Replace with Firecrawl if preferred.
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        const results = (data.RelatedTopics || [])
          .slice(0, 5)
          .map((t) => t.Text || t.FirstURL)
          .filter(Boolean);
        return results.length ? results.join("\n") : "No results found.";
      } catch {
        return "Search temporarily unavailable.";
      }
    },
  };
}

export function createFetchTool() {
  return {
    name: "fetch_page",
    description: "Fetch and extract readable text from a URL. Args: { url: string }",
    async run({ url }) {
      if (!url) throw new Error("url required");
      const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxy);
      const data = await res.json();
      const html = data.contents || "";
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 8000);
      return text || "Could not extract text.";
    },
  };
}

export function createCodeTool() {
  return {
    name: "run_code",
    description: "Run JavaScript in a safe sandbox and return the result. Args: { code: string }",
    async run({ code }) {
      if (!code) throw new Error("code required");
      return runInSandbox(code);
    },
  };
}

function runInSandbox(code) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.sandbox = "allow-scripts";
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Code timed out"));
    }, 5000);

    function cleanup() {
      clearTimeout(timeout);
      iframe.remove();
    }

    iframe.onload = () => {
      try {
        const result = iframe.contentWindow.eval(code);
        cleanup();
        resolve(String(result ?? "undefined"));
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    iframe.srcdoc = `<!DOCTYPE html><html><body><script>
      try { parent.postMessage({ ok: true, result: String(eval(${JSON.stringify(code)})) }, "*"); }
      catch (e) { parent.postMessage({ ok: false, error: e.message }, "*"); }
    <\/script></body></html>`;

    const handler = (e) => {
      if (e.source !== iframe.contentWindow) return;
      window.removeEventListener("message", handler);
      cleanup();
      if (e.data.ok) resolve(e.data.result);
      else reject(new Error(e.data.error));
    };
    window.addEventListener("message", handler);
  });
}
