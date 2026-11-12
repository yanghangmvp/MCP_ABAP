#!/usr/bin/env node
/**
 * 从生产报表生成「无头 E2E 探针」$TMP 程序。
 *
 * 背景：ADT 无头运行（adt.js run）跑不出 ALV（NO_FIELDCATALOG_AVAILABLE），
 *       且报 HTTP 500 时页面短文本可能为空 —— 此时**无法区分**「正常的 ALV 限制」
 *       与「取数链路里的真实转储」。本脚本把生产程序整份复制成 $TMP 同名新程序，
 *       仅做三处外科手术：
 *         1. 改 REPORT 程序名（$TMP 副本）
 *         2. 改选择屏幕默认值（默认工厂常常不是有测试数据的工厂）
 *         3. 把最后一行的 `PERFORM <show_alv> .` 换成自写的 dump FORM
 *       其余**一字不改** —— 这样 frm_init_period / 取数 / 汇总 / 字段目录 / 布局
 *       全部按生产代码原样执行，转储就会在此暴露。
 *
 * 用法:
 *   HARNESS_JSON=scripts/harness/ZMY_PROG3.json node scripts/gen_e2e_harness.js
 *   HARNESS_JSON=... SAP_ENV_FILE=/tmp/sap300.env node scripts/gen_e2e_harness.js --push
 *
 * 配置文件（JSON）字段:
 *   src        生产源码路径（相对仓库根）
 *   out        生成的 $TMP 源码路径
 *   prog       新程序名（建议 ZTEST_<原名>_E2E）
 *   teSource   可选，原程序的文本元素 JSON（scripts/textelements/<PROG>.json）；
 *              给了就自动复制成新程序名的文本元素 JSON（$TMP 副本同样要 TEXT-xxx 符号，
 *              否则源码语法检查过不去）
 *   replace    [[被替换串, 替换串], ...] 按序执行的字符串替换
 *   dumpForm   追加到文件末尾的 FORM 源码（字符串数组，每项一行）
 *   dumpFormFile  可选，dumpForm 的替代：直接指向一个 .abap 片段文件（一行一条）。
 *                 探针 FORM 一大就难以在 JSON 里转义，写独立文件便于编辑与 review。
 *   hookLine   被 hook 的调用行（默认 '  PERFORM frm_show_alv.'），整行替换为 '  PERFORM frm_e2e_dump.'
 *
 * 只生成文件；加 --push 才会推源码 + 文本元素并激活。
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// --- 路径自适应：portable/ = MCP 包目录，env/ = 连接配置目录 ---
const __path = require('path');
const REPO_ROOT = process.env.MCP_ABAP_ROOT || __path.resolve(__dirname, '..');
const MCP_ROOT = process.env.MCP_PROJECT || __path.join(REPO_ROOT, 'portable');
const DEFAULT_ENV_FILE = __path.join(MCP_ROOT, 'env', 'dev.env');
const ROOT = REPO_ROOT;
const cfgPath = process.env.HARNESS_JSON;
if (!cfgPath) {
  console.error('用法: HARNESS_JSON=scripts/harness/<NAME>.json node scripts/gen_e2e_harness.js [--push]');
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, cfgPath), 'utf8'));

const srcAbs = path.join(ROOT, cfg.src);
const outAbs = path.join(ROOT, cfg.out);
let code = fs.readFileSync(srcAbs, 'utf8');

// 1) 程序名
if (!cfg.prog) throw new Error('配置缺 prog');
const origProg = (code.match(/^REPORT\s+([a-z0-9_]+)\s*\./im) || [])[1];
if (!origProg) throw new Error('源文件找不到 REPORT 语句');
code = code.replace(new RegExp(`^REPORT\\s+${origProg}\\s*\\.`, 'im'), `REPORT ${cfg.prog.toLowerCase()}.`);

// 2) 逐条替换
let applied = [];
for (const [from, to] of cfg.replace || []) {
  const n = code.split(from).length - 1;
  if (n === 0) throw new Error(`替换目标未命中（拼写/空格不符）: ${JSON.stringify(from)}`);
  code = code.split(from).join(to);
  applied.push(`${n}x ${JSON.stringify(from.slice(0, 46))}`);
}

// 3) 挂 dump FORM 替换 ALV 显示
const hookLine = cfg.hookLine || '  PERFORM frm_show_alv.';
if (!code.includes(hookLine)) throw new Error(`hook 行未命中: ${JSON.stringify(hookLine)}`);
code = code.replace(hookLine, '  PERFORM frm_e2e_dump.');
if (!/\nFORM frm_e2e_dump\./.test(code)) {
  let dumpLines = cfg.dumpForm || [];
  if (cfg.dumpFormFile) {
    const dfAbs = path.join(ROOT, cfg.dumpFormFile);
    const raw = fs.readFileSync(dfAbs, 'utf8').replace(/\r\n/g, '\n').replace(/\n+$/, '');
    dumpLines = raw.split('\n');
    console.log(`dumpForm  : ${cfg.dumpFormFile} (${dumpLines.length} 行)`);
  }
  code += '\n' + dumpLines.join('\n') + '\n';
}

fs.writeFileSync(outAbs, code);

// 4) 文本元素 JSON（$TMP 副本同样需要符号）
let teOut = null;
if (cfg.teSource) {
  const teAbs = path.join(ROOT, cfg.teSource);
  const te = JSON.parse(fs.readFileSync(teAbs, 'utf8'));
  te.program = cfg.prog;
  teOut = path.join(ROOT, 'scripts/textelements', `${cfg.prog}.json`);
  fs.writeFileSync(teOut, JSON.stringify(te, null, 2));
}

console.log(`原程序    : ${origProg}`);
console.log(`新程序    : ${cfg.prog}`);
console.log(`源码      : ${cfg.out} (${code.split('\n').length} 行)`);
if (teOut) console.log(`文本元素  : scripts/textelements/${cfg.prog}.json`);
applied.forEach((a) => console.log(`  替换 ${a}`));

if (process.argv.includes('--push')) {
  const env = process.env.SAP_ENV_FILE ? { ...process.env } : process.env;
  const pre = process.env.SAP_ENV_FILE ? `SAP_ENV_FILE=${process.env.SAP_ENV_FILE} ` : '';
  // teSource 缺省（如 ZFIB001：程序没有独立文本元素对象，TEXT-xxx 已在 replace 里内联掉）
  // 时必须跳过这一步 —— 否则 TE_FILE=null 会让 push_textelements.js 报 ENOENT。
  if (teOut) {
    console.log('\n--- 推送文本元素 ---');
    execFileSync('bash', ['-lc', `${pre}TE_FILE=${teOut} node scripts/push_textelements.js`], { cwd: ROOT, stdio: 'inherit', env });
  } else {
    console.log('\n--- 无 teSource，跳过文本元素推送 ---');
  }
  console.log('\n--- 推送源码 ---');
  execFileSync('bash', ['-lc', `${pre}SRC_FILE=${outAbs} node scripts/push_prog_source.js`], { cwd: ROOT, stdio: 'inherit', env });
}
