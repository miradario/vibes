const headers = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

// Email clients can strip custom-scheme hrefs. Use HTTPS in the email, then
// redirect to our fixed app scheme without redeeming the one-time credential.
// Link scanners and HEAD requests must never verify an email or create a session.
export function openEmailVerification(req: Request): Response {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { ...headers, Allow: "GET, HEAD" },
    });
  }
  const token = new URL(req.url).searchParams.get("token_hash");
  if (!token || !/^[A-Za-z0-9_-]{20,1024}$/.test(token)) {
    return new Response(req.method === "HEAD" ? null : "El enlace no es válido. Pedí un nuevo correo desde Editar perfil en Vibes.", {
      status: 400,
      headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const destination = new URL("com.gurudevelopers.vibes://verify-email");
  destination.searchParams.set("token_hash", token);
  destination.searchParams.set("type", "email");
  return new Response(null, {
    status: 302,
    headers: { ...headers, Location: destination.toString() },
  });
}
