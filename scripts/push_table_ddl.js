#!/usr/bin/env node
// --- 路径自适应：portable/ = MCP 包目录，env/ = 连接配置目录 ---
const __path = require('path');
const REPO_ROOT = process.env.MCP_ABAP_ROOT || __path.resolve(__dirname, '..');
const MCP_ROOT = process.env.MCP_PROJECT || __path.join(REPO_ROOT, 'portable');
const DEFAULT_ENV_FILE = __path.join(MCP_ROOT, 'env', 'dev.env');
/**
 * 直接走 ADT 推送「已存在表」的 DDL 源码并激活（lock -> PUT -> unlock -> activate -> 复核）。
 * 用于 UpdateTable(MCP) 偶发 CSRF 令牌验证失败时的替代通道。
 *
 * 用法:
 *   SRC_FILE=/abs/DDL_X.txt TABLE=ZTXXXXXX [CORR_NR=<PARENT_TR>] \
 *     SAP_ENV_FILE=/abs/x.env node scripts/push_table_ddl.js
 *   加 NO_ACT=1 只写不激活。
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
delete process.env.HTTP_PROXY; delete process.env.HTTPS_PROXY;
delete process.env.http_proxy; delete process.env.https_proxy;
process.env.NO_PROXY = '*'; process.env.no_proxy = '*';

const fs = require('fs');
const MCP = MCP_ROOT;

const ENV_FILE = process.env.SAP_ENV_FILE || DEFAULT_ENV_FILE;
const env = {};
fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Za-z_]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
});
Object.assign(process.env, env);
if (process.env.SAP_CLIENT_OVERRIDE) process.env.SAP_CLIENT = process.env.SAP_CLIENT_OVERRIDE;

const SRC_FILE = process.env.SRC_FILE;
const TABLE = (process.env.TABLE || '').toUpperCase();
if (!SRC_FILE || !TABLE) { console.error('SRC_FILE / TABLE not set'); process.exit(1); }
const ddl = fs.readFileSync(SRC_FILE, 'utf8');
const CORR = process.env.CORR_NR || '';
const CORR_Q = (first) => (CORR ? `${first ? '?' : '&'}corrNr=${encodeURIComponent(CORR)}` : '');
const NO_ACT = !!process.env.NO_ACT;

const ACCEPT_LOCK =
  'application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result;q=0.8, ' +
  'application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result2;q=0.9';

const { getConfig } = require(MCP + '/dist/lib/config.js');
const { createAbapConnection } = require(require.resolve('@mcp-abap-adt/connection', { paths: [MCP] }));

(async () => {
  const conn = createAbapConnection(getConfig());
  await conn.connect();
  conn.setSessionType('stateful');

  let csrf = '';
  for (let i = 0; i < 3 && !csrf; i++) {
    const d = await conn.makeAdtRequest({
      url: '/sap/bc/adt/discovery', method: 'GET',
      headers: { 'x-csrf-token': 'fetch', Accept: 'application/atomsvc+xml' },
    });
    csrf = (d.headers && (d.headers['x-csrf-token'] || d.headers['X-CSRF-Token'])) || '';
  }
  try { if (csrf && conn.setCsrfToken) conn.setCsrfToken(csrf); } catch (e) { /* ignore */ }
  const CSRFH = csrf ? { 'x-csrf-token': csrf } : {};
  console.log(`table=${TABLE} client=${process.env.SAP_CLIENT} corr=${CORR || '-'} ddl=${ddl.split('\n').length}行`);

  const low = TABLE.toLowerCase();
  // KIND=TABL(默认，ddic/tables) | STRU(ddic/structures) —— 结构与表同一套 lock/PUT/activate 流程
  const KIND = (process.env.KIND || 'TABL').toUpperCase();
  const seg = KIND === 'STRU' ? 'structures' : 'tables';
  const base = `/sap/bc/adt/ddic/${seg}/${low}`;

  const lockResp = await conn.makeAdtRequest({
    url: `${base}?_action=LOCK&accessMode=MODIFY${CORR_Q(false)}`,
    method: 'POST', headers: { Accept: ACCEPT_LOCK, ...CSRFH },
  });
  const lockHandle = String(lockResp.data).match(/<LOCK_HANDLE>([^<]+)<\/LOCK_HANDLE>/)?.[1];
  if (!lockHandle) throw new Error('no LOCK_HANDLE: ' + String(lockResp.data).slice(0, 300));
  console.log('locked =>', lockHandle.slice(0, 12) + '...');

  try {
    const putResp = await conn.makeAdtRequest({
      url: `${base}/source/main?lockHandle=${encodeURIComponent(lockHandle)}${CORR_Q(false)}`,
      method: 'PUT', data: ddl,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', Accept: 'text/plain', ...CSRFH },
      maxBodyLength: Infinity, maxContentLength: Infinity,
    });
    console.log('PUT source =>', putResp.status);
  } finally {
    const u = await conn.makeAdtRequest({
      url: `${base}?_action=UNLOCK&lockHandle=${encodeURIComponent(lockHandle)}`,
      method: 'POST', headers: CSRFH,
    });
    console.log('unlocked =>', u.status);
  }

  if (!NO_ACT) {
    const actBody =
      `<?xml version="1.0" encoding="utf-8"?>` +
      `<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">` +
      `<adtcore:objectReference adtcore:uri="${base}" adtcore:type="${KIND === 'STRU' ? 'STRU/DT' : 'TABL/DT'}" adtcore:name="${TABLE}"/>` +
      `</adtcore:objectReferences>`;
    const a = await conn.makeAdtRequest({
      url: '/sap/bc/adt/activation?method=activate&preauditRequested=true',
      method: 'POST', data: actBody,
      headers: { 'Content-Type': 'application/vnd.sap.adt.activation.v1+xml', Accept: 'application/vnd.sap.adt.activation.v1+xml', ...CSRFH },
    });
    console.log('activate =>', a.status);
    const body = String(a.data);
    if (/activationExecuted="false"/.test(body) || /<msg[^>]*type="[EA]"/.test(body)) {
      [...body.matchAll(/<msg[^>]*type="([EAW])"[^>]*>[\s\S]*?<txt>([\s\S]*?)<\/txt>/g)]
        .forEach((m) => console.log(`  [${m[1]}] ${m[2]}`));
    }
  }

  const g = await conn.makeAdtRequest({ url: base, method: 'GET', headers: { Accept: KIND === 'STRU' ? 'application/vnd.sap.adt.blues.v1+xml, application/vnd.sap.adt.structures.v2+xml' : 'application/vnd.sap.adt.tables.v2+xml' } });
  console.log('final version =>', String(g.data).match(/adtcore:version="([^"]+)"/)?.[1]);
  console.log('DONE');
  conn.setSessionType('stateless');
})().catch((e) => {
  const d = e.response ? `${e.response.status} ${String(e.response.data).slice(0, 600)}` : e.message;
  console.error('ERR', d);
  process.exit(1);
});
