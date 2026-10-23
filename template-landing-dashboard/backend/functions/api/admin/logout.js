import { clearSessionCookie, json } from "../../_lib/admin-auth.js";

export async function onRequestPost({ request }) {
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie(new URL(request.url).protocol === "https:") });
}
