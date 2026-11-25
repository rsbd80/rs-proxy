const ALLOWED_ORIGINS = [
  "https://rslivego.pages.dev",
  "https://rslivetv.pages.dev"
];

const ALLOWED_TYPES = [
  "application/json",
  "application/vnd.apple.mpegurl",
  "audio/mpegurl",
  "text/plain"
];

export async function onRequest(context) {
  const { request } = context;
  const requestUrl = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request)
    });
  }

  if (request.method !== "GET") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders(request)
    });
  }

  const targetUrl = requestUrl.searchParams.get("url");

  if (!targetUrl) {
    return new Response("Missing url parameter", {
      status: 400,
      headers: corsHeaders(request)
    });
  }

  let target;

  try {
    target = new URL(targetUrl);
  } catch {
    return new Response("Invalid URL", {
      status: 400,
      headers: corsHeaders(request)
    });
  }

  // শুধু HTTPS URL অনুমোদিত
  if (target.protocol !== "https:") {
    return new Response("HTTPS required", {
      status: 403,
      headers: corsHeaders(request)
    });
  }

  // লোকাল ও প্রাইভেট নেটওয়ার্ক ব্লক
  const host = target.hostname.toLowerCase();

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("169.254.")
  ) {
    return new Response("Host not allowed", {
      status: 403,
      headers: corsHeaders(request)
    });
  }

  try {
    const response = await fetch(target.toString(), {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "*/*",
        "Referer": target.origin + "/",
        "Origin": target.origin
      },
      signal: AbortSignal.timeout(20000)
    });

    const headers = corsHeaders(request);

    headers.set(
      "Content-Type",
      response.headers.get("Content-Type") ||
      "application/octet-stream"
    );

    headers.set("Cache-Control", "no-store");

    const contentLength = response.headers.get("Content-Length");

    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    return new Response(response.body, {
      status: response.status,
      headers
    });

  } catch (error) {
    return new Response(
      "Proxy Error: " + error.message,
      {
        status: 502,
        headers: corsHeaders(request)
      }
    );
  }
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";

  const headers = new Headers();

  if (ALLOWED_ORIGINS.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }

  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Max-Age", "86400");

  return headers;
      }
