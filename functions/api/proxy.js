
export default {
  async fetch(request) {
    const cors = {
      "Access-Control-Allow-Origin": "https://rs-tv-player.pages.dev",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type",
      "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
      "Cache-Control": "no-store"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors
      });
    }

    if (request.method !== "GET") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: cors
      });
    }

    const incoming = new URL(request.url);
    const targetUrl = incoming.searchParams.get("u");

    if (!targetUrl) {
      return new Response("Missing u parameter", {
        status: 400,
        headers: cors
      });
    }

    let target;

    try {
      target = new URL(targetUrl);
    } catch {
      return new Response("Invalid URL", {
        status: 400,
        headers: cors
      });
    }

    if (
      target.protocol !== "https:" ||
      target.hostname !== "prod-linear-media.toffeelive.com"
    ) {
      return new Response("Host not allowed", {
        status: 403,
        headers: cors
      });
    }

    try {
      const upstream = await fetch(target.href, {
        method: "GET",
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "*/*",
          "Referer": target.origin + "/",
          "Origin": target.origin
        }
      });

      const responseHeaders = new Headers(cors);

      responseHeaders.set(
        "Content-Type",
        upstream.headers.get("Content-Type") ||
        "application/vnd.apple.mpegurl"
      );

      const range = upstream.headers.get("Content-Range");
      const length = upstream.headers.get("Content-Length");

      if (range) responseHeaders.set("Content-Range", range);
      if (length) responseHeaders.set("Content-Length", length);

      return new Response(upstream.body, {
        status: upstream.status,
        headers: responseHeaders
      });

    } catch (error) {
      return new Response("Proxy Error: " + error.message, {
        status: 502,
        headers: cors
      });
    }
  }
};
