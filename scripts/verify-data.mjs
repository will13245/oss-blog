// 验证演示数据：标签数、文章数、会员数
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(ROOT, '.env');
const env = Object.fromEntries(readFileSync(envPath, 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));

const BASE = 'http://localhost:2368';
// 1. session 登录
const sess = await fetch(BASE + '/ghost/api/admin/session/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: BASE },
  body: JSON.stringify({ username: env.DEMO_ADMIN_EMAIL, password: env.DEMO_ADMIN_PASSWORD }),
});
const cookie = (sess.headers.get('set-cookie') || '').split(';')[0];

const [posts, tags, members] = await Promise.all([
  fetch(BASE + '/ghost/api/admin/posts/?limit=50', { headers: { Cookie: cookie } }).then(r => r.json()),
  fetch(BASE + '/ghost/api/admin/tags/?limit=50', { headers: { Cookie: cookie } }).then(r => r.json()),
  fetch(BASE + '/ghost/api/admin/members/?limit=50', { headers: { Cookie: cookie } }).then(r => r.json()),
]);
console.log('文章数:', posts.meta?.pagination?.total ?? posts.posts?.length);
posts.posts?.forEach(p => console.log(' -', p.title, '| tags:', (p.tags || []).map(t => t.name).join('/')));
console.log('标签:', tags.tags?.map(t => t.name).join(', '));
console.log('会员数:', members.meta?.pagination?.total ?? members.members?.length, members.members?.map(m => m.email).join(', '));
