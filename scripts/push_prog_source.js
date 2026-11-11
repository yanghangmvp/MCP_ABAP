#!/usr/bin/env node
// --- 路径自适应：portable/ = MCP 包目录，env/ = 连接配置目录 ---
const __path = require('path');
const REPO_ROOT = process.env.MCP_ABAP_ROOT || __path.resolve(__dirname, '..');
const MCP_ROOT = process.env.MCP_PROJECT || __path.join(REPO_ROOT, 'portable');
const DEFAULT_ENV_FILE = __path.join(MCP_ROOT, 'env', 'dev.env');
/**
 * 推送可执行报表(REPORT)源码到 SAP 并激活（$TMP 默认）。
 * 流程: POST 创建 PROG -> LOCK -> PUT source/main -> UNLOCK -> ACTIVATE
 *
 * 用法:
 *   SRC_FILE=/abs/x.abap [PKG=$TMP] node scripts/push_prog_source.js
 *   SAP_ENV_FILE=/tmp/sap300.env SRC_FILE=... node scripts/push_prog_source.js
 *
 * 注意:
 *   - 必须剥掉本机 HTTP(S)_PROXY，否则 ADT 请求走 127.0.0.1 代理会 socket hang up。
 *   - 集团取 env 文件的 SAP_CLIENT，要换集团就换 SAP_ENV_FILE。
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
// 与 adt.js / push_fm_source.js / get_source.js 保持一致的集团切换口径
if (process.env.SAP_CLIENT_OVERRIDE) {
  process.env.SAP_CLIENT = process.env.SAP_CLIENT_OVERRIDE;
  env.SAP_CLIENT = process.env.SAP_CLIENT_OVERRIDE;
}

const { getConfig } = require(MCP + '/dist/lib/config.js');
const { createAbapConnection } = require(resolveInProject('@mcp-abap-adt/connection'));

const SRC_FILE = process.env.SRC_FILE;
if (!SRC_FILE) { console.error('SRC_FILE not set'); process.exit(1); }
const source = fs.readFileSync(SRC_FILE, 'utf8');
// PROG_NAME 显式指定时按它走（INCLUDE 程序源码里没有 REPORT 语句）。
// PROG_TYPE=include 时创建类型用 PROG/I，否则 PROG/P。
const ENV_PROG = (process.env.PROG_NAME || '').trim().toUpperCase();
const PROG_TYPE = (process.env.PROG_TYPE || 'executable').toLowerCase() === 'include' ? 'PROG/I' : 'PROG/P';
// TRDIR-SUBC 的真实来源是 program:programType（I=include / 1=可执行），adtcore:type 只标资源类别
const PROG_SUB = process.env.PROG_SUB_OVERRIDE || (PROG_TYPE === 'PROG/I' ? 'include' : 'executableProgram');
let progUpper;
if (ENV_PROG) {
  progUpper = ENV_PROG;
} else {
  const mRep = source.match(/^\s*REPORT\s+(z\w+)/im);
  if (!mRep) { console.error('REPORT name not found（INCLUDE 请传 PROG_NAME）'); process.exit(1); }
  progUpper = mRep[1].toUpperCase();
}
const progLower = progUpper.toLowerCase();
// include 是独立资源：/sap/bc/adt/programs/includes（POST 到 /programs/programs 会一律建成可执行程序）
const BASE_PATH = PROG_TYPE === 'PROG/I' ? '/sap/bc/adt/programs/includes' : '/sap/bc/adt/programs/programs';
const PACKAGE = process.env.PKG || '$TMP';
// 对象落在可传输包里时必须指定传输请求（父请求号，不是任务号），否则 LOCK/CREATE 会报
// "Object ... requires a transport request"。$TMP 对象不需要。
const WANT_CORR = process.env.CORR_NR || '';
// 程序标题（SE38 属性里的「标题」，即 TRDIRT.TEXT）。
// ★ 不传的话 SAP 会落成模板默认值 'DIAG'，而且程序一旦创建过就 skip create ⇒ 永远改不回来。
//   所以推程序一律显式给 DESC；已存在的程序若 DESC 与现网不同，本脚本会自动回写。
const DESC = (process.env.DESC || '').trim();
// 传输请求在 PUT 的 URL 里要用全小写参数名 corrNr
const CORR_Q = (first) => (WANT_CORR ? `${first ? '?' : '&'}corrNr=${encodeURIComponent(WANT_CORR)}` : '');

console.log(`env=${ENV_FILE} client=${env.SAP_CLIENT || '?'} program=${progUpper} package=${PACKAGE} lines=${source.split('\n').length}`);

const ACCEPT_LOCK =
  'application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result;q=0.8, ' +
  'application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result2;q=0.9';

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
  console.log('csrf =>', csrf ? csrf.slice(0, 12) + '...' : '(none)');
  try { if (csrf && conn.setCsrfToken) conn.setCsrfToken(csrf); } catch (e) { /* ignore */ }
  const CSRFH = csrf ? { 'x-csrf-token': csrf } : {};

  const base = `${BASE_PATH}/${progLower}`;

  let exists = false;
  let curDesc = '';
  let curPkg = PACKAGE;
  let curType = '';
  let curSub = '';
  try {
    const g0 = await conn.makeAdtRequest({ url: base, method: 'GET' });
    exists = g0.status === 200;
    if (exists) {
      const xml = String(g0.data);
      curDesc = xml.match(/adtcore:description="([^"]*)"/)?.[1] || '';
      curPkg = xml.match(/<adtcore:packageRef[^>]*adtcore:name="([^"]*)"/)?.[1] || PACKAGE;
      curType = xml.match(/adtcore:type="([^"]*)"/)?.[1] || '';
      // TRDIR-SUBC 的实际值：programType（I=include / 1=可执行）
      curSub = xml.match(/program:programType="([^"]*)"/)?.[1] || '';
    }
  } catch (e) { exists = false; }

  if (!exists) {
    const lang = env.SAP_LANGUAGE || 'ZH';
    const desc = DESC || progUpper;
    const resp = env.SAP_USER || env.SAP_USERNAME || '';
    const createBody = PROG_TYPE === 'PROG/I'
      ? `<?xml version="1.0" encoding="utf-8"?>` +
        `<include:abapInclude xmlns:include="http://www.sap.com/adt/programs/includes"` +
        ` xmlns:adtcore="http://www.sap.com/adt/core"` +
        ` adtcore:name="${progUpper}" adtcore:description="${desc}" adtcore:type="PROG/I"` +
        ` adtcore:language="${lang}" adtcore:masterLanguage="${lang}"` +
        ` adtcore:responsible="${resp}">` +
        `<adtcore:packageRef adtcore:name="${PACKAGE}"/>` +
        `</include:abapInclude>`
      : `<?xml version="1.0" encoding="utf-8"?>` +
        `<program:abapProgram xmlns:program="http://www.sap.com/adt/programs/programs"` +
        ` xmlns:adtcore="http://www.sap.com/adt/core"` +
        ` adtcore:name="${progUpper}" adtcore:description="${desc}" adtcore:type="PROG/P"` +
        ` adtcore:masterLanguage="${lang}" adtcore:responsible="${resp}"` +
        ` abapLanguageVersion="standard" program:programType="${PROG_SUB}" program:application="*">` +
        `<adtcore:packageRef adtcore:name="${PACKAGE}"/>` +
        `</program:abapProgram>`;
    try {
      const c = await conn.makeAdtRequest({
        url: `${BASE_PATH}?pureCreation=true` + CORR_Q(false),
        method: 'POST',
        data: createBody,
        headers: { 'Content-Type': 'application/vnd.sap.adt.programs.v2+xml', Accept: 'application/vnd.sap.adt.programs.v2+xml', ...CSRFH },
      });
      console.log('create =>', c.status, WANT_CORR ? `(corrNr=${WANT_CORR})` : '', `(标题: ${desc})`);
    } catch (ec) {
      const txt = ec.response ? String(ec.response.data) : ec.message;
      if (/已存在|already exists/i.test(txt)) {
        console.log('已存在（GET 未取到，按既有对象继续）');
      } else {
        throw ec;
      }
    }
  } else {
    console.log(`already exists, skip create${curDesc ? `  当前标题: ${curDesc}` : ''}`);
  }

  const lockResp = await conn.makeAdtRequest({
    url: `${base}?_action=LOCK&accessMode=MODIFY${CORR_Q(false)}`,
    method: 'POST',
    headers: { Accept: ACCEPT_LOCK, ...CSRFH },
  });
  const lockHandle = String(lockResp.data).match(/<LOCK_HANDLE>([^<]+)<\/LOCK_HANDLE>/)?.[1];
  if (!lockHandle) throw new Error('no LOCK_HANDLE: ' + String(lockResp.data).slice(0, 300));
  console.log('locked =>', lockHandle.slice(0, 12) + '...');

  try {
    // 标题回写：已存在的程序创建后描述就冻结了，必须用 lockHandle 单独 PUT 元信息改。
    // 包要用**现网读到的**（不能用本次 PKG，否则会把程序挪包）。
    if (PROG_TYPE !== 'PROG/I' && ((DESC && DESC !== curDesc) || (curType && curType !== PROG_TYPE) || (curSub && curSub !== PROG_SUB))) {
      const metaBody =
        `<?xml version="1.0" encoding="utf-8"?>` +
        `<program:abapProgram xmlns:program="http://www.sap.com/adt/programs/programs"` +
        ` xmlns:adtcore="http://www.sap.com/adt/core"` +
        ` adtcore:name="${progUpper}" adtcore:description="${DESC}" adtcore:type="${PROG_TYPE}"` +
        ` adtcore:masterLanguage="${env.SAP_LANGUAGE || 'ZH'}" abapLanguageVersion="standard"` +
        ` program:programType="${PROG_SUB}" program:application="*">` +
        `<adtcore:packageRef adtcore:name="${curPkg}"/>` +
        `</program:abapProgram>`;
      try {
        const pm = await conn.makeAdtRequest({
          url: `${base}?lockHandle=${encodeURIComponent(lockHandle)}${CORR_Q(false)}`,
          method: 'PUT',
          data: metaBody,
          headers: { 'Content-Type': 'application/vnd.sap.adt.programs.v2+xml', Accept: 'application/vnd.sap.adt.programs.v2+xml', ...CSRFH },
        });
        console.log(`PUT meta => ${pm.status}  (标题: ${curDesc || '(空)'} -> ${DESC}, 类型: ${curType || '?'} -> ${PROG_TYPE}, SUBC: ${curSub || '?'} -> ${PROG_SUB})`);
      } catch (e) {
        console.log('PUT meta 失败（不影响源码推送）:', e.response ? e.response.status : e.message);
        if (e.response && e.response.data) console.log('  metaErr:', String(e.response.data).slice(0, 500));
      }
    } else if (!DESC) {
      console.log(`!! 未传 DESC，程序标题保持现状 (${curDesc || '空'}) —— 建议补上 DESC="中文短名"`);
    }

    const putResp = await conn.makeAdtRequest({
      url: `${base}/source/main?lockHandle=${encodeURIComponent(lockHandle)}${CORR_Q(false)}`,
      method: 'PUT',
      data: source,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', Accept: 'text/plain', ...CSRFH },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    console.log('PUT source =>', putResp.status);
  } finally {
    const u = await conn.makeAdtRequest({
      url: `${base}?_action=UNLOCK&lockHandle=${encodeURIComponent(lockHandle)}`,
      method: 'POST',
      headers: CSRFH,
    });
    console.log('unlocked =>', u.status);
  }

  const actBody =
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">` +
    `<adtcore:objectReference adtcore:uri="${base}" adtcore:type="${PROG_TYPE}" adtcore:name="${progUpper}"/>` +
    `</adtcore:objectReferences>`;
  const a = await conn.makeAdtRequest({
    url: '/sap/bc/adt/activation?method=activate&preauditRequested=true&version=inactive',
    method: 'POST',
    data: actBody,
    headers: { 'Content-Type': 'application/vnd.sap.adt.activation.v1+xml', Accept: 'application/vnd.sap.adt.activation.v1+xml', ...CSRFH },
  });
  console.log('activate =>', a.status);
  const body = String(a.data);
  if (/activationExecuted="false"/.test(body)) {
    const msgs = [...body.matchAll(/<msg[^>]*type="([EAW])"[^>]*>[\s\S]*?<txt>([\s\S]*?)<\/txt>/g)];
    msgs.forEach((m) => console.log(`  [${m[1]}] ${m[2]}`));
    if (!msgs.length) console.log('  (no message text, raw head)', body.slice(0, 400));
  }

  const g = await conn.makeAdtRequest({ url: base, method: 'GET' });
  console.log('final version =>', String(g.data).match(/adtcore:version="([^"]+)"/)?.[1]);
  console.log('description =>', String(g.data).match(/adtcore:description="([^"]*)"/)?.[1] || '(空)');
  console.log('DONE');
  conn.setSessionType('stateless');
})().catch((e) => {
  const d = e.response ? `${e.response.status} ${String(e.response.data).slice(0, 500)}` : e.message;
  console.error('ERR', d);
  process.exit(1);
});
