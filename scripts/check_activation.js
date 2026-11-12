#!/usr/bin/env node
// --- 路径自适应：portable/ = MCP 包目录，env/ = 连接配置目录 ---
const __path = require('path');
const REPO_ROOT = process.env.MCP_ABAP_ROOT || __path.resolve(__dirname, '..');
const MCP_ROOT = process.env.MCP_PROJECT || __path.join(REPO_ROOT, 'portable');
const DEFAULT_ENV_FILE = __path.join(MCP_ROOT, 'env', 'dev.env');
/**
 * 激活状态自查工具（ADT 通道）。
 *
 * 用法:
 *   node scripts/check_activation.js                          # 列出全部 inactive 对象
 *   PROGS=ZMY_PROG,ZMY_PROG_B,ZMY_PROG_C,ZMY_PROG_D node scripts/check_activation.js   # 额外比对文本元素 active/inactive 版本
 *   SAP_ENV_FILE=/tmp/sap300.env ... node scripts/check_activation.js
 *
 * 要点（实测）:
 *   - inactiveobjects 的 XML 命名空间前缀是 `ioc:`，**不是** `adtcore:`；
 *     正则写成 `<adtcore:objectReference` 会得到「0 条」的假象。
 *   - 文本元素是独立可激活对象 `PROG/PX`；只 PUT 不激活时，active 版本为空、inactive 有内容。
 *   - 父程序 `PROG/P` 也会出现在清单里（父对象有未激活子对象时），别据此判断程序源码未激活。
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('fs');
const { randomUUID } = require('crypto');
const MCPP = MCP_ROOT;
const axios = require(require.resolve('axios', { paths: [MCPP] }));

const ENV_FILE = process.env.SAP_ENV_FILE || DEFAULT_ENV_FILE;
const env = {};
fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Za-z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
});
const CLIENT = process.env.SAP_CLIENT_OVERRIDE || env.SAP_CLIENT || '';
const LANG = env.SAP_LANGUAGE || 'ZH';

// PROGS 支持简写：ZMY_PROG 全名，或 B/C/D 这类后缀（自动补前缀）
const RAW = (process.env.PROGS || '').split(',').map((s) => s.trim()).filter(Boolean);
const PREFIX = process.env.PROG_PREFIX || '';
const PROGS = RAW.map((p) => (PREFIX && p.length <= 2 ? `${PREFIX}${p}` : p))
  .map((p) => p.toUpperCase());

const connId = randomUUID().replace(/-/g, '');
const jar = {}; let csrf = '';
const seed = (hdr) => [].concat(hdr || []).forEach((c) => { const p = c.split(';')[0]; jar[p.split('=')[0].trim()] = p; });
const ck = () => Object.values(jar).join('; ');

const http = axios.create({
  baseURL: env.SAP_URL, timeout: 120000, validateStatus: () => true,
  auth: { username: env.SAP_USERNAME, password: env.SAP_PASSWORD }, proxy: false,
  params: { ...(CLIENT ? { 'sap-client': CLIENT } : {}), 'sap-language': LANG },
});
async function adt(method, url, data, extra = {}) {
  const res = await http.request({
    method, url, data,
    headers: {
      'sap-adt-connectionid': connId, 'x-sap-adt-sessiontype': 'stateful',
      ...(ck() ? { Cookie: ck() } : {}), ...(csrf ? { 'x-csrf-token': csrf } : {}), ...extra,
    },
  });
  seed(res.headers['set-cookie']);
  if (res.headers['x-csrf-token']) csrf = res.headers['x-csrf-token'];
  return res;
}

const sig = (data) => {
  const t = String(data).trim();
  if (!t) return null;
  // 行数而非符号数：每个符号占 2 行（@MaxLength + KEY=TEXT），块间空行 -> 约 2n-1
  return t.split('\n').filter((l) => l && !l.startsWith('@MaxLength')).length;
};

(async () => {
  console.log(`env=${ENV_FILE} client=${CLIENT} lang=${LANG}\n`);
  await adt('GET', '/sap/bc/adt/discovery', null, { Accept: '*/*', 'x-csrf-token': 'Fetch' });

  const r = await adt('GET', '/sap/bc/adt/activation/inactiveobjects', null, { Accept: '*/*' });
  console.log(`== inactive 对象（status ${r.status}）==`);
  const entries = [...String(r.data).matchAll(/<ioc:entry>(.*?)<\/ioc:entry>/gs)].map((m) => m[1]);
  if (!entries.length) console.log('  （无）');
  for (const e of entries) {
    const ref = /<ioc:ref([^>]*)\/>/.exec(e)?.[1] || '';
    const g = (k) => new RegExp(`adtcore:${k}="([^"]*)"`).exec(ref)?.[1] || '';
    const corr = /transportrequests\/(DEVK\d+)/.exec(e)?.[1] || '-';
    console.log(`  ${g('type').padEnd(9)} ${g('name').padEnd(12)} corr=${corr.padEnd(12)} ${g('uri')}`);
  }

  if (!PROGS.length) return;
  console.log('\n== 文本元素版本比对（active 空 + inactive 有内容 = 未激活）==');
  for (const prog of PROGS) {
    const base = `/sap/bc/adt/textelements/programs/${prog.toLowerCase()}`;
    const acc = 'application/vnd.sap.adt.textelements.symbols.v1';
    const a = await adt('GET', `${base}/source/symbols?version=active`, null, { Accept: acc });
    const w = await adt('GET', `${base}/source/symbols`, null, { Accept: acc });
    const na = sig(a.data), nw = sig(w.data);
    const verdict = na ? `已激活（${na} 行）` : (nw ? `⚠️ 未激活（active 空 / inactive ${nw} 行）` : '无文本元素');
    console.log(`  ${prog.padEnd(12)} ${verdict}`);
  }
})().catch((e) => {
  console.error('ERR', e.response ? `${e.response.status} ${String(e.response.data).slice(0, 400)}` : e.message);
  process.exit(1);
});
