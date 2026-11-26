// 激活主题：oss-blog-theme
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(readFileSync(join(ROOT, '.env'), 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const BASE = 'http://localhost:2368';

const sess = await fetch(BASE + '/ghost/api/admin/session/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: BASE },
  body: JSON.stringify({ username: env.DEMO_ADMIN_EMAIL, password: env.DEMO_ADMIN_PASSWORD }),
});
const cookie = (sess.headers.get('set-cookie') || '').split(';')[0];

const { settings } = await fetch(BASE + '/ghost/api/admin/settings/', { headers: { Cookie: cookie } }).then(r => r.json());
const patch = settings.map(s => (s.key === 'active_theme' ? { ...s, value: 'oss-blog-theme' } : s));
const res = await fetch(BASE + '/ghost/api/admin/settings/', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', 'Accept-Version': 'v5.0', Cookie: cookie },
  body: JSON.stringify({ settings: patch }),
});
const d = await res.json();
const active = d.settings?.find(s => s.key === 'active_theme');
console.log('active_theme =', active?.value, '| status', res.status);
