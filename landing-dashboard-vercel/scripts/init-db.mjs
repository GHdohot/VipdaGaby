import { existsSync } from 'node:fs';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const { getDatabase } = await import('../backend/database.js');
const db = getDatabase();
if (!db) throw new Error('Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.');
await db.initialize();
console.log('Esquema inicial criado. Nenhum visitante ou pagamento foi importado.');
