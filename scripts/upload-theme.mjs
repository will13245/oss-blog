// 上传并激活主题 zip（zip 根必须是 package.json）
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

// 1. 上传
const form = new FormData();
form.append('file', new Blob([readFileSync(join(ROOT, 'oss-blog-theme.zip'))], { type: 'application/zip' }), 'oss-blog-theme.zip');
const up = await fetch(BASE + '/ghost/api/admin/themes/upload/', {
  method: 'POST',
  headers: { 'Accept-Version': 'v5.0', Origin: BASE, Cookie: cookie },
  body: form,
});
const upBody = await up.json().catch(() => null);
console.log('upload status:', up.status, upBody?.themes?.[0]?.name || JSON.stringify(upBody?.errors?.[0] || ''));
if (!up.ok) process.exit(1);

// 2. 激活（Ghost 5.x 路由为 PUT /themes/:name/activate/）
const act = await fetch(BASE + '/ghost/api/admin/themes/oss-blog-theme/activate/', {
  method: 'PUT',
  headers: { Origin: BASE, Cookie: cookie },
});
const actBody = await act.json().catch(() => null);
console.log('activate status:', act.status, actBody?.themes?.[0]?.name || JSON.stringify(actBody?.errors?.[0] || ''));
