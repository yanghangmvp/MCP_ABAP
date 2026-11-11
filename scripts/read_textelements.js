// --- 路径自适应：portable/ = MCP 包目录，env/ = 连接配置目录 ---
const __path = require('path');
const REPO_ROOT = process.env.MCP_ABAP_ROOT || __path.resolve(__dirname, '..');
const MCP_ROOT = process.env.MCP_PROJECT || __path.join(REPO_ROOT, 'portable');
const DEFAULT_ENV_FILE = __path.join(MCP_ROOT, 'env', 'dev.env');
/**
 * 只读：拉取程序**激活版**文本元素（文本符号 / 选择文本）并打印，便于核对与 grep。
 *
 * 用法：
 *   SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/read_textelements.js ZMY_PROG symbols
 *   SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/read_textelements.js ZMY_PROG selections
 *   SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/read_textelements.js ZMY_PROG symbols --active
 *
 * 为什么需要它：push_textelements.js 的回读只打印**前几行预览**并只给总行数，
 *   无法确认某个符号是否真的被删掉。本脚本把全文打到 stdout，可直接 grep。
 *
 * 两个必踩的坑（与 push_textelements.js 一致）：
 *   1) primer GET（取 CSRF）**不能带** Accept: application/vnd.sap.adt.textelements.v1 —— 会 406；
 *      用 Accept: '*\/*'。
 *   2) 请求必须带 `x-sap-adt-sessiontype: stateful` + 固定 `sap-adt-connectionid`，
 *      否则 LOCK 返回的 handle 在后续请求上被判为 invalid（默认非激活版本用 GET 即可，
 *      本脚本只读，不涉及 LOCK）。
 *
 * 注意：异常只打印 e.message（axios 错误对象带 Basic Auth 头会漏凭据）。
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('fs');
const { randomUUID } = require('crypto');

const MCP_PROJECT = MCP_ROOT;
const axios = require(require.resolve('axios', { paths: [MCP_PROJECT] }));

const ENV_FILE = process.env.SAP_ENV_FILE || DEFAULT_ENV_FILE;
const env = {};
fs.readFileSync(ENV_FILE, 'utf8')
  .split(/\r?\n/)
  .forEach((l) => {
    const m = l.match(/^([A-Za-z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  });

const PROG = (process.argv[2] || '').toUpperCase();
const SUB = process.argv[3] || 'symbols';
const WANT_ACTIVE = process.argv.includes('--active');
if (!PROG) {
  console.error('usage: node scripts/read_textelements.js <PROG> [symbols|selections] [--active]');
  process.exit(1);
}

const CLIENT = process.env.SAP_CLIENT_OVERRIDE || env.SAP_CLIENT || '';
const LANG = process.env.SAP_LANGUAGE || env.SAP_LANGUAGE || 'ZH';

const base = `/sap/bc/adt/textelements/programs/${PROG.toLowerCase()}`;
const connId = randomUUID().replace(/-/g, '');
const jar = {};
let csrf = '';

const seed = (hdr) =>
  [].concat(hdr || []).forEach((c) => {
    const p = c.split(';')[0];
    jar[p.split('=')[0].trim()] = p;
  });
const ck = () => Object.values(jar).join('; ');

const http = axios.create({
  baseURL: env.SAP_URL,
  timeout: 120000,
  validateStatus: () => true,
  auth: { username: env.SAP_USERNAME, password: env.SAP_PASSWORD },
  proxy: false,
  params: { ...(CLIENT ? { 'sap-client': CLIENT } : {}), 'sap-language': LANG },
});

async function adt(method, url, data, extra = {}) {
  const res = await http.request({
    method,
    url,
    data,
    headers: {
      'sap-adt-connectionid': connId,
      'x-sap-adt-sessiontype': 'stateful',
      ...(ck() ? { Cookie: ck() } : {}),
      ...(csrf ? { 'x-csrf-token': csrf } : {}),
      ...extra,
    },
  });
  seed(res.headers['set-cookie']);
  if (res.headers['x-csrf-token']) csrf = res.headers['x-csrf-token'];
  return res;
}

(async () => {
  const primer = await adt('GET', base, null, { Accept: '*/*', 'x-csrf-token': 'Fetch' });
  if (primer.status >= 400) {
    console.error(`primer failed: ${primer.status} ${String(primer.data).slice(0, 300)}`);
    process.exit(1);
  }

  const url = `${base}/source/${SUB}`;
  const accept = `application/vnd.sap.adt.textelements.${SUB}.v1`;
  const r = await adt('GET', url, null, {
    Accept: accept,
    ...(WANT_ACTIVE ? { 'sap-adt-version': 'active' } : {}),
  });
  console.error(
    `[read_textelements] prog=${PROG} sub=${SUB} client=${CLIENT} lang=${LANG} status=${r.status} bytes=${String(r.data).length}`,
  );
  if (r.status >= 400) {
    console.error(String(r.data).slice(0, 600));
    process.exit(1);
  }
  process.stdout.write(String(r.data));
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
