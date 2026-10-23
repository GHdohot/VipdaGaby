import * as publicConfig from './functions/api/config.js';
import * as location from './functions/api/location.js';
import * as events from './functions/api/events.js';
import * as login from './functions/api/admin/login.js';
import * as logout from './functions/api/admin/logout.js';
import * as session from './functions/api/admin/session.js';
import * as settings from './functions/api/admin/settings.js';
import * as dashboard from './functions/api/admin/dashboard.js';
import * as sessions from './functions/api/admin/sessions.js';
import * as adminEvents from './functions/api/admin/events.js';
import { onRequest as protectAdmin } from './functions/api/admin/_middleware.js';
import { getDatabase } from './database.js';

const routes = { '/api/config': publicConfig, '/api/location': location, '/api/events': events,
  '/api/admin/login': login, '/api/admin/logout': logout, '/api/admin/session': session,
  '/api/admin/settings': settings, '/api/admin/dashboard': dashboard,
  '/api/admin/sessions': sessions, '/api/admin/events': adminEvents };

export function siteOrigin() {
  if (process.env.SITE_ORIGIN) return new URL(process.env.SITE_ORIGIN).origin;
  const vercelHost = process.env.VERCEL_ENV === 'preview'
    ? process.env.VERCEL_URL
    : process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelHost) return new URL('https://' + vercelHost).origin;
  if (process.env.VERCEL) throw new Error('Configure SITE_ORIGIN');
  return 'http://localhost:' + (process.env.PORT || '3000');
}

export async function dispatch(request) {
  const pathname = new URL(request.url).pathname;
  const module = routes[pathname];
  if (!module) return Response.json({ error: 'Endpoint não encontrado.' }, { status: 404 });
  const method = request.method === 'HEAD' ? 'GET' : request.method;
  const handler = module[{ GET: 'onRequestGet', POST: 'onRequestPost' }[method]];
  if (!handler) return Response.json({ error: 'Método não permitido.' }, { status: 405, headers: { Allow: Object.keys(module).map(key => key.replace('onRequest', '').toUpperCase()).join(', ') } });
  const env = {
    DB: getDatabase(), ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    SITE_ORIGIN: siteOrigin(), OPERATION_ID: process.env.OPERATION_ID || 'primary',
    ENVIRONMENT: process.env.VERCEL || process.env.NODE_ENV === 'production' ? 'production' : 'development'
  };
  const context = { request, env, data: {} };
  context.next = () => handler(context);
  return pathname.startsWith('/api/admin/') ? protectAdmin(context) : handler(context);
}
