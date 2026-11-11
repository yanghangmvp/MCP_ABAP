// --- 路径自适应：portable/ = MCP 包目录，env/ = 连接配置目录 ---
const __path = require('path');
const REPO_ROOT = process.env.MCP_ABAP_ROOT || __path.resolve(__dirname, '..');
const MCP_ROOT = process.env.MCP_PROJECT || __path.join(REPO_ROOT, 'portable');
const DEFAULT_ENV_FILE = __path.join(MCP_ROOT, 'env', 'dev.env');
/**
 * 推送函数模块源码：lock -> PUT -> activate(preaudit) -> UNLOCK
 * 独立持有整个 ADT 会话，绕开 MCP server 的锁泄漏问题。
 * 注意：必须 proxy:false —— 本机 HTTP(S)_PROXY 指向 127.0.0.1，会让 ADT 请求打到代理上。
 * 用法：
 *   SRC_FILE=/abs/path/x.abap TARGET_GROUP=ZMY_FM TARGET_FM=ZMY_FM \
 *   node push_fm_source.js
 * 可选：CORR_NR=<PARENT_TR> 指定传输请求（默认取 LOCK 响应里的 CORRNR）。
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

const GROUP = process.env.TARGET_GROUP;
const FM = process.env.TARGET_FM;
if (!GROUP || !FM) { console.error('TARGET_GROUP / TARGET_FM not set'); process.exit(1); }
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
  // 必须显式带 sap-client，否则 ADT 会落到系统默认集团，写操作会撞到别的集团的锁
  ...(CLIENT ? { params: { 'sap-client': CLIENT } } : {}),
});

function cookieHeader() {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
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
  const setCookies = res.headers['set-cookie'] || [];
  for (const c of setCookies) {
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
  const objUri = process.env.OBJ_URI
    || `/sap/bc/adt/functions/groups/${GROUP.toLowerCase()}/fmodules/${FM.toLowerCase()}`;
  const srcUri = `${objUri}/source/main`;
  let lockHandle = null;

  try {
    let r = await adt('GET', srcUri, null, { Accept: 'text/plain', 'x-csrf-token': 'Fetch' });
    if (r.status >= 400) throw new Error(`Read failed: ${r.status} ${String(r.data).slice(0, 300)}`);
    console.log('[0] session primed, csrf =', !!csrf, ', remote source size =', String(r.data).length);

    const wantCorr = process.env.CORR_NR || '';
    r = await adt('POST',
      `${objUri}?_action=LOCK&accessMode=MODIFY${wantCorr ? `&corrNr=${encodeURIComponent(wantCorr)}` : ''}`, null,
      { Accept: 'application/vnd.sap.as+xml' });
    if (r.status >= 400) throw new Error(`Lock failed: ${r.status} ${String(r.data).slice(0, 500)}`);
    lockHandle = pick(r.data, 'LOCK_HANDLE');
    const respCorr = pick(r.data, 'CORRNR');
    const corrNr = wantCorr || respCorr || '';
    console.log('[1] locked, handle =', lockHandle, ', SAP 返回 corrNr =', respCorr || '(空)', ', 本次使用 =', corrNr);

    r = await adt('PUT', `${srcUri}?lockHandle=${encodeURIComponent(lockHandle)}&corrNr=${corrNr}`,
      SRC, { 'Content-Type': 'text/plain; charset=utf-8', Accept: 'text/plain' });
    if (r.status >= 400) throw new Error(`Update failed: ${r.status} ${String(r.data).slice(0, 800)}`);
    console.log('[2] source updated, sent size =', SRC.length);

    await adt('POST', `${objUri}?_action=UNLOCK&lockHandle=${encodeURIComponent(lockHandle)}`, null);
    lockHandle = null;
    console.log('[3] unlocked');

    const actXml = `<?xml version="1.0" encoding="UTF-8"?>
<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">
  <adtcore:objectReference adtcore:uri="${objUri}?version=inactive" adtcore:name="${FM}"/>
</adtcore:objectReferences>`;
    r = await adt('POST', '/sap/bc/adt/activation?method=activate&preauditRequested=true',
      actXml, { 'Content-Type': 'application/xml' });
    console.log('[4] activate status =', r.status);
    const body = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
    // 激活响应里 activationExecuted="false" 表示 SAP 其实没激活（HTTP 仍是 200），必须显式判断
    const executed = !/activationExecuted="false"/.test(body);
    // 响应标签是 <shortText><txt>..</txt></shortText>，旧正则（chklst:shortText / <msg>text</msg>）匹配不到，
    // 会被"假成功"骗过：status=200 但什么都没激活。
    const msgs = [...body.matchAll(/<txt>([^<]*)<\/txt>/g)]
      .map((m) => m[1])
      .filter(Boolean);
    if (msgs.length) console.log('[4] messages:', msgs.join(' | ').slice(0, 800));
    if (!executed) throw new Error(`Activate NOT executed (SAP cancelled): ${body.slice(0, 800)}`);
    if (r.status >= 400) throw new Error(`Activate failed: ${r.status} ${body.slice(0, 800)}`);

    console.log('[5] DONE');
  } catch (e) {
    console.error('ERROR:', e.message);
    if (lockHandle) {
      const ur = await adt('POST', `${objUri}?_action=UNLOCK&lockHandle=${encodeURIComponent(lockHandle)}`, null);
      console.error('finally-unlock status:', ur.status);
    } else {
      console.error('No lock handle this run; if SAP reports the object locked, it is a stale lock from a dead session.');
    }
    process.exitCode = 1;
  }
})();
