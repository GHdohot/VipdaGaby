import { authenticate, json, requireSameOrigin, verifyCsrf } from "../../_lib/admin-auth.js";

export async function onRequest(context) {
  if (new URL(context.request.url).pathname === "/api/admin/login") {
    return context.next();
  }

  const session = await authenticate(context.request, context.env.ADMIN_PASSWORD);
  if (!session) return json({ error: "Sessão administrativa necessária." }, 401);

  if (!(["GET", "HEAD", "OPTIONS"].includes(context.request.method))) {
    if (!requireSameOrigin(context.request, context.env)) return json({ error: "Origem inválida." }, 403);
    if (!await verifyCsrf(context.request.headers.get("X-Admin-CSRF"), session.csrf)) {
      return json({ error: "Validação de segurança inválida." }, 403);
    }
  }

  context.data.adminSession = session;
  return context.next();
}
