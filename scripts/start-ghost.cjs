#!/usr/bin/env node
/**
 * Ghost 一键启动脚本（Windows）
 * 用法：node scripts/start-ghost.cjs
 * 说明：以分离进程启动 Ghost（development 模式），日志写入 runtime/ghost-out.log
 */
const { spawn } = require('node:child_process');
const { existsSync, writeFileSync } = require('node:fs');
const { join, dirname } = require('node:path');

const ROOT = join(dirname(__filename), '..');
const RUNTIME = join(ROOT, 'runtime');

if (!existsSync(join(RUNTIME, 'current'))) {
  console.error('未找到 runtime/current，请先执行安装步骤（见 README）。');
  process.exit(1);
}

const nodeBin = process.execPath;
const child = spawn(nodeBin, ['current\\index.js'], {
  cwd: RUNTIME,
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});

child.stdout.on('data', d => process.stdout.write(d));
child.stderr.on('data', d => process.stderr.write(d));

writeFileSync(join(RUNTIME, '.ghost-pid'), String(child.pid));
child.unref();
console.log(`Ghost 启动中（PID ${child.pid}），端口 2368。日志见 runtime/ghost-out.log`);
