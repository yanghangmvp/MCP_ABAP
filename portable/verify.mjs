#!/usr/bin/env node
/**
 * mcp-abap-adt 绿色版 —— 自检脚本
 *
 * 不传 --sql：只验证 MCP server 能启动、工具集正确（不需要 SAP 可用）
 * 传 --sql  ：额外执行一次 SQL 查询，验证到 SAP 的端到端链路
 *
 * 用法：
 *   node verify.mjs --name=dev
 *   node verify.mjs --name=dev --sql="SELECT mandt, mtext FROM t000"
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.join(__dirname, 'bin', 'mcp-abap-adt.js');

const opts = {};
for (const a of process.argv.slice(2)) {
  const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
  if (m) opts[m[1]] = m[2] === undefined ? true : m[2];
}

const name = opts.name || 'mysystem';
const envPath = opts['env-path'] || path.join(__dirname, 'env', `${name}.env`);
const exposition = opts.exposition || 'readonly,high';

if (!fs.existsSync(envPath)) {
  console.error(`[错误] 找不到 env 文件：${envPath}\n       先跑：node install.mjs --name=${name} ...`);
  process.exit(1);
}

// 清掉本机代理变量：SAP 地址一般是内网直连，走 127.0.0.1 代理会 socket hang up
const childEnv = { ...process.env };
for (const k of Object.keys(childEnv)) {
  if (/^(https?|all|no)_proxy$/i.test(k)) delete childEnv[k];
}
childEnv.NO_PROXY = '*';
childEnv.no_proxy = '*';

const child = spawn(process.execPath, [BIN, `--env-path=${envPath}`, `--exposition=${exposition}`], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: childEnv,
});

let stdout = '';
const pending = new Map();
let nextId = 1;
let settled = false;

function send(method, params) {
  const id = nextId++;
  const req = { jsonrpc: '2.0', id, method, params };
  child.stdin.write(`${JSON.stringify(req)}\n`);
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`${method} 超时（20s）`));
      }
    }, 20000);
  });
}

function notify(method, params) {
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
}

child.stdout.on('data', (buf) => {
  stdout += buf.toString();
  let nl;
  while ((nl = stdout.indexOf('\n')) >= 0) {
    const line = stdout.slice(0, nl).trim();
    stdout = stdout.slice(nl + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    if (msg.id && pending.has(msg.id)) {
      const { resolve } = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg);
    }
  }
});

let stderr = '';
child.stderr.on('data', (b) => {
  stderr += b.toString();
});

function fail(msg) {
  console.error(`[失败] ${msg}`);
  if (stderr.trim()) console.error('--- server 输出(stderr) ---\n' + stderr.trim());
  child.kill('SIGKILL');
  process.exit(1);
}

function ok(msg) {
  console.log(`[OK] ${msg}`);
}

(async () => {
  const init = await send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'mcp-abap-adt-verify', version: '1.0.0' },
  }).catch((e) => fail(`服务器未响应 initialize：${e.message}`));
  ok(`server 已启动：${init?.result?.serverInfo?.name || 'mcp-abap-adt'} ${init?.result?.serverInfo?.version || ''}`);
  notify('notifications/initialized', {});

  const tools = await send('tools/list', {}).catch((e) => fail(`tools/list 失败：${e.message}`));
  const list = tools?.result?.tools || [];
  ok(`工具数量：${list.length}（exposition=${exposition}）`);
  const crud = list.filter((t) => /Create|Update|Delete|Activate/i.test(t.name)).length;
  console.log(`     其中写操作类工具 ${crud} 个${crud === 0 ? '（readonly 模式，符合预期）' : ''}`);

  if (opts.sql) {
    const call = await send('tools/call', {
      name: 'GetSqlQuery',
      arguments: { sql_query: opts.sql, row_number: 5 },
    }).catch((e) => fail(`SQL 执行失败：${e.message}`));
    const text = JSON.stringify(call?.result ?? call?.error ?? call);
    console.log(`[SQL] ${opts.sql}\n${text.slice(0, 2000)}`);
    if (call?.error) fail('协议层错误，见上');
    if (call?.result?.isError) {
      const t = call.result?.content?.[0]?.text || '';
      if (/socket hang up|ECONNREFUSED|ETIMEDOUT/i.test(t)) {
        fail(`网络不通（${t}）。若公司有代理，需在 WorkBuddy 的 MCP 配置 env 里加 "NO_PROXY": "*"，并确保 SAP 地址可直连`);
      }
      fail(`SAP 返回错误：${t}`);
    }
    ok('SAP 链路连通');
  }

  settled = true;
  child.kill('SIGKILL');
  console.log('\n自检通过。若 WorkBuddy 里仍显示未连接，按以下顺序排查：');
  console.log('  1. 完全重启 WorkBuddy（不是关窗口，是退出应用）');
  console.log('  2. 连接器管理页对新条目点「信任」');
  console.log('  3. 检查 ~/.workbuddy/mcp.json 里 args 路径是否为绝对路径且存在');
})().catch((e) => fail(e.message));

setTimeout(() => {
  if (!settled) fail('整体超时（30s），server 未能完成握手');
}, 30000);
