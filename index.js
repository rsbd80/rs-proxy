export default {
  async fetch(request) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Origin, Accept",
      "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (!["GET", "HEAD"].includes(request.method)) {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders
      });
    }

    const incoming = new URL(request.url);
    const target = incoming.searchParams.get("u");

    if (!target) {
      return new Response("Missing URL parameter: u", {
        status: 400,
        headers: corsHeaders
      });
    }

    let targetUrl;

    try {
      targetUrl = new URL(target);
    } catch {
      return new Response("Invalid URL", {
        status: 400,
        headers: corsHeaders
      });
    }

    if (!["http:", "https:"].includes(targetUrl.protocol)) {
      return new Response("Only HTTP/HTTPS allowed", {
        status: 403,
        headers: corsHeaders
      });
    }

    const hostname = targetUrl.hostname.toLowerCase();

    // Block local/private destinations
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("172.16.") ||
      hostname.startsWith("172.17.") ||
      hostname.startsWith("172.18.") ||
      hostname.startsWith("172.19.") ||
      hostname.startsWith("172.2") ||
      hostname.startsWith("172.30.") ||
      hostname.startsWith("172.31.")
    ) {
      return new Response("Blocked destination", {
        status: 403,
        headers: corsHeaders
      });
    }

    const headers = new Headers();

    headers.set(
      "User-Agent",
      request.headers.get("User-Agent") ||
        "Mozilla/5.0"
    );

    headers.set("Accept", "*/*");

    const range = request.headers.get("Range");
    if (range) headers.set("Range", range);

    const referer = request.headers.get("Referer");
    if (referer) headers.set("Referer", referer);

    try {
      const response = await fetch(targetUrl.toString(), {
        method: request.method,
        headers,
        redirect: "follow"
      });

      const outputHeaders = new Headers(corsHeaders);

      [
        "Content-Type",
        "Content-Length",
        "Content-Range",
        "Accept-Ranges",
        "Cache-Control",
        "Last-Modified",
        "ETag"
      ].forEach(name => {
        const value = response.headers.get(name);
        if (value) outputHeaders.set(name, value);
      });

      return new Response(
        request.method === "HEAD" ? null : response.body,
        {
          status: response.status,
          statusText: response.statusText,
          headers: outputHeaders
        }
      );

    } catch (error) {
      return new Response("Proxy Error: " + error.message, {
        status: 502,
        headers: corsHeaders
      });
    }
  }
};
