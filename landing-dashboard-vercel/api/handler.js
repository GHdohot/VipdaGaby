import { dispatch, siteOrigin } from '../backend/router.js';

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, siteOrigin());
    const route = req.query?.__path || url.searchParams.get('__path');
    if (route) url.pathname = '/api/' + (Array.isArray(route) ? route.join('/') : route);
    url.searchParams.delete('__path');
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    }
    let body;
    if (!['GET', 'HEAD'].includes(req.method)) {
      if (req.body !== undefined) body = typeof req.body === 'string' || Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body);
      else {
        const chunks = []; let bytes = 0;
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > 20000) { res.statusCode = 413; res.end(); return; }
          chunks.push(chunk);
        }
        body = Buffer.concat(chunks);
      }
      if (Buffer.byteLength(body || '') > 20000) { res.statusCode = 413; res.end(); return; }
    }
    const request = new Request(url, { method: req.method, headers, ...(body?.length ? { body } : {}) });
    const response = await dispatch(request);
    res.statusCode = response.status;
    for (const [key, value] of response.headers) res.setHeader(key, value);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(req.method === 'HEAD' ? undefined : Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(JSON.stringify({ message: 'api_request_failed', code: error.code || 'configuration_or_database_error' }));
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: 'Serviço indisponível. Confira a configuração das variáveis e do banco.' }));
  }
}
