// 自主功能配套：创建 Content API 集成，并把公开只读 key 写入主题自定义设置
// （Custom theme settings → 模板中 {{@custom.content_api_key}} 可访问）
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

// 1. 查找或创建 "Blog Search" 集成（模型字段为 name）
const { integrations = [] } = await fetch(BASE + '/ghost/api/admin/integrations/?limit=all', { headers: { Cookie: cookie } }).then(r => r.json());
let integ = integrations.find(i => i.name === 'Blog Search');
if (!integ) {
  await fetch(BASE + '/ghost/api/admin/integrations/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept-Version': 'v5.0', Cookie: cookie },
    body: JSON.stringify({ integrations: [{ name: 'Blog Search', api_keys: [{ type: 'content' }] }] }),
  });
  console.log('✓ 已创建集成 Blog Search');
  // 重新读取列表获取集成 id
  const list = await fetch(BASE + '/ghost/api/admin/integrations/?limit=all', { headers: { Cookie: cookie } }).then(r => r.json());
  integ = (list.integrations || []).find(i => i.name === 'Blog Search');
} else {
  console.log('· 集成已存在，复用');
}
if (!integ?.id) { console.error('未找到集成对象'); process.exit(1); }
// 列表接口不含 secret，按 id 单取（include=api_keys 带出密钥）
integ = await fetch(BASE + `/ghost/api/admin/integrations/${integ.id}/?include=api_keys`, { headers: { Cookie: cookie } }).then(r => r.json());
integ = integ.integrations?.[0] || integ.integration;
const contentKey = integ.api_keys?.find(k => k.type === 'content')?.secret;
if (!contentKey) { console.error('未获取到 content key'); process.exit(1); }
console.log('content key 已获取（公开只读，前 8 位）:', contentKey.slice(0, 8) + '...');

// 2. 写入主题自定义设置
const res = await fetch(BASE + '/ghost/api/admin/custom_theme_settings/', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', 'Accept-Version': 'v5.0', Cookie: cookie },
  body: JSON.stringify({ custom_theme_settings: [{ key: 'content_api_key', value: contentKey }] }),
});
console.log('custom_theme_settings 更新:', res.status);
if (!res.ok) {
  const d = await res.json().catch(() => null);
  console.error(JSON.stringify(d, null, 2));
}
