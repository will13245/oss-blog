// 删除 Ghost 默认的 "Coming soon" 演示文章
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

const { posts = [] } = await fetch(BASE + '/ghost/api/admin/posts/?filter=title:\'Coming soon\'', { headers: { Cookie: cookie } }).then(r => r.json());
for (const p of posts) {
  const res = await fetch(BASE + `/ghost/api/admin/posts/${p.id}/`, {
    method: 'DELETE',
    headers: { Cookie: cookie },
  });
  console.log('删除:', p.title, res.status);
}
console.log('done');
