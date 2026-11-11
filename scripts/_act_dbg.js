#!/usr/bin/env node
// --- 路径自适应：portable/ = MCP 包目录，env/ = 连接配置目录 ---
const __path = require('path');
const REPO_ROOT = process.env.MCP_ABAP_ROOT || __path.resolve(__dirname, '..');
const MCP_ROOT = process.env.MCP_PROJECT || __path.join(REPO_ROOT, 'portable');
const DEFAULT_ENV_FILE = __path.join(MCP_ROOT, 'env', 'dev.env');
/**
 * 调试用：对指定对象执行 ADT 激活并打印完整激活响应（含 longText）。
 * 用法:
 *   node scripts/_act_dbg.js                      # 对象名由 OBJ 指定，必填
 *   OBJ=ZXXX OBJ_TYPE=PROG/P OBJ_URI=/sap/bc/adt/... node scripts/_act_dbg.js
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;
delete process.env.http_proxy;
delete process.env.https_proxy;
process.env.NO_PROXY = '*';
process.env.no_proxy = '*';

const fs = require('fs');
const MCP = MCP_ROOT;
const resolveInProject = (p) => require.resolve(p, { paths: [MCP] });
const ENV_FILE = process.env.SAP_ENV_FILE || DEFAULT_ENV_FILE;
const env = {};
fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Za-z_]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
});
Object.assign(process.env, env);

const { getConfig } = require(MCP + '/dist/lib/config.js');
const { createAbapConnection } = require(resolveInProject('@mcp-abap-adt/connection'));

const OBJ = (process.env.OBJ || '').toUpperCase();
if (!OBJ) { console.error('OBJ not set'); process.exit(1); }
const TYPE = process.env.OBJ_TYPE || 'PROG/P';
const URI = process.env.OBJ_URI || '/sap/bc/adt/programs/programs/' + OBJ.toLowerCase();

(async () => {
  const conn = createAbapConnection(getConfig());
  await conn.connect();
  conn.setSessionType('stateful');

  const d = await conn.makeAdtRequest({
    url: '/sap/bc/adt/discovery',
    method: 'GET',
    headers: { 'x-csrf-token': 'fetch', Accept: 'application/atomsvc+xml' },
  });
  const csrf = (d.headers && (d.headers['x-csrf-token'] || d.headers['X-CSRF-Token'])) || '';
  const CSRFH = csrf ? { 'x-csrf-token': csrf } : {};

  const body =
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">' +
    `<adtcore:objectReference adtcore:uri="${URI}" adtcore:type="${TYPE}" adtcore:name="${OBJ}"/>` +
    '</adtcore:objectReferences>';

  const a = await conn.makeAdtRequest({
    url: '/sap/bc/adt/activation?method=activate&preauditRequested=true&version=inactive',
    method: 'POST',
    data: body,
    headers: {
      'Content-Type': 'application/vnd.sap.adt.activation.v1+xml',
      Accept: 'application/vnd.sap.adt.activation.v1+xml',
      ...CSRFH,
    },
  });

  console.log('status =>', a.status);
  console.log(String(a.data));

  conn.setSessionType('stateless');
})().catch((e) => {
  const d = e.response ? `${e.response.status} ${String(e.response.data).slice(0, 800)}` : e.message;
  console.error('ERR', d);
  process.exit(1);
});
