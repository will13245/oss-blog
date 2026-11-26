#!/usr/bin/env node
/**
 * 演示数据生成脚本（可重复执行，幂等跳过已完成步骤）
 *
 * 前置条件：Ghost 实例已启动（默认 http://localhost:2368）
 * 用法：
 *   1. 复制仓库根目录 .env.example 为 .env，填入演示密码
 *   2. node scripts/seed-demo.mjs
 *
 * 密码一律从环境变量/.env 注入，不得硬编码提交到仓库。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.GHOST_URL || 'http://localhost:2368';

// ---------- .env 读取 ----------
function loadEnv() {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) {
    console.error('缺少 .env 文件：请复制 .env.example 为 .env 并填写演示密码');
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith('#')) env[m[1]] = m[2];
  }
  return env;
}

// ---------- API 帮助函数 ----------
async function api(path, { method = 'GET', body, cookie, headers = {} } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept-Version': 'v5.0',
      Origin: BASE,
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get('set-cookie');
  let data = null;
  try { data = await res.json(); } catch { /* 空响应 */ }
  if (!res.ok) {
    const detail = data?.errors?.[0];
    throw new Error(`${method} ${path} -> ${res.status}: ${detail?.message || res.statusText}`);
  }
  return { res, data, setCookie };
}

// ---------- 主流程 ----------
const env = loadEnv();
const admin = {
  email: env.DEMO_ADMIN_EMAIL,
  name: env.DEMO_ADMIN_NAME || '瑞维',
  password: env.DEMO_ADMIN_PASSWORD,
  blogTitle: '瑞维的开源博客',
};
if (!admin.email || !admin.password) {
  console.error('.env 中缺少 DEMO_ADMIN_EMAIL / DEMO_ADMIN_PASSWORD');
  process.exit(1);
}

// 1. 管理员初始化（已 setup 时跳过）
try {
  await api('/ghost/api/admin/authentication/setup/', {
    method: 'POST',
    body: { setup: [admin] },
  });
  console.log('✓ 管理员账号已初始化:', admin.email);
} catch (e) {
  if (e.message.includes('403')) {
    console.log('· 管理员已存在，跳过 setup');
  } else throw e;
}

// 2. session 登录
let cookie;
{
  const { setCookie } = await api('/ghost/api/admin/session/', {
    method: 'POST',
    body: { username: admin.email, password: admin.password },
  });
  cookie = setCookie.split(';')[0];
  console.log('✓ 管理员 session 登录成功');
}

// 3. 标签（3 个）
const TAGS = [
  { name: '开源软件', slug: 'opensource', description: '开源项目阅读、选型与二次开发实践', accent_color: '#2563eb' },
  { name: 'Web 开发', slug: 'webdev', description: '前后端技术与工程化笔记', accent_color: '#0d9488' },
  { name: '学习笔记', slug: 'notes', description: '日常学习与思考记录', accent_color: '#d97706' },
];
for (const t of TAGS) {
  try {
    await api('/ghost/api/admin/tags/', { method: 'POST', cookie, body: { tags: [t] } });
    console.log('✓ 标签已创建:', t.name);
  } catch (e) {
    if (e.message.includes('422')) console.log('· 标签已存在，跳过:', t.name);
    else throw e;
  }
}

// 4. 文章（8 篇，覆盖演示与边界场景）
const POSTS = [
  {
    title: '为什么我选择 Ghost 作为个人博客的基线',
    tags: ['开源软件'],
    excerpt: '从许可证、技术栈和社区活跃度三个维度比较了 Ghost 与其他博客方案。',
    html: `<p>本次实验要求以成熟开源项目为基线做二次开发。我对比了 Ghost 与 RealWorld 规范实现，最终选择 Ghost。</p><h2 id="选型理由">选型理由</h2><ul><li><strong>MIT 许可证</strong>：商用与修改都友好</li><li><strong>完整会员体系</strong>：注册、评论、订阅开箱即用</li><li><strong>主题机制</strong>：Handlebars 模板，二次开发边界清晰</li></ul><p>结论：不重写认证、编辑器和数据库迁移，把时间花在主题扩展上。</p>`,
  },
  {
    title: '开源许可证速查：MIT、Apache-2.0 与 AGPL 的差别',
    tags: ['开源软件', '学习笔记'],
    excerpt: '复制代码之前先看许可证，这是二次开发的第一课。',
    html: `<p>给项目选许可证之前，先搞清楚三件事：能不能商用、要不要开源衍生代码、怎么署名。</p><pre><code class="language-text">MIT      → 最宽松，保留版权声明即可
Apache-2.0 → 需要保留 NOTICE，有专利授权
AGPL     → 网络服务也要开源，最严格</code></pre><p>Ghost 用 MIT，所以我们的博客可以自由修改主题并保留原版权声明。</p>`,
  },
  {
    title: 'Handlebars 主题模板从入门到上手：写一个自己的文章卡片',
    tags: ['Web 开发'],
    excerpt: 'Handlebars 的 helper、块表达式与 Ghost 主题目录结构。',
    html: `<p>Ghost 主题用 Handlebars 模板引擎。<code>{{#foreach}}</code> 遍历文章，<code>{{title}}</code> 输出标题。</p><pre><code class="language-handlebars">{{#foreach posts}}
  &lt;article class="post-card"&gt;
    &lt;h2&gt;{{title}}&lt;/h2&gt;
    &lt;p&gt;{{excerpt}}&lt;/p&gt;
  &lt;/article&gt;
{{/foreach}}</code></pre><p>主题只负责展示，数据通过 Content API 或模板上下文注入，这就是二次开发的边界。</p>`,
  },
  {
    title: '这是一篇为了测试而存在的超级无敌长标题文章，用来验证博客前台在处理特别长的中文标题时不会把文章卡片布局挤坏也不会出现横向滚动条或者文字溢出的问题',
    tags: ['学习笔记'],
    excerpt: '边界测试：超长标题。',
    html: `<p>这篇文章的唯一使命就是用超长标题验证布局的健壮性。如果卡片样式正确，标题会自动换行省略。</p>`,
  },
  {
    title: '无封面图的文章也要好看：纯文字排版的细节',
    tags: ['Web 开发', '学习笔记'],
    excerpt: '边界测试：文章没有封面图时卡片如何降级。',
    html: `<p>并不是每篇文章都需要大图。纯文字排版依赖行高、段间距和留白。</p><p>这张卡片刻意没有设置 feature image，用于验证主题的无图降级样式。</p>`,
  },
  {
    title: '用 Node.js 22 原生 fetch 写一个 Ghost Admin API 脚本',
    tags: ['Web 开发', '开源软件'],
    excerpt: '本文包含代码块与中文关键词，用于验证搜索与高亮功能。',
    html: `<p>Node 22 自带 fetch，不用装 axios 就能调 Ghost Admin API。</p><pre><code class="language-javascript">const res = await fetch('http://localhost:2368/ghost/api/admin/posts/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Accept-Version': 'v5.0' },
  body: JSON.stringify({ posts: [{ title: 'Hello Ghost', status: 'draft' }] }),
});</code></pre><p>中文关键词测试：内容 API、全文搜索、关键词高亮。这些词会被搜索用例命中。</p>`,
  },
  {
    title: 'SQLite 在本地开发中的正确打开方式',
    tags: ['学习笔记', 'Web 开发'],
    excerpt: '轻量、零配置，本地开发首选。重启后数据依然在。',
    html: `<p>SQLite 是本地开发的最佳默认值：单文件、零配置、事务完整。</p><p>Ghost 本地模式默认用 SQLite 存内容数据，数据库文件在 <code>content/data/ghost-local.db</code>。重启服务后文章和评论不会丢，这就是"数据持久"的含义。</p>`,
  },
  {
    title: '二次开发的三条纪律：不动核心、留痕、可回滚',
    tags: ['开源软件', 'Web 开发'],
    excerpt: 'Feature Branch、Issue 验收与 Git 证据链的实践总结。',
    html: `<p>给开源项目做二次开发时给自己立规矩：</p><ol><li>不修改上游核心代码，扩展只写在主题与伴随服务里</li><li>每个功能先开 Issue，写清楚验收条件</li><li>Feature Branch + Pull Request，合并前自我 Review</li></ol><p>这样升级 Ghost 版本时才不会出现"改了哪里都不知道"的灾难。</p>`,
  },
];
for (const [i, p] of POSTS.entries()) {
  try {
    await api('/ghost/api/admin/posts/', {
      method: 'POST',
      cookie,
      body: { posts: [{ ...p, status: 'published', published_at: new Date(Date.now() - (POSTS.length - i) * 86400000).toISOString() }] },
    });
    console.log('✓ 文章已发布:', p.title.slice(0, 24) + '...');
  } catch (e) {
    if (e.message.includes('422') && e.message.includes('slug')) console.log('· 文章已存在（slug 重复），跳过');
    else throw e;
  }
}

// 5. 会员（2 个普通会员）
const MEMBERS = [
  { email: env.DEMO_MEMBER_EMAIL, name: env.DEMO_MEMBER_NAME || '小明', note: '演示账号：普通会员 1' },
  { email: env.DEMO_MEMBER2_EMAIL, name: env.DEMO_MEMBER2_NAME || '读者乙', note: '演示账号：普通会员 2' },
];
for (const m of MEMBERS) {
  if (!m.email) { console.log('· .env 未配置该会员邮箱，跳过'); continue; }
  const { data } = await api(`/ghost/api/admin/members/?filter=email:'${m.email}'`, { cookie });
  if (data.members.length > 0) { console.log('· 会员已存在，跳过:', m.email); continue; }
  await api('/ghost/api/admin/members/', { method: 'POST', cookie, body: { members: [m] } });
  console.log('✓ 会员已创建:', m.email);
}

// 6. 会员功能与评论开关（Admin settings）
try {
  const { data } = await api('/ghost/api/admin/settings/', { cookie });
  const group = data.settings.reduce((acc, s) => ((acc[s.key] = s.value), acc), {});
  if (group.comments_enabled !== 'all' || group.members_signup_access !== 'all') {
    const patch = data.settings.map(s => {
      if (s.key === 'comments_enabled') return { ...s, value: 'all' };
      if (s.key === 'members_signup_access') return { ...s, value: 'all' };
      if (s.key === 'portal_button_style') return s;
      return s;
    });
    await api('/ghost/api/admin/settings/', { method: 'PUT', cookie, body: { settings: patch } });
    console.log('✓ 已开启会员注册与全部评论权限（comments_enabled=all）');
  } else {
    console.log('· 会员与评论设置已是开启状态');
  }
} catch (e) {
  console.warn('! settings 更新失败（可在管理端手动开启）:', e.message);
}

console.log('\n演示数据初始化完成。会员登录密码：会员通过门户 Magic Link 登录（development 模式下邮件写入 runtime/content/logs）。');
writeFileSync(join(ROOT, '.env'), readFileSync(join(ROOT, '.env')), { flag: 'w' });
