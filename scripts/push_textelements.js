#!/usr/bin/env node
// --- 路径自适应：portable/ = MCP 包目录，env/ = 连接配置目录 ---
const __path = require('path');
const REPO_ROOT = process.env.MCP_ABAP_ROOT || __path.resolve(__dirname, '..');
const MCP_ROOT = process.env.MCP_PROJECT || __path.join(REPO_ROOT, 'portable');
const DEFAULT_ENV_FILE = __path.join(MCP_ROOT, 'env', 'dev.env');
/**
 * 通过 ADT textelements 资源为程序推送文本元素（文本符号 + 选择文本）。
 *
 * 用法:
 *   TE_FILE=./texts/ZMY_PROG.json node scripts/push_textelements.js
 *   CORR_NR=<PARENT_TR> TE_FILE=... node scripts/push_textelements.js
 *   SAP_ENV_FILE=/tmp/sap300.env TE_FILE=... node scripts/push_textelements.js
 *
 * JSON 结构: { "program": "ZMY_PROG", "symbols": [["001","文本"], ...], "selections": [["P_X","文本"], ...] }
 *
 * 关键点（实测）:
 *   - **primer GET 不要带 `Accept: application/vnd.sap.adt.textelements.v1`** —— 会 406
 *     （discovery 声明的对象媒体类型是 `application/vnd.sap.adt.textelements.v1+xml`，
 *     最稳的写法是不指定 Accept，或用通配 Accept）。
 *   - CSRF token 从 GET /sap/bc/adt/textelements/programs/<prog> 取；LOCK handle 绑定 ADT 会话，
 *     所有请求必须带同一个 `sap-adt-connectionid` + 合并的会话 cookie，否则 PUT 报
 *     "Resource REPT xxx is not locked (invalid lock handle)"。
 *   - 文本元素子对象类型是 REPT，LOCK/PUT 走同一 base + ?_action=LOCK&accessMode=MODIFY。
 *   - 对象落在可传输包里时 LOCK 和 **PUT 都要带 corrNr（父请求号）**；只带 LOCK 会报
 *     "Parameter corrNr could not be found."。
 *   - PUT 需要 If-Match: <etag>；Content-Type 为 vnd.sap.adt.textelements.<symbols|selections>.v1。
 *   - symbols 序列化: "@MaxLength:<n>\nKEY=TEXT\n"，块间空行；selections: KEY 左对齐 8 位 + '=' + 文本。
 *     MaxLength ≈ 字符数(中文按 2) + 10，非关键校验位。
 *   - ★ **PUT 只写入 inactive 版本，必须再单独调 ACTIVATE**（见 [5]）。
 *     ADT 里文本元素是**独立可激活对象**，`adtcore:type = "PROG/PX"`，uri 就是文本元素自身：
 *     `adtcore:objectReference adtcore:uri="/sap/bc/adt/textelements/programs/<prog>" type="PROG/PX" name="<PROG>"`。
 *     只 PUT 不激活的后果：SE38 里文本元素显示黄色未激活，需人工激活；且**激活父程序 PROG/P 不会连带激活它**
 *     （传 PROG/P 激活时 SAP 认为无可激活内容，回 `activationExecuted="false"` 且无消息，静默无效）。
 *
 * 程序源码里用 TEXT-001 / TEXT-T01 引用，语法检查会校验符号存在，故必须先推文本再激活源码。
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

const TE_FILE = process.env.TE_FILE;
if (!TE_FILE) { console.error('TE_FILE not set'); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(TE_FILE, 'utf8'));
const PROG = (process.env.PROG || cfg.program || '').toUpperCase();
if (!PROG) { console.error('program name not resolved'); process.exit(1); }

const CLIENT = process.env.SAP_CLIENT_OVERRIDE || env.SAP_CLIENT || '';
const LANG = process.env.SAP_LANGUAGE || env.SAP_LANGUAGE || 'ZH';
const CORR = process.env.CORR_NR || '';
const CORR_Q = CORR ? `&corrNr=${encodeURIComponent(CORR)}` : '';

const ACCEPT_LOCK =
  'application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result;q=0.8, ' +
  'application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result2;q=0.9';

const base = `/sap/bc/adt/textelements/programs/${PROG.toLowerCase()}`;
const connId = randomUUID().replace(/-/g, '');
const jar = {};
let csrf = '';

const seed = (hdr) => [].concat(hdr || []).forEach((c) => { const p = c.split(';')[0]; jar[p.split('=')[0].trim()] = p; });
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

const enc = (v) => [...v].reduce((n, c) => n + (c.charCodeAt(0) > 255 ? 2 : 1), 0) + 10;
const bodySymbols = cfg.symbols.map(([k, v]) => `@MaxLength:${enc(v)}\n${k}=${v}\n`).join('\n');
const bodySelections = cfg.selections.map(([k, v]) => k.padEnd(8) + '=' + v).join('\n') + '\n';
const bodyOf = (sub) => (sub === 'symbols' ? bodySymbols : bodySelections);

(async () => {
  console.log(`env=${ENV_FILE} client=${CLIENT} lang=${LANG} program=${PROG} corr=${CORR || '(none)'}`);

  let r = await adt('GET', base, null, { Accept: '*/*', 'x-csrf-token': 'Fetch' });
  console.log('[0] primer status =', r.status, 'csrf =', csrf ? csrf.slice(0, 8) + '..' : 'MISSING');
  if (r.status >= 400) throw new Error(`primer failed: ${r.status} ${String(r.data).slice(0, 300)}`);

  r = await adt('POST', `${base}?_action=LOCK&accessMode=MODIFY${CORR_Q}`, null, { Accept: ACCEPT_LOCK });
  const lockHandle = String(r.data).match(/<LOCK_HANDLE>([^<]+)<\/LOCK_HANDLE>/)?.[1];
  if (!lockHandle) throw new Error(`no LOCK_HANDLE: ${r.status} ${String(r.data).slice(0, 300)}`);
  console.log('[1] locked:', lockHandle.slice(0, 12) + '...');

  try {
    for (const sub of ['symbols', 'selections']) {
      const url = `${base}/source/${sub}`;
      const accept = `application/vnd.sap.adt.textelements.${sub}.v1`;

      const g = await adt('GET', url, null, { Accept: accept });
      if (g.status >= 400 && g.status !== 404) throw new Error(`GET ${sub}: ${g.status} ${String(g.data).slice(0, 300)}`);
      const etag = g.headers['etag'];
      // 资源尚不存在时 GET 返回 404，此时用 If-None-Match: * 表示"新建"
      const cond = etag ? { 'If-Match': etag } : { 'If-None-Match': '*' };

      const p = await adt('PUT', `${url}?lockHandle=${encodeURIComponent(lockHandle)}${CORR_Q}`, bodyOf(sub), {
        Accept: accept,
        ...cond,
        'Content-Type': `${accept}; charset=utf-8`,
      });
      console.log(`[2] PUT ${sub} => ${p.status}`);
      if (p.status >= 400) throw new Error(`PUT ${sub}: ${p.status} ${String(p.data).slice(0, 400)}`);
    }

    for (const sub of ['symbols', 'selections']) {
      const g = await adt('GET', `${base}/source/${sub}`, null, { Accept: `application/vnd.sap.adt.textelements.${sub}.v1` });
      const lines = String(g.data).trim().split('\n');
      console.log(`[3] ${sub} 回读 ${lines.length} 行:`);
      console.log(lines.slice(0, 6).join('\n'));
    }
  } finally {
    const u = await adt('POST', `${base}?_action=UNLOCK&lockHandle=${encodeURIComponent(lockHandle)}`, null, {});
    console.log('[4] unlocked =>', u.status);
  }

  // [5] 激活：文本元素是独立对象（PROG/PX），必须单独激活，PUT 只落 inactive 版本。
  //     实测：带 corrNr 会 400（激活接口不接受该参数），对象归属由自身已有的请求决定，无需带。
  const actBody =
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">` +
    `<adtcore:objectReference adtcore:uri="${base}" adtcore:type="PROG/PX" adtcore:name="${PROG}"/>` +
    `</adtcore:objectReferences>`;
  const a = await adt('POST', '/sap/bc/adt/activation?method=activate&preauditRequested=true&version=inactive', actBody, {
    'Content-Type': 'application/vnd.sap.adt.activation.v1+xml',
    Accept: 'application/vnd.sap.adt.activation.v1+xml',
  });
  const atxt = String(a.data);
  const executed = /activationExecuted="([^"]*)"/.exec(atxt)?.[1];
  console.log(`[5] activate => ${a.status}  activationExecuted=${executed ?? '(未出现)'}`);
  const msgs = [...atxt.matchAll(/<msg[^>]*type="([EAW])"[^>]*>[\s\S]*?<txt>([\s\S]*?)<\/txt>/g)];
  if (msgs.length) msgs.forEach((m) => console.log(`    [${m[1]}] ${m[2]}`));
  else if (executed !== 'true') console.log('    raw:', atxt.slice(0, 400));

  // [6] 判定激活成功的唯一依据：active 版本有内容（HTTP 200 ≠ 激活成功）
  //     没有文本符号、只有选择文本的程序（如 ZMY_PROG），symbols 回读天然为空
  //     ⇒ 此时改查 selections；两样都空才算真的失败。
  const wantSym = (JSON.parse(fs.readFileSync(TE_FILE, 'utf8')).symbols || []).length > 0;
  const wantSel = (JSON.parse(fs.readFileSync(TE_FILE, 'utf8')).selections || []).length > 0;
  let ok = true;
  if (wantSym) {
    const av = await adt('GET', `${base}/source/symbols?version=active`, null,
      { Accept: 'application/vnd.sap.adt.textelements.symbols.v1' });
    const cur = av.status === 200 && String(av.data).trim() !== '';
    console.log(`[6] active symbols 回读 => ${av.status} ${cur ? '非空 ✓' : '空 ✗'}`);
    ok = ok && cur;
  }
  if (wantSel) {
    const sv = await adt('GET', `${base}/source/selections?version=active`, null,
      { Accept: 'application/vnd.sap.adt.textelements.selections.v1' });
    const cur = sv.status === 200 && String(sv.data).trim() !== '';
    console.log(`[6] active selections 回读 => ${sv.status} ${cur ? '非空 ✓' : '空 ✗'}`);
    ok = ok && cur;
  }
  if (executed !== 'true' || !ok) {
    console.error('激活失败：文本元素仍在 inactive 状态');
    process.exit(1);
  }
  console.log('DONE');
})().catch((e) => {
  console.error('ERR', e.response ? `${e.response.status} ${String(e.response.data).slice(0, 400)}` : e.message);
  process.exit(1);
});
