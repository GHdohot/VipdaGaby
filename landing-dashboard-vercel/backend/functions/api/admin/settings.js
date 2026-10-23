import { OPERATION_IDS, defaultSettings, sanitizeSettings, validOperation } from "../../_lib/operations.js";
import { json } from "../../_lib/admin-auth.js";
import { readJson } from "../../_lib/read-json.js";

async function readSettings(db, operationId) {
  const row = await db.prepare("SELECT settings_json, updated_at FROM operation_settings WHERE operation_id = ?")
    .bind(operationId).first();
  if (!row) return { routes: defaultSettings(operationId), updatedAt: null };
  try {
    return { routes: sanitizeSettings(JSON.parse(row.settings_json), operationId), updatedAt: row.updated_at };
  } catch {
    return { routes: defaultSettings(operationId), updatedAt: row.updated_at };
  }
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: "Banco de dados indisponível." }, 503);
  const requested = new URL(request.url).searchParams.get("operation");
  const operationIds = requested === "all" ? OPERATION_IDS : [validOperation(requested) || "primary"];
  try {
    const records = await Promise.all(operationIds.map(async (operationId) => [operationId, await readSettings(env.DB, operationId)]));
    return json(Object.fromEntries(records));
  } catch (error) {
    console.error(JSON.stringify({ message: "admin_settings_read_failed", error: String(error) }));
    return json({ error: "Não foi possível carregar as rotas." }, 503);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "Banco de dados indisponível." }, 503);
  let body;
  try { body = await readJson(request, 16 * 1024); } catch { return json({ error: "Configuração inválida." }, 400); }
  const operationId = validOperation(body?.operationId);
  if (!operationId || !body.routes || typeof body.routes !== "object") return json({ error: "Operação ou rotas inválidas." }, 400);
  const routes = sanitizeSettings(body.routes, operationId);
  const now = Math.floor(Date.now() / 1000);
  try {
    await env.DB.prepare(`INSERT INTO operation_settings (operation_id, settings_json, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(operation_id) DO UPDATE SET settings_json = excluded.settings_json, updated_at = excluded.updated_at`)
      .bind(operationId, JSON.stringify(routes), now).run();
    return json({ operationId, routes, updatedAt: now });
  } catch (error) {
    console.error(JSON.stringify({ message: "admin_settings_save_failed", operationId, error: String(error) }));
    return json({ error: "Não foi possível salvar as rotas." }, 503);
  }
}
