#!/usr/bin/env node
/**
 * mcp-abap-adt 绿色版 —— 一键接入 WorkBuddy
 *
 * 作用：
 *   1. 生成 env/<系统名>.env（写入你的 SAP 地址/集团/账号密码，不随包外传）
 *   2. 把 MCP 条目合并进 ~/.workbuddy/mcp.json（改动前自动备份）
 *
 * 用法（在本脚本所在目录执行）：
 *   node install.mjs                                  # 交互式
 *   node install.mjs --name=dev --url=https://x:44300 --client=300 \
 *                    --user=YOUR_USER --pass=xxx --exposition=readonly,high
 *   node install.mjs --env-only                       # 只生成 env，不碰 mcp.json
 *   node install.mjs --uninstall --name=dev           # 从 mcp.json 移除条目
 *
 * 要求：Node >= 22
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_DIR = __dirname;

// ---------- 参数解析 ----------
const argv = process.argv.slice(2);
const opts = {};
for (const a of argv) {
  const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
  if (!m) continue;
  opts[m[1]] = m[2] === undefined ? true : m[2];
}
const HELP = argv.includes('--help') || argv.includes('-h');

function usage() {
  console.log(`用法：
  node install.mjs [--name=<系统名>] [--url=<地址>] [--client=<集团>]
                   [--user=<账号>] [--pass=<密码>] [--lang=ZH]
                   [--exposition=readonly,high] [--env-only] [--uninstall]

参数：
  --name        系统标识，决定 env 文件名与 MCP 条目名（默认 mysystem）
  --url         SAP 地址，含协议与端口，如 https://10.0.0.1:44300
  --client      集团，如 300
  --user        SAP 账号（大小写须与 USR02 一致）
  --pass        SAP 密码
  --lang        登录语言（默认 ZH）
  --exposition  暴露的工具集：readonly,high（默认） / readonly,low
                注意 high 与 low 互斥，只能二选一
  --env-only    只生成 env 文件，不修改 ~/.workbuddy/mcp.json
  --uninstall   从 ~/.workbuddy/mcp.json 移除 --name 指定的条目
  --help        显示本帮助`);
}

if (HELP) {
  usage();
  process.exit(0);
}

// ---------- 环境检查 ----------
const major = Number(process.versions.node.split('.')[0]);
if (major < 22) {
  console.error(`[错误] 当前 Node 版本 ${process.versions.node}，本 MCP 要求 >= 22。`);
  console.error('       请升级 Node 后重试：https://nodejs.org/');
  process.exit(1);
}
if (/[\u4e00-\u9fa5\s]/.test(PKG_DIR)) {
  console.warn(`[警告] 安装路径含中文或空格（${PKG_DIR}），部分客户端启动 MCP 会失败，建议换到纯英文无空格路径。`);
}

// ---------- 常量 ----------
const WB_CONFIG = path.join(os.homedir(), '.workbuddy', 'mcp.json'); // 注意：无点前缀的 mcp.json
const ENV_DIR = path.join(PKG_DIR, 'env');
const ENV_TPL = path.join(ENV_DIR, 'dev.env.example');
const BIN = path.join(PKG_DIR, 'bin', 'mcp-abap-adt.js');

// ---------- 交互输入 ----------
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q, def = '') =>
  !process.stdin.isTTY
    ? Promise.resolve(def) // 非交互环境直接取默认值，避免挂死
    : new Promise((res) => rl.question(def ? `${q} [${def}]: ` : `${q}: `, (a) => res((a || '').trim() || def)));
function askSecret(q) {
  // TTY 下逐字符读取并静默（不回显）；非 TTY（管道/重定向）退回普通提问
  if (!process.stdin.isTTY) return ask(q);
  process.stdout.write(`${q}: `);
  rl.pause();
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve) => {
    let v = '';
    const onData = (ch) => {
      const c = ch.toString();
      if (c === '\n' || c === '\r' || c === '\u0004') {
        process.stdin.removeListener('data', onData);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write('\n');
        rl.resume();
        resolve(v.trim());
      } else if (c === '\u0003') {
        process.exit(1);
      } else if (c === '\u007f' || c === '\b') {
        v = v.slice(0, -1);
      } else {
        v += c;
      }
    };
    process.stdin.on('data', onData);
  });
}

async function collect() {
  // 非交互环境下缺必填项直接报错，不静默挂起
  const missing = ['url', 'user', 'pass'].filter((k) => typeof opts[k] !== 'string' || !opts[k]);
  if (!process.stdin.isTTY && missing.length) {
    console.error(`[错误] 缺少必填参数：${missing.map((k) => `--${k}`).join(' ')}（非交互环境不会提示输入）`);
    process.exit(1);
  }
  const name = opts.name || (await ask('系统标识（英文，如 dev / qas）', 'mysystem'));
  const url = opts.url || (await ask('SAP 地址（如 https://10.0.0.1:44300）'));
  const client = opts.client || (await ask('集团', '300'));
  const lang = opts.lang || (await ask('登录语言', 'ZH'));
  const user = opts.user || (await ask('SAP 账号'));
  const pass = typeof opts.pass === 'string' ? opts.pass : await askSecret('SAP 密码');
  const exposition = opts.exposition || (await ask('工具集', 'readonly,high'));

  if (!url || !user || !pass) {
    console.error('[错误] 地址 / 账号 / 密码不能为空。');
    process.exit(1);
  }
  if (/\bhigh\b/.test(exposition) && /\blow\b/.test(exposition)) {
    console.error('[错误] exposition 中 high 与 low 互斥，只能二选一。');
    process.exit(1);
  }
  return { name, url, client, lang, user, pass, exposition };
}

// ---------- 写 env ----------
function writeEnv(cfg) {
  fs.mkdirSync(ENV_DIR, { recursive: true });
  let tpl = '';
  if (fs.existsSync(ENV_TPL)) tpl = fs.readFileSync(ENV_TPL, 'utf8');
  const set = (k, v) => {
    const re = new RegExp(`^${k}=.*$`, 'm');
    tpl = re.test(tpl) ? tpl.replace(re, `${k}=${v}`) : `${tpl.replace(/\n$/, '')}\n${k}=${v}\n`;
  };
  set('SAP_URL', cfg.url);
  set('SAP_CLIENT', cfg.client);
  set('SAP_LANGUAGE', cfg.lang);
  set('SAP_SYSTEM_TYPE', 'onprem');
  set('SAP_CONNECTION_TYPE', 'http');
  set('SAP_AUTH_TYPE', 'basic');
  set('SAP_USERNAME', cfg.user);
  set('SAP_PASSWORD', cfg.pass);
  set('TLS_REJECT_UNAUTHORIZED', '0');
  set('NODE_TLS_REJECT_UNAUTHORIZED', '0');

  const envPath = path.join(ENV_DIR, `${cfg.name}.env`);
  fs.writeFileSync(envPath, tpl, 'utf8');
  try {
    fs.chmodSync(envPath, 0o600); // Windows 上静默失败
  } catch {
    /* noop */
  }
  return envPath;
}

// ---------- 合并 mcp.json ----------
function mergeConfig(cfg, envPath) {
  let json = { mcpServers: {} };
  if (fs.existsSync(WB_CONFIG)) {
    const raw = fs.readFileSync(WB_CONFIG, 'utf8').trim();
    if (raw) {
      json = JSON.parse(raw);
      json.mcpServers = json.mcpServers || {};
    }
    const bak = `${WB_CONFIG}.bak.${Date.now()}`;
    fs.copyFileSync(WB_CONFIG, bak);
    console.log(`[备份] 原配置已备份到 ${bak}`);
  }
  fs.mkdirSync(path.dirname(WB_CONFIG), { recursive: true });

  json.mcpServers[`adt-${cfg.name}`] = {
    command: process.execPath, // 用当前这个能跑起来的 node 绝对路径
    args: [BIN, `--env-path=${envPath}`, `--exposition=${cfg.exposition}`],
    env: {
      NODE_TLS_REJECT_UNAUTHORIZED: '0', // 自签名证书
      NO_PROXY: '*', // SAP 多为内网直连；走公司代理会 socket hang up
      no_proxy: '*',
    },
    disabled: false,
  };

  fs.writeFileSync(WB_CONFIG, JSON.stringify(json, null, 2), 'utf8');
  console.log(`[写入] ${WB_CONFIG} -> mcpServers["adt-${cfg.name}"]`);
}

function uninstall() {
  const name = opts.name || 'mysystem';
  if (!fs.existsSync(WB_CONFIG)) {
    console.log('[跳过] 未找到 WorkBuddy 配置文件。');
    return;
  }
  const json = JSON.parse(fs.readFileSync(WB_CONFIG, 'utf8'));
  if (!json.mcpServers || !json.mcpServers[`adt-${name}`]) {
    console.log(`[跳过] mcpServers 中没有 adt-${name}。`);
    return;
  }
  delete json.mcpServers[`adt-${name}`];
  const bak = `${WB_CONFIG}.bak.${Date.now()}`;
  fs.copyFileSync(WB_CONFIG, bak);
  fs.writeFileSync(WB_CONFIG, JSON.stringify(json, null, 2), 'utf8');
  console.log(`[移除] adt-${name}（备份：${bak}）`);
}

// ---------- main ----------
async function main() {
  if (opts.uninstall) {
    uninstall();
    rl.close();
    return;
  }
  const cfg = await collect();
  const envPath = writeEnv(cfg);
  console.log(`[生成] ${envPath}（权限 600）`);

  if (!opts['env-only']) mergeConfig(cfg, envPath);

  rl.close();
  console.log(`
完成。接下来：
  1. 完全退出并重启 WorkBuddy 应用（改配置后热加载不生效）
  2. 打开「连接器 / MCP」管理页，对新出现的 adt-${cfg.name} 点「信任」
  3. 新开会话，看回复顶部是否出现 "adt-${cfg.name} connected"

验证连接（可选）：
  node ${BIN} --env-path=${envPath} --exposition=${cfg.exposition}
  → 输出 "[MCP] Starting in inspection-only mode" 说明参数缺失；
    正常连上会直接挂起等待 stdio 输入，可用 Ctrl+C 退出。`);
}

main().catch((e) => {
  console.error('[失败]', e.message);
  rl.close();
  process.exit(1);
});
