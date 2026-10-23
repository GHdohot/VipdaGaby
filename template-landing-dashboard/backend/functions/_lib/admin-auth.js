const COOKIE_NAME = "landing_template_admin";
const SESSION_SECONDS = 8 * 60 * 60;
const encoder = new TextEncoder();

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function getCookie(request, name) {
  const cookies = request.headers.get("Cookie") || "";
  for (const part of cookies.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return "";
}

async function secretKey(secret) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function verifyPassword(provided, expected) {
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected))
  ]);
  return crypto.subtle.timingSafeEqual(providedHash, expectedHash);
}

export async function createSession(secret, secure = true) {
  const csrfBytes = crypto.getRandomValues(new Uint8Array(24));
  const csrf = bytesToBase64Url(csrfBytes);
  const payload = bytesToBase64Url(encoder.encode(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
    csrf
  })));
  const key = await secretKey(secret);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
  const secureFlag = secure ? "; Secure" : "";
  return { csrf, cookie: `${COOKIE_NAME}=${payload}.${bytesToBase64Url(signature)}; Path=/api/admin; Max-Age=${SESSION_SECONDS}; HttpOnly${secureFlag}; SameSite=Strict` };
}

export async function authenticate(request, secret) {
  if (typeof secret !== "string" || secret.length < 32) return null;
  const token = getCookie(request, COOKIE_NAME);
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  try {
    const key = await secretKey(secret);
    const valid = await crypto.subtle.verify("HMAC", key, base64UrlToBytes(signature), encoder.encode(payload));
    if (!valid) return null;
    const session = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
    if (!Number.isInteger(session.exp) || session.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof session.csrf !== "string" || session.csrf.length < 20) return null;
    return session;
  } catch {
    return null;
  }
}

export async function verifyCsrf(provided, expected) {
  if (typeof provided !== "string" || typeof expected !== "string") return false;
  return verifyPassword(provided, expected);
}

export function requireSameOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  try {
    const originUrl = new URL(origin);
    if (originUrl.origin === new URL(env.SITE_ORIGIN).origin) return true;
    return (env.ENVIRONMENT === "development" || env.CF_PAGES_BRANCH === "local") &&
      /^https?:$/.test(originUrl.protocol) && ["localhost", "127.0.0.1"].includes(originUrl.hostname);
  } catch {
    return false;
  }
}

export function clearSessionCookie(secure = true) {
  return `${COOKIE_NAME}=; Path=/api/admin; Max-Age=0; HttpOnly${secure ? "; Secure" : ""}; SameSite=Strict`;
}

export function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers }
  });
}
