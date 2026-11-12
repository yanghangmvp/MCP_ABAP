/**
 * 只做激活（针对 PROGRAM），打印 SAP 原始响应（含消息行号），用于排查语法错误。
 * 用法：SRC_NAME=ZMY_PROG [MODE=preaudit|plain] node scripts/act_dump_prog.js
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('fs');
const { randomUUID } = require('crypto');

const MCP_PROJECT = 'MCP_ROOT';
const axios = require(require.resolve('axios', { paths: [MCP_PROJECT] }));

const ENV_FILE = process.env.SAP_ENV_FILE || DEFAULT_ENV_FILE;
const env = {};
for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const NAME = (process.env.SRC_NAME || 'ZMY_PROG').toUpperCase();
const MODE = process.argv[2] || 'preaudit';

const connId = randomUUID().replace(/-/g, '');
let cookies = {};
let csrf = '';

const http = axios.create({
  baseURL: env.SAP_URL,
  timeout: 120000,
  validateStatus: () => true,
  auth: { username: env.SAP_USERNAME, password: env.SAP_PASSWORD },
  proxy: false,
  params: { 'sap-client': env.SAP_CLIENT },
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

(async () => {
  const base = `/sap/bc/adt/programs/programs/${NAME.toLowerCase()}`;
  let r = await adt('GET', `${base}/source/main`, null, {
    Accept: 'text/plain', 'x-csrf-token': 'Fetch',
  });
  console.log('[0] read source status =', r.status, ', size =', String(r.data).length);

  const actXml = `<?xml version="1.0" encoding="UTF-8"?>
<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">
  <adtcore:objectReference adtcore:uri="${base}" adtcore:type="PROG/P" adtcore:name="${NAME}"/>
</adtcore:objectReferences>`;

  const url = MODE === 'plain'
    ? '/sap/bc/adt/activation?method=activate&version=inactive'
    : '/sap/bc/adt/activation?method=activate&preauditRequested=true&version=inactive';

  r = await adt('POST', url, actXml, {
    'Content-Type': 'application/vnd.sap.adt.activation.v1+xml',
    Accept: 'application/vnd.sap.adt.activation.v1+xml',
  });
  const body = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
  console.log('[1] activate mode =', MODE, ', status =', r.status);
  console.log('[1] raw response:\n' + body.slice(0, 8000));
})();
