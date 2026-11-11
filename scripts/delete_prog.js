#!/usr/bin/env node
// --- 路径自适应：portable/ = MCP 包目录，env/ = 连接配置目录 ---
const __path = require('path');
const REPO_ROOT = process.env.MCP_ABAP_ROOT || __path.resolve(__dirname, '..');
const MCP_ROOT = process.env.MCP_PROJECT || __path.join(REPO_ROOT, 'portable');
const DEFAULT_ENV_FILE = __path.join(MCP_ROOT, 'env', 'dev.env');
/**
 * 删除 ABAP 程序（ADT 通道）—— 主要用于清理 $TMP 探针。
 *
 * 用法:
 *   PROGS=ZTEST_A,ZTEST_B node scripts/delete_prog.js
 *   INCS=ZTMP_INC_A,ZTMP_INC_B node scripts/delete_prog.js   # 程序 include（SUBC=I）
 *   SAP_CLIENT_OVERRIDE=300 PROGS=ZTEST_A node scripts/delete_prog.js
 *
 * 要点:
 *   - 与 push_prog_source.js 同一套 LOCK 协议：POST ?_action=LOCK&accessMode=MODIFY，
 *     响应里取 <LOCK_HANDLE>，DELETE 时作为 query 参数带回去；删除不需要 UNLOCK。
 *   - 程序不存在（GET 非 200）直接跳过，不当失败。
 *   - 必须剥掉本机 HTTP(S)_PROXY，否则 ADT 请求走 127.0.0.1 代理会 socket hang up。
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
if (process.env.SAP_CLIENT_OVERRIDE) {
  process.env.SAP_CLIENT = process.env.SAP_CLIENT_OVERRIDE;
  env.SAP_CLIENT = process.env.SAP_CLIENT_OVERRIDE;
}

const { getConfig } = require(MCP + '/dist/lib/config.js');
const { createAbapConnection } = require(resolveInProject('@mcp-abap-adt/connection'));

const PROGS = (process.env.PROGS || '')
  .split(',')
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean)
  .map((n) => ({ n, base: `/sap/bc/adt/programs/programs/${n.toLowerCase()}` }));
// INCS：程序 include（TRDIR-SUBC=I）走独立资源 /programs/includes，
// 用 PROGS 去删会 404（GET 打错资源直接判定"不存在"跳过）。
const INCS = (process.env.INCS || '')
  .split(',')
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean)
  .map((n) => ({ n, base: `/sap/bc/adt/programs/includes/${n.toLowerCase()}` }));
const TARGETS = [...PROGS, ...INCS];
if (!TARGETS.length) {
  console.error('PROGS / INCS not set (逗号分隔的程序名)');
  process.exit(1);
}

const ACCEPT_LOCK =
  'application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result;q=0.8, ' +
  'application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result2;q=0.9';

console.log(`env=${ENV_FILE} client=${env.SAP_CLIENT || '?'} 待删 ${TARGETS.length} 个对象`);

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
  try { if (csrf && conn.setCsrfToken) conn.setCsrfToken(csrf); } catch (e) { /* ignore */ }

  for (const { n: prog, base } of TARGETS) {
    let g;
    try {
      g = await conn.makeAdtRequest({ url: base, method: 'GET' });
    } catch (e) {
      g = { status: e.response ? e.response.status : 0 };
    }
    if (g.status !== 200) {
      console.log(`  ${prog}: 不存在(${g.status})，跳过`);
      continue;
    }

    try {
      const lr = await conn.makeAdtRequest({
        url: `${base}?_action=LOCK&accessMode=MODIFY`,
        method: 'POST',
        headers: { Accept: ACCEPT_LOCK, ...CSRFH },
      });
      const lh = String(lr.data).match(/<LOCK_HANDLE>([^<]+)<\/LOCK_HANDLE>/)?.[1];
      if (!lh) {
        console.log(`  ${prog}: 取不到 LOCK_HANDLE，跳过`);
        continue;
      }
      const del = await conn.makeAdtRequest({
        url: `${base}?lockHandle=${encodeURIComponent(lh)}`,
        method: 'DELETE',
        headers: CSRFH,
      });
      console.log(`  ${prog}: delete => ${del.status}`);
    } catch (e) {
      const d2 = e.response ? `${e.response.status} ${String(e.response.data).slice(0, 300)}` : e.message;
      console.log(`  ${prog}: 删除失败 ${d2}`);
    }
  }

  console.log('DONE');
  conn.setSessionType('stateless');
})().catch((e) => {
  const d = e.response ? `${e.response.status} ${String(e.response.data).slice(0, 500)}` : e.message;
  console.error('ERR', d);
  process.exit(1);
});
