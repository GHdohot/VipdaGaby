import { createClient } from '@libsql/client';
import schema from './schema.js';

let cached;
export function getDatabase() {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) return null;
  if (process.env.VERCEL && /^file:/i.test(url)) throw new Error('Use a remote persistent database on Vercel');
  if (cached) return cached;
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined, intMode: 'number' });
  let ready;
  async function initialize() {
    if (!ready) {
      const statements = schema.split(';').map(sql => sql.trim()).filter(Boolean);
      ready = client.batch(statements, 'write').catch(error => { ready = undefined; throw error; });
    }
    await ready;
  }
  function prepare(sql, args = []) {
    async function execute() { await initialize(); return client.execute({ sql, args }); }
    return {
      bind(...values) { return prepare(sql, values.map(value => value === undefined ? null : value)); },
      async all() {
        const result = await execute();
        return { results: result.rows.map(row => Object.fromEntries(result.columns.map((key, index) => [key, row[index]]))) };
      },
      async first(column) { const row = (await this.all()).results[0] || null; return column && row ? row[column] : row; },
      async run() { const result = await execute(); return { success: true, meta: { changes: result.rowsAffected } }; }
    };
  }
  cached = { prepare, initialize };
  return cached;
}
