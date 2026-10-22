// Explicit developer setup; refuses hosted credentials and never prints keys.
import fs from 'node:fs/promises';
const root = new URL('../../../', import.meta.url);
const status = JSON.parse(
  await fs.readFile(new URL('work/catalog-security/local-status.json', root), 'utf8'),
);
if (new URL(status.API_URL).hostname !== '127.0.0.1')
  throw new Error('Local setup refuses hosted URLs');
const values = {
  VITE_SUPABASE_URL: status.API_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: status.ANON_KEY,
  SUPABASE_URL: status.API_URL,
  SUPABASE_PUBLISHABLE_KEY: status.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
};
await fs.writeFile(
  new URL('../.env.local', import.meta.url),
  Object.entries(values)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n') + '\n',
  { mode: 0o600 },
);
console.log('Local-only admin environment configured; no hosted data access.');
