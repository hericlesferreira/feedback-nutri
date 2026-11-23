import handler from "vinext/server/fetch-handler";

const worker = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const response = await handler.fetch(request, env, ctx);
    if (response.status === 101) return response;

    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (new URL(request.url).protocol === "https:") {
      headers.set("Strict-Transport-Security", "max-age=86400");
    }
    if (headers.get("Content-Type")?.includes("text/html")) {
      headers.set("Content-Security-Policy", "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'");
      headers.set("Content-Security-Policy-Report-Only", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://pzjagveajiyjlloawiiu.supabase.co");
    }
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};

export default worker;
