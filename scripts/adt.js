// --- 路径自适应：portable/ = MCP 包目录，env/ = 连接配置目录 ---
const __path = require('path');
const REPO_ROOT = process.env.MCP_ABAP_ROOT || __path.resolve(__dirname, '..');
const MCP_ROOT = process.env.MCP_PROJECT || __path.join(REPO_ROOT, 'portable');
const DEFAULT_ENV_FILE = __path.join(MCP_ROOT, 'env', 'dev.env');
/**
 * 通用 ADT 直连工具（独立会话，可指定集团）
 *
 * 用途：
 *   - 在指定 client 上跑数据预览查询 / 运行 ABAP 程序
 *   - 补 MCP 工具不能带 client 的短板（MCP 固定用 env 里的集团）
 *
 * 用法：
 *   node scripts/adt.js query "SELECT bukrs, butxt FROM t001" [rowNumber]
 *   node scripts/adt.js run ZSOME_REPORT
 *   node scripts/adt.js table ANKA 50          # 相当于 SELECT * 前 N 行
 *   node scripts/adt.js dumps [user] [top]     # 列最近短转储（ST22）
 *   node scripts/adt.js dump "<dump_id>"       # 读某条短转储全文
 *
 * 集团：默认取 portable/env/dev.env 的 SAP_CLIENT，可用 SAP_CLIENT_OVERRIDE 覆盖
 *   SAP_CLIENT_OVERRIDE=300 node scripts/adt.js query "..."
 *
 * 短转储排查套路：接口跑出 500 时，用 dumps 拿到 id，再 dump 读全文，
 *   看 “Error analysis” 段的 procedure 名 + CX_SY_* 异常类，即可定位到具体语句。
 *
 * 注意：必须 proxy:false —— 本机 HTTP(S)_PROXY 指向 127.0.0.1，会让 ADT 请求打到代理上。
 *       异常只打印 e.message，避免 axios 错误对象把 Basic Auth 凭据打到终端。
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

const CLIENT = process.env.SAP_CLIENT_OVERRIDE || env.SAP_CLIENT || '';
// 会话/登录语言：不设时 SAP 取用户主语言（本系统为 EN）。
// 需要按指定语言运行报表（例如 SD BAPI 按登录语言查找产品组文本）时，
// 用 SAP_LANGUAGE_OVERRIDE=zh 指定，ADT 会以该语言建立会话。
const LANG = process.env.SAP_LANGUAGE_OVERRIDE || '';

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
    ...(LANG ? { 'sap-language': LANG } : {}),
    ...(cookieHeader() ? { Cookie: cookieHeader() } : {}),
    ...(csrf ? { 'x-csrf-token': csrf } : {}),
    ...extraHeaders,
  };
  const res = await http.request({ method, url, data, headers });
  for (const c of res.headers['set-cookie'] || []) {
    const [pair] = c.split(';');
    const i = pair.indexOf('=');
    if (i > 0) cookies[pair.slice(0, i)] = pair.slice(i + 1);
  }
  if (res.headers['x-csrf-token']) csrf = res.headers['x-csrf-token'];
  return res;
}

// SAP 数据预览返回列式 XML：
//   <dataPreview:columns>
//     <dataPreview:metadata dataPreview:name="BUKRS" dataPreview:type="C" .../>
//     <dataPreview:dataSet><dataPreview:data>0001</dataPreview:data>...</dataPreview:dataSet>
//   </dataPreview:columns>
// 一列一个 columns 块，需按列取值后转置成行。
function parseTable(xml) {
  const s = String(xml);
  const blocks = s.match(/<dataPreview:columns>[\s\S]*?<\/dataPreview:columns>/g) || [];
  const cols = [];
  const colValues = [];
  for (const b of blocks) {
    const name = (b.match(/dataPreview:name="([^"]*)"/) || [])[1] || '';
    const type = (b.match(/dataPreview:type="([^"]*)"/) || [])[1] || '';
    const vals = [];
    const re = /<dataPreview:data(?:\s*\/>|>([\s\S]*?)<\/dataPreview:data>)/g;
    let m;
    while ((m = re.exec(b)) !== null) vals.push(m[1] === undefined ? '' : unescapeXml(m[1]));
    cols.push({ name, type });
    colValues.push(vals);
  }
  const n = colValues.length ? Math.max(...colValues.map((v) => v.length)) : 0;
  const rows = [];
  for (let i = 0; i < n; i++) {
    rows.push(colValues.map((v) => (v[i] === undefined ? '' : v[i])));
  }
  const total = (s.match(/<dataPreview:totalRows>(\d+)<\/dataPreview:totalRows>/) || [])[1];
  const msg = (s.match(/<dataPreview:message[^>]*dataPreview:text="([^"]*)"/) || [])[1];
  return { cols, rows, total, msg: msg ? unescapeXml(msg) : '' };
}

function unescapeXml(s) {
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function errorMessage(body) {
  const m = String(body).match(/<message[^>]*>([^<]*)<\/message>/);
  return m ? m[1] : String(body).slice(0, 300);
}

(async () => {
  const [cmd, arg1, arg2] = process.argv.slice(2);
  if (!cmd) {
    console.error('usage: adt.js query "<sql>" [rowNumber] | run <program> | table <tabname> [rows]');
    process.exit(1);
  }
  console.log(`[adt] client = ${CLIENT || '(系统默认)'}, 命令 = ${cmd}`);

  let r = await adt('GET', '/sap/bc/adt/core/discovery', null, { 'x-csrf-token': 'Fetch' });
  if (!csrf) {
    console.error('[adt] 未能取得 CSRF token, status =', r.status, errorMessage(r.data));
    process.exit(1);
  }

  if (cmd === 'query' || cmd === 'table') {
    const rows = Number(arg2) || 100;
    const sql = cmd === 'table' ? `SELECT * FROM ${arg1}` : arg1;
    if (!sql) {
      console.error('缺少 SQL');
      process.exit(1);
    }
    r = await adt('POST', `/sap/bc/adt/datapreview/freestyle?rowNumber=${rows}`, sql, {
      'Content-Type': 'text/plain; charset=utf-8',
      Accept: 'application/xml, application/vnd.sap.adt.datapreview.table.v1+xml',
    });
    if (r.status >= 400) {
      console.error(`[adt] 查询失败 ${r.status}: ${errorMessage(r.data)}`);
      process.exit(1);
    }
    const { cols, rows: data, total, msg } = parseTable(r.data);
    if (msg) console.log('[adt][SAP 提示] ' + msg);
    if (data.length === 0 || process.env.ADT_RAW) {
      console.log('[adt][raw] ' + String(r.data).slice(0, 1200));
    }
    console.log('[adt] ' + (cols.map((c) => c.name).join('\t') || '(无列信息)'));
    for (const row of data) console.log('[adt] ' + row.join('\t'));
    console.log(`[adt] 返回 ${data.length} 行${total !== undefined ? ` / totalRows=${total}` : ''}`);
    return;
  }

  if (cmd === 'run') {
    const name = String(arg1).toUpperCase();
    r = await adt('POST', `/sap/bc/adt/programs/programrun/${name}`, null, {
      Accept: 'text/plain',
      'X-sap-adt-profiling': 'server-time',
    });
    console.log('[adt] run status =', r.status);
    console.log(typeof r.data === 'string' ? r.data : JSON.stringify(r.data));
    if (r.status >= 400) console.error('[adt] ' + errorMessage(r.data));
    return;
  }

  if (cmd === 'dumps') {
    const [user, topArg, fromArg, toArg] = [arg1, arg2, process.argv[5], process.argv[6]];
    const top = Number(topArg) || 10;
    const p = new URLSearchParams();
    if (user) p.set('$query', `and( equals( user, ${user} ) )`);
    p.set('$top', String(top));
    if (fromArg) p.set('from', fromArg);
    if (toArg) p.set('to', toArg);
    r = await adt('GET', `/sap/bc/adt/runtime/dumps?${p.toString()}`, null, {
      Accept: 'application/atom+xml;type=feed',
    });
    if (r.status >= 400) {
      console.error(`[adt] 取转储列表失败 ${r.status}: ${errorMessage(r.data)}`);
      process.exit(1);
    }
    // ADT 返回 atom:entry 带命名空间前缀，需兼容
    if (process.env.ADT_RAW) {
      const b = String(r.data);
      console.log('[adt][raw] status=' + r.status + ' ct=' + r.headers['content-type'] + ' len=' + b.length);
      console.log('[adt][raw] head=' + b.slice(0, 300));
      console.log('[adt][raw] tail=' + b.slice(-500));
    }
    const body = String(r.data).replace(/<\/?atom:/g, (m) => m.replace('atom:', ''));
    // 开标签可能带属性（如 xml:base），不能只匹配 <entry>
    const entries = body.match(/<entry\b[^>]*>[\s\S]*?<\/entry>/g) || [];
    if (process.env.ADT_RAW) {
      console.log('[adt][raw] bodyLen=' + body.length + ' entryTokens=' + ((body.match(/entry/g) || []).length) + ' matched=' + entries.length);
    }
    for (const e of entries) {
      const id = (e.match(/<id>([\s\S]*?)<\/id>/) || [])[1] || '';
      const title = (e.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || '';
      const upd = (e.match(/<updated>([\s\S]*?)<\/updated>/) || [])[1] || '';
      const key = decodeURIComponent(id.split('/dumps/').pop() || '');
      console.log(`[adt] ${upd}  ${unescapeXml(title)}`);
      console.log(`[adt]   id=${key}`);
    }
    console.log(`[adt] 共 ${entries.length} 条`);
    return;
  }

  if (cmd === 'dump') {
    const id = String(arg1 || '');
    if (!id) {
      console.error('用法: adt.js dump "<dump_id>"');
      process.exit(1);
    }
    r = await adt('GET', `/sap/bc/adt/runtime/dump/${encodeURIComponent(id)}/formatted`, null, {
      Accept: 'text/plain',
    });
    console.log('[adt] dump status =', r.status);
    console.log(typeof r.data === 'string' ? r.data : JSON.stringify(r.data));
    if (r.status >= 400) console.error('[adt] ' + errorMessage(r.data));
    return;
  }

  console.error('未知命令:', cmd);
  process.exit(1);
})().catch((e) => {
  console.error('[adt] ERROR:', e && e.message ? e.message : e);
  process.exit(1);
});
