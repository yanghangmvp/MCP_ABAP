#!/usr/bin/env node
// --- 路径自适应：portable/ = MCP 包目录，env/ = 连接配置目录 ---
const __path = require('path');
const REPO_ROOT = process.env.MCP_ABAP_ROOT || __path.resolve(__dirname, '..');
const MCP_ROOT = process.env.MCP_PROJECT || __path.join(REPO_ROOT, 'portable');
const DEFAULT_ENV_FILE = __path.join(MCP_ROOT, 'env', 'dev.env');
/**
 * 通用 ADT 源码读取工具（只读）。
 *
 * 用法:
 *   SAP_ENV_FILE=/abs/x.env node scripts/get_source.js <TYPE> <NAME> [SUB]
 *     TYPE: PROG | INCL | FM | CLAS | TABL | STRU | DTEL
 *     NAME: 对象名（大小写不敏感）
 *     SUB : FM 时必填 = 函数组名；输出到文件时用 --out=<path>
 *
 * 例:
 *   node scripts/get_source.js PROG ZMY_PROG
 *   node scripts/get_source.js FM ZMY_FM ZFG_MY
 *   node scripts/get_source.js PROG ZMY_PROG --out=/tmp/zmy_prog.abap
 *
 * 注意: 必须 proxy:false（本机 HTTP(S)_PROXY 指向 127.0.0.1），否则 socket hang up。
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const fs = require('fs');
const { randomUUID } = require('crypto');

const MCP_PROJECT = MCP_ROOT;
const axios = require(require.resolve('axios', { paths: [MCP_PROJECT] }));

const ENV_FILE = process.env.SAP_ENV_FILE || DEFAULT_ENV_FILE;
const env = {};
for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const outArg = process.argv.slice(2).find((a) => a.startsWith('--out='));
const TYPE = (args[0] || '').toUpperCase();
const NAME = args[1] || '';
const SUB = args[2] || '';
const CLIENT = process.env.SAP_CLIENT_OVERRIDE || env.SAP_CLIENT || '';

if (!TYPE || !NAME) {
  console.error('usage: get_source.js <PROG|INCL|FM|CLAS|TABL|STRU|DTEL> <NAME> [GROUP] [--out=path]');
  process.exit(2);
}

const L = (s) => String(s).toLowerCase();

function uri(type, name, sub) {
  switch (type) {
    case 'PROG': return `/sap/bc/adt/programs/programs/${L(name)}/source/main`;
    case 'INCL': return `/sap/bc/adt/programs/includes/${L(name)}/source/main`;
    case 'FM': return `/sap/bc/adt/functions/groups/${L(sub)}/fmodules/${L(name)}/source/main`;
    case 'CLAS': return `/sap/bc/adt/oo/classes/${L(name)}/source/main`;
    case 'CLASD': return `/sap/bc/adt/oo/classes/${L(name)}/source/definitions`;
    case 'CLASI': return `/sap/bc/adt/oo/classes/${L(name)}/source/implementations`;
    case 'INTF': return `/sap/bc/adt/oo/interfaces/${L(name)}/source/main`;
    case 'TABL': return `/sap/bc/adt/ddic/tables/${L(name)}/source/main`;
    case 'STRU': return `/sap/bc/adt/ddic/structures/${L(name)}/source/main`;
    case 'DTEL': return `/sap/bc/adt/ddic/dataelements/${L(name)}`;
    default: throw new Error(`unsupported type ${type}`);
  }
}

const http = axios.create({
  baseURL: env.SAP_URL,
  timeout: 120000,
  validateStatus: () => true,
  auth: { username: env.SAP_USERNAME, password: env.SAP_PASSWORD },
  proxy: false,
  ...(CLIENT ? { params: { 'sap-client': CLIENT } } : {}),
});

(async () => {
  const url = uri(TYPE, NAME, SUB);
  const res = await http.request({
    method: 'GET',
    url,
    headers: {
      Accept: 'text/plain',
      'sap-adt-connectionid': randomUUID().replace(/-/g, ''),
      'x-sap-adt-sessiontype': 'stateless',
    },
  });
  if (res.status >= 400) {
    console.error(`ERR ${res.status} ${String(res.data).slice(0, 400)}`);
    process.exit(1);
  }
  const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
  if (outArg) {
    fs.writeFileSync(outArg.slice(6), text, 'utf8');
    console.error(`[get_source] client=${CLIENT} ${TYPE} ${NAME} -> ${outArg.slice(6)} (${text.length} chars, ${text.split('\n').length} lines)`);
  } else {
    console.error(`[get_source] client=${CLIENT} ${TYPE} ${NAME} (${text.length} chars, ${text.split('\n').length} lines)`);
    process.stdout.write(text);
  }
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
