// 一次性工具：生成本地 .env（随机演示密码）。生成后可删除。
const fs = require('node:fs');
const chars = 'abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const gen = () => Array.from({ length: 24 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
const env = `DEMO_ADMIN_EMAIL=admin@oss-blog.local
DEMO_ADMIN_NAME=瑞维
DEMO_ADMIN_PASSWORD=${gen()}
DEMO_MEMBER_EMAIL=member@oss-blog.local
DEMO_MEMBER_NAME=小明
DEMO_MEMBER_PASSWORD=${gen()}
DEMO_MEMBER2_EMAIL=reader@oss-blog.local
DEMO_MEMBER2_NAME=读者乙
DEMO_MEMBER2_PASSWORD=${gen()}
`;
fs.writeFileSync('.env', env, 'utf8');
console.log('.env generated');
