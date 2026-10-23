import { currentOperation, loadSettings } from "../_lib/operations.js";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
  });
}

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ error: "Configuração indisponível." }, 503);
  try {
    const operationId = currentOperation(env);
    const routes = await loadSettings(env.DB, operationId);
    return json({ operationId, routes });
  } catch (error) {
    console.error(JSON.stringify({ message: "public_config_failed", error: String(error) }));
    return json({ error: "Não foi possível carregar as rotas." }, 503);
  }
}
