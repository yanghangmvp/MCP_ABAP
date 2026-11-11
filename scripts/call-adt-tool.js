#!/usr/bin/env node
// --- 路径自适应：portable/ = MCP 包目录，env/ = 连接配置目录 ---
const __path = require('path');
const REPO_ROOT = process.env.MCP_ABAP_ROOT || __path.resolve(__dirname, '..');
const MCP_ROOT = process.env.MCP_PROJECT || __path.join(REPO_ROOT, 'portable');
const DEFAULT_ENV_FILE = __path.join(MCP_ROOT, 'env', 'dev.env');
/**
 * 一次性 MCP 工具调用脚本：通过 stdio 拉起 mcp-abap-adt 服务器并调用指定工具。
 * 用法:
 *   SAP_ENV_FILE=$PWD/portable/env/dev.env \
 *   node call-adt-tool.js <ToolName> '<json-args>'
 */
const path = require('node:path');
const fs = require('node:fs');

const MCP_PROJECT = MCP_ROOT;
const resolveInProject = (p) => require.resolve(p, { paths: [MCP_PROJECT] });
const { Client } = require(resolveInProject('@modelcontextprotocol/sdk/client/index.js'));
const { StdioClientTransport } = require(resolveInProject('@modelcontextprotocol/sdk/client/stdio.js'));

const [, , toolName, argsJson] = process.argv;
if (!toolName) {
  console.error('usage: node call-adt-tool.js <ToolName> <json-args>');
  process.exit(1);
}

async function main() {
  const envFile = process.env.SAP_ENV_FILE;
  if (!envFile) {
    console.error('SAP_ENV_FILE not set');
    process.exit(1);
  }
  // 把 env 文件里的键值显式注入子进程环境。
  // 原因：mcp-abap-adt 的 hydrateSystemContextFromEnvFile() 白名单不含 SAP_LANGUAGE，
  // 而 lib/clients.js 的语言注入器在 (systemContext.masterLanguage || process.env.SAP_LANGUAGE)
  // 都取不到时会强制补 sap-language=EN —— 于是走 MCP 创建的对象主语言全落 EN（违反项目 ZH 约定）。
  // 显式传入 SAP_LANGUAGE=ZH 后，新建对象主语言即为 ZH。
  const fileEnv = {};
  try {
    for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (m) fileEnv[m[1]] = m[2].trim();
    }
  } catch {
    /* env 文件由 launcher 再读一次，这里失败不致命 */
  }
  const baseEnv = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string') baseEnv[k] = v;
  }
  // 本机 HTTP(S)_PROXY 指向 127.0.0.1 的本地代理，ADT 请求走代理会出现
  // socket hang up / ECONNRESET / CSRF 校验失败（尤其在 DELETE 上必现）。
  // ADT 是内网直连，这里统一剥掉代理变量。
  for (const k of ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy']) {
    delete baseEnv[k];
  }
  baseEnv.NO_PROXY = '*';
  baseEnv.no_proxy = '*';

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      path.join(MCP_PROJECT, 'dist/server/launcher.js'),
      '--transport=stdio',
      '--env=' + envFile,
      '--exposition=readonly,high',
    ],
    env: { ...baseEnv, ...fileEnv },
  });
  const client = new Client({ name: 'adhoc-runner', version: '1.0.0' });
  await client.connect(transport);
  try {
    let args = {};
    if (argsJson) {
      args = argsJson.startsWith('@')
        ? JSON.parse(require('node:fs').readFileSync(argsJson.slice(1), 'utf8'))
        : JSON.parse(argsJson);
    }
    const result = await client.callTool({ name: toolName, arguments: args }, undefined, { timeout: 300000 });
    const texts = (result.content || [])
      .filter((c) => c.type === 'text')
      .map((c) => c.text);
    console.log(texts.join('\n') || JSON.stringify(result));
    if (result.isError) process.exit(2);
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error('FAILED:', e && e.message ? e.message : e);
  process.exit(1);
});
