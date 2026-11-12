/**
 * 直连 ADT 处理 DDIC 对象（绕过 MCP server），用于诊断/清理残留未激活对象。
 *
 * 为什么需要它：MCP 的 delete 实现遇到 stale lock 或半成品 inactive 对象时，
 * 只回一句 "was NOT deleted"，看不到 SAP 的真实返回。本脚本把每一步的 HTTP
 * 状态码与响应体原样打出来，并能走 lock -> delete -> unlock -> activate 全流程。
 *
 * 必须 proxy:false —— 本机 HTTP(S)_PROXY 指向 127.0.0.1，ADT 请求走代理会
 * socket hang up / ECONNRESET。
 *
 * 用法：
 *   node scripts/adt_ddic.js probe  dtel ZEDGDS
 *   node scripts/adt_ddic.js delete dtel ZEDGDS
 *   node scripts/adt_ddic.js activate dtel ZEDGDS
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

// --- 路径自适应：portable/ = MCP 包目录，env/ = 连接配置目录 ---
const __path = require('path');
const REPO_ROOT = process.env.MCP_ABAP_ROOT || __path.resolve(__dirname, '..');
const MCP_ROOT = process.env.MCP_PROJECT || __path.join(REPO_ROOT, 'portable');
const DEFAULT_ENV_FILE = __path.join(MCP_ROOT, 'env', 'dev.env');
const ROOT = REPO_ROOT;
const MCP_PROJECT = MCP_ROOT;
const axios = require(require.resolve('axios', { paths: [MCP_PROJECT] }));

const envText = fs.readFileSync(DEFAULT_ENV_FILE, 'utf8');
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const CLIENT = process.env.SAP_CLIENT_OVERRIDE || env.SAP_CLIENT || '';
const TR = process.env.CORR_NR || 'DEVK900006';

const URI_BASE = {
  dtel: '/sap/bc/adt/ddic/dataelements/',
  doma: '/sap/bc/adt/ddic/domains/',
  tabl: '/sap/bc/adt/ddic/tables/',
};

// ADT 的 LOCK action 只认这个 Accept（照抄 @mcp-abap-adt/adt-clients 的 ACCEPT_LOCK），
// 换成 application/xml 或 */* 会得到 406 Unsupported Media Type。
const ACCEPT_LOCK =
  'application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result;q=0.8, ' +
  'application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result2;q=0.9';

const connId = randomUUID().replace(/-/g, '');
let cookies = {};
let csrf = '';

const http = axios.create({
  baseURL: env.SAP_URL,
  timeout: 120000,
  validateStatus: () => true,
  auth: { username: env.SAP_USERNAME, password: env.SAP_PASSWORD },
  proxy: false,
  ...(CLIENT ? { params: { 'sap-client': CLIENT } } : {}),
});

function cookieHeader() {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function adt(method, url, data, extraHeaders = {}) {
  const headers = {
    // 本系统（ED2 Basis）对 DTEL/DDIC 的 GET 只接受 */*；application/xml
    // 或 vnd.sap.adt.dtel.* 一律 406 ExceptionResourceNotAcceptable。
    Accept: '*/*',
    'sap-adt-connectionid': connId,
    'x-sap-adt-sessiontype': 'stateful',
    ...(cookieHeader() ? { Cookie: cookieHeader() } : {}),
    ...(csrf ? { 'x-csrf-token': csrf } : {}),
    ...extraHeaders,
  };
  const res = await http.request({ method, url, data, headers });
  for (const c of res.headers['set-cookie'] || []) {
    const [pair] = c.split(';');
    const idx = pair.indexOf('=');
    if (idx > 0) cookies[pair.slice(0, idx)] = pair.slice(idx + 1);
  }
  const t = res.headers['x-csrf-token'];
  if (t) csrf = t;
  return res;
}

function pick(xml, tag) {
  const m = String(xml).match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return m ? m[1] : '';
}

function brief(res) {
  const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
  return `${res.status} ${String(body).replace(/\s+/g, ' ').slice(0, 500)}`;
}

(async () => {
  const [cmd, kind, name] = process.argv.slice(2);
  const base = URI_BASE[kind];
  if (!cmd || !base || !name) {
    console.log('usage: node scripts/adt_ddic.js probe|delete|activate dtel|doma|tabl NAME');
    process.exit(1);
  }
  const uri = base + name.toLowerCase();
  const log = (tag, r) => console.log(`[${tag}] ${brief(r)}`);

  // 0) 建会话 + 取 CSRF
  let r = await adt('GET', '/sap/bc/adt/ddic/dataelements/mandt', null, { 'x-csrf-token': 'Fetch' });
  console.log('[0] session primed, csrf =', !!csrf, ', status =', r.status);

  // 1) 读当前状态
  r = await adt('GET', uri);
  log('1 GET', r);
  if (cmd === 'probe') return;

  let lockHandle = null;
  if (cmd === 'delete' || cmd === 'activate' || cmd === 'unlock') {
    // POST 不带 Content-Type 时 SAP 回 406 Unsupported Media Type。
    r = await adt('POST', `${uri}?_action=LOCK&accessMode=MODIFY`, '', { 'Content-Type': 'application/xml', Accept: ACCEPT_LOCK });
    log('2 LOCK', r);
    lockHandle = pick(r.data, 'LOCK_HANDLE');
    console.log('    lockHandle =', lockHandle || '(无)');
  }

  if (cmd === 'unlock') {
    if (!lockHandle) {
      console.log('    没拿到 lockHandle，无法解锁');
      return;
    }
    r = await adt('POST', `${uri}?_action=UNLOCK&lockHandle=${encodeURIComponent(lockHandle)}`, '',
      { 'Content-Type': 'application/xml' });
    log('3 UNLOCK', r);
    return;
  }

  if (cmd === 'delete') {
    r = await adt('DELETE', `${uri}${lockHandle ? `?lockHandle=${encodeURIComponent(lockHandle)}` : ''}`);
    log('3 DELETE', r);
    if (lockHandle) {
      r = await adt('POST', `${uri}?_action=UNLOCK&lockHandle=${encodeURIComponent(lockHandle)}`, '',
        { 'Content-Type': 'application/xml' });
      log('4 UNLOCK', r);
      lockHandle = null;
    }
  }

  // 5) 激活
  const actXml = `<?xml version="1.0" encoding="UTF-8"?>
<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">
  <adtcore:objectReference adtcore:uri="${uri}" adtcore:name="${name.toUpperCase()}"/>
</adtcore:objectReferences>`;
  r = await adt('POST', '/sap/bc/adt/activation?method=activate&preauditRequested=true', actXml, {
    'Content-Type': 'application/xml',
  });
  log('5 ACTIVATE', r);
  const txts = [...String(r.data).matchAll(/<txt>([^<]*)<\/txt>/g)].map((m) => m[1]).filter(Boolean);
  if (txts.length) console.log('    messages:', txts.join(' | '));

  // 6) 复核
  r = await adt('GET', uri);
  log('6 GET after', r);
})().catch((e) => {
  console.error('ERROR:', e.message);
  process.exitCode = 1;
});
