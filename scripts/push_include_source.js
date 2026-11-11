// --- 路径自适应：portable/ = MCP 包目录，env/ = 连接配置目录 ---
const __path = require('path');
const REPO_ROOT = process.env.MCP_ABAP_ROOT || __path.resolve(__dirname, '..');
const MCP_ROOT = process.env.MCP_PROJECT || __path.join(REPO_ROOT, 'portable');
const DEFAULT_ENV_FILE = __path.join(MCP_ROOT, 'env', 'dev.env');
/**
 * 推送函数组 include 源码：lock -> PUT -> unlock（不激活，激活交给 ActivateFunctionGroup/ActivateObjects）
 * 与 push_fm_source.js 同源，区别只在目标 URI 是 includes/<inc>/source/main。
 *
 * 用法：
 *   SRC_FILE=/abs/path/lzfg_myf01.abap GROUP_NAME=ZFG_MY INCLUDE_NAME=LZFG_MYF01 \
 *   SAP_CLIENT_OVERRIDE=100 node scripts/push_include_source.js
 *
 * 可选：CORR_NR=<PARENT_TR> 指定传输请求（默认取 LOCK 响应里的 CORRNR）。
 * 注意：必须 proxy:false —— 本机 HTTP(S)_PROXY 指向 127.0.0.1，会让 ADT 请求打到代理上。
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('fs');
const { randomUUID } = require('crypto');

const MCP_PROJECT = MCP_ROOT;
const axios = require(require.resolve('axios', { paths: [MCP_PROJECT] }));

const envText = fs.readFileSync(process.env.SAP_ENV_FILE || DEFAULT_ENV_FILE, 'utf8');
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const GROUP = process.env.GROUP_NAME;
const INCLUDE = process.env.INCLUDE_NAME;
if (!GROUP || !INCLUDE) { console.error('GROUP_NAME / INCLUDE_NAME not set'); process.exit(1); }
const CLIENT = process.env.SAP_CLIENT_OVERRIDE || env.SAP_CLIENT || '';
const SRC_FILE = process.env.SRC_FILE;
if (!SRC_FILE) {
  console.error('SRC_FILE not set');
  process.exit(1);
}
const SRC = fs.readFileSync(SRC_FILE, 'utf8');

const connId = randomUUID().replace(/-/g, '');
let cookies = {};
let csrf = '';

const http = axios.create({
  baseURL: env.SAP_URL,
  timeout: 120000,
  validateStatus: () => true,
  auth: { username: env.SAP_USERNAME, password: env.SAP_PASSWORD },
  proxy: false,
  // 必须显式带 sap-client，否则 ADT 落到系统默认集团，写操作会撞别集团的锁
  ...(CLIENT ? { params: { 'sap-client': CLIENT } } : {}),
});

function cookieHeader() {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function adt(method, url, data, extraHeaders = {}) {
  const headers = {
    Accept: 'application/xml',
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

(async () => {
  const incUri = `/sap/bc/adt/functions/groups/${GROUP.toLowerCase()}/includes/${INCLUDE.toLowerCase()}`;
  const srcUri = `${incUri}/source/main`;
  let lockHandle = null;

  try {
    let r = await adt('GET', srcUri, null, { Accept: 'text/plain', 'x-csrf-token': 'Fetch' });
    if (r.status >= 400) throw new Error(`Read failed: ${r.status} ${String(r.data).slice(0, 300)}`);
    console.log('[0] session primed, csrf =', !!csrf, ', remote source size =', String(r.data).length);

    const wantCorr = process.env.CORR_NR || '';
    // include 的 LOCK 端点比 FM 严格：只接受 application/vnd.sap.as+xml，用 application/xml 会 406
    r = await adt('POST',
      `${incUri}?_action=LOCK&accessMode=MODIFY${wantCorr ? `&corrNr=${encodeURIComponent(wantCorr)}` : ''}`, null,
      {
        Accept:
          'application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result;q=0.8,' +
          'application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result2;q=0.9',
      });
    if (r.status >= 400) throw new Error(`Lock failed: ${r.status} ${String(r.data).slice(0, 500)}`);
    lockHandle = pick(r.data, 'LOCK_HANDLE');
    const respCorr = pick(r.data, 'CORRNR');
    const corrNr = wantCorr || respCorr || '';
    console.log('[1] locked, handle =', lockHandle, ', SAP 返回 corrNr =', respCorr || '(空)', ', 本次使用 =', corrNr);

    r = await adt('PUT', `${srcUri}?lockHandle=${encodeURIComponent(lockHandle)}&corrNr=${corrNr}`,
      SRC, { 'Content-Type': 'text/plain; charset=utf-8', Accept: 'text/plain' });
    if (r.status >= 400) throw new Error(`Update failed: ${r.status} ${String(r.data).slice(0, 800)}`);
    console.log('[2] source updated, sent size =', SRC.length);

    await adt('POST', `${incUri}?_action=UNLOCK&lockHandle=${encodeURIComponent(lockHandle)}`, null);
    lockHandle = null;
    console.log('[3] unlocked — 下一步请用 ActivateFunctionGroup 激活');
  } catch (e) {
    console.error('ERROR:', e.message);
    if (lockHandle) {
      try {
        await adt('POST', `${incUri}?_action=UNLOCK&lockHandle=${encodeURIComponent(lockHandle)}`, null);
        console.log('[!] lock released after error');
      } catch { /* ignore */ }
    }
    process.exitCode = 1;
  }
})();
