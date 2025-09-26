export interface Env {
  FLAGS: KVNamespace;
  UE_UPSTREAM: string;
}

const CSP = "default-src 'self'; connect-src 'self' wss: https:; img-src 'self' data: blob: https:; media-src 'self' blob: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'self';";

function withSecurityHeaders(response: Response, extra: Record<string, string> = {}): Response {
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", CSP);
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  for (const [key, value] of Object.entries(extra)) {
    headers.set(key, value);
  }
  return new Response(response.body, { status: response.status, headers });
}

async function handleFlags(env: Env): Promise<Response> {
  const keys = ["engine.mode", "codec", "bitrate", "resolution", "region"] as const;
  const out: Record<typeof keys[number], string | null> = {
    "engine.mode": null,
    codec: null,
    bitrate: null,
    resolution: null,
    region: null,
  };

  await Promise.all(
    keys.map(async (key) => {
      out[key] = await env.FLAGS.get(key);
    }),
  );

  return new Response(JSON.stringify(out, null, 2), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function mapToUpstream(url: URL, upstream: URL): URL {
  const mapped = new URL(url.toString());
  mapped.protocol = upstream.protocol;
  mapped.hostname = upstream.hostname;
  mapped.port = upstream.port;
  mapped.username = upstream.username;
  mapped.password = upstream.password;
  mapped.pathname = url.pathname.replace(/^\/dev\/ue/, "/");
  return mapped;
}

async function proxyUE(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const upstream = new URL(env.UE_UPSTREAM);
  const mapped = mapToUpstream(url, upstream);

  if (url.search) {
    mapped.search = url.search;
  }

  const init: RequestInit = {
    method: request.method,
    headers: new Headers(request.headers),
    body: request.body,
    redirect: "follow",
  };

  const upstreamResponse = await fetch(mapped.toString(), init);
  const headers = new Headers(upstreamResponse.headers);
  headers.delete("X-Frame-Options");
  headers.set("Content-Security-Policy", CSP);

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers,
  });
}

const handler: ExportedHandler<Env> = {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/flags") {
      const response = await handleFlags(env);
      return withSecurityHeaders(response, { "cache-control": "no-store" });
    }

    if (url.pathname.startsWith("/dev/ue")) {
      return proxyUE(request, env);
    }

    return withSecurityHeaders(new Response("Not Found", { status: 404 }));
  },
};

export default handler;
