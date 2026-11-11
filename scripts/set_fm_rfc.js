#!/usr/bin/env node
// --- 路径自适应：portable/ = MCP 包目录，env/ = 连接配置目录 ---
const __path = require('path');
const REPO_ROOT = process.env.MCP_ABAP_ROOT || __path.resolve(__dirname, '..');
const MCP_ROOT = process.env.MCP_PROJECT || __path.join(REPO_ROOT, 'portable');
const DEFAULT_ENV_FILE = __path.join(MCP_ROOT, 'env', 'dev.env');
/**
 * 把函数模块改为「远程使能」（processingType = rfc）。
 *
 * 背景：ADT 新建函数模块默认 processingType="normal"（非远程使能），
 *       接口函数必须置为 "rfc"；ADT 无专门工具，只能整份 PUT 属性资源。
 *       媒体类型必须用 application/vnd.sap.adt.functions.fmodules.v3+xml
 *       （application/xml 返 406）。
 *
 * 用法：
 *   TARGET_GROUP=ZFG_MY TARGET_FM=ZMY_FM CORR_NR=<PARENT_TR> \
 *   node scripts/set_fm_rfc.js
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
const CLIENT = process.env.SAP_CLIENT_OVERRIDE || env.SAP_CLIENT || '';
const CORR = process.env.CORR_NR || '';
if (!GROUP || !FM) { console.error('TARGET_GROUP / TARGET_FM not set'); process.exit(1); }

const MEDIA = 'application/vnd.sap.adt.functions.fmodules.v3+xml';
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
  if (res.headers['x-csrf-token']) csrf = res.headers['x-csrf-token'];
  return res;
}

function pick(xml, tag) {
  const m = String(xml).match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return m ? m[1] : '';
}

(async () => {
  const objUri = `/sap/bc/adt/functions/groups/${GROUP.toLowerCase()}/fmodules/${FM.toLowerCase()}`;
  let lockHandle = null;
  try {
    let r = await adt('GET', `${objUri}/source/main`, null,
      { Accept: 'text/plain', 'x-csrf-token': 'Fetch' });
    if (r.status >= 400) throw new Error(`Prime failed: ${r.status} ${String(r.data).slice(0, 300)}`);
    console.log('[0] session primed, csrf =', !!csrf);

    r = await adt('GET', objUri, null, { Accept: MEDIA });
    if (r.status >= 400) throw new Error(`Read props failed: ${r.status} ${String(r.data).slice(0, 400)}`);
    let xml = String(r.data);
    const cur = (xml.match(/fmodule:processingType="([^"]*)"/) || [])[1];
    console.log('[1] current processingType =', cur);
    if (cur === 'rfc') { console.log('[1] already rfc, nothing to do'); return; }

    xml = xml.replace(/fmodule:processingType="[^"]*"/, 'fmodule:processingType="rfc"');

    r = await adt('POST',
      `${objUri}?_action=LOCK&accessMode=MODIFY${CORR ? `&corrNr=${encodeURIComponent(CORR)}` : ''}`, null);
    if (r.status >= 400) throw new Error(`Lock failed: ${r.status} ${String(r.data).slice(0, 400)}`);
    lockHandle = pick(r.data, 'LOCK_HANDLE');
    console.log('[2] locked, handle =', lockHandle);

    r = await adt('PUT',
      `${objUri}?lockHandle=${encodeURIComponent(lockHandle)}${CORR ? `&corrNr=${encodeURIComponent(CORR)}` : ''}`,
      xml, { 'Content-Type': MEDIA, Accept: MEDIA });
    console.log('[3] props PUT status =', r.status);
    if (r.status >= 400) throw new Error(`PUT failed: ${r.status} ${String(r.data).slice(0, 600)}`);

    r = await adt('POST', `${objUri}?_action=UNLOCK&lockHandle=${encodeURIComponent(lockHandle)}`, null);
    lockHandle = null;
    console.log('[4] unlocked, status =', r.status);

    r = await adt('GET', objUri, null, { Accept: MEDIA });
    console.log('[5] verify processingType =',
      (String(r.data).match(/fmodule:processingType="([^"]*)"/) || [])[1]);

    const actXml = `<?xml version="1.0" encoding="UTF-8"?>
<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">
  <adtcore:objectReference adtcore:uri="${objUri}?version=inactive" adtcore:name="${FM}"/>
</adtcore:objectReferences>`;
    r = await adt('POST', '/sap/bc/adt/activation?method=activate&preauditRequested=true',
      actXml, { 'Content-Type': 'application/xml' });
    const body = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
    const executed = !/activationExecuted="false"/.test(body);
    const msgs = [...body.matchAll(/<txt>([^<]*)<\/txt>/g)].map((m) => m[1]).filter(Boolean);
    console.log('[6] activate status =', r.status, ', executed =', executed, msgs.length ? ', msgs: ' + msgs.join(' | ').slice(0, 400) : '');
    if (!executed) throw new Error(`Activate NOT executed: ${body.slice(0, 600)}`);
    console.log('[7] DONE');
  } catch (e) {
    console.error('ERROR:', e.message);
    if (lockHandle) {
      const ur = await adt('POST', `${objUri}?_action=UNLOCK&lockHandle=${encodeURIComponent(lockHandle)}`, null);
      console.error('finally-unlock status:', ur.status);
    }
    process.exitCode = 1;
  }
})();
