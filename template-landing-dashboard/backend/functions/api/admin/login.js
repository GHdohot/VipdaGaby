import { createSession, json, requireSameOrigin } from "../../_lib/admin-auth.js";
import { readJson } from "../../_lib/read-json.js";

export async function onRequestPost({ request, env }) {
  if (!requireSameOrigin(request, env)) return json({ error: "Origem inválida." }, 403);
  if (typeof env.ADMIN_PASSWORD !== "string" || env.ADMIN_PASSWORD.length < 32) {
    return json({ error: "O acesso administrativo ainda não foi configurado." }, 503);
  }

  let body;
  try {
    body = await readJson(request, 1024);
  } catch {
    return json({ error: "Credenciais inválidas." }, 400);
  }
  const password = typeof body?.password === "string" ? body.password.slice(0, 256) : "";
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(password)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(env.ADMIN_PASSWORD))
  ]);
  if (!crypto.subtle.timingSafeEqual(providedHash, expectedHash)) {
    return json({ error: "Senha incorreta." }, 401);
  }

  const session = await createSession(env.ADMIN_PASSWORD, new URL(request.url).protocol === "https:");
  return json({ csrf: session.csrf }, 200, { "Set-Cookie": session.cookie });
}
