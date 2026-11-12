#!/usr/bin/env node
/**
 * 程序 GUI 状态（CUA）登记器 —— 配置驱动，接在"生成程序"流程里跑。
 *
 *   node scripts/gen_cua.js                      # 处理 config/ 下全部配置
 *   node scripts/gen_cua.js ZMY_PROGB ZMY_PROGC    # 只处理指定程序
 *   node scripts/gen_cua.js --dry                # 只预演，不写 SAP
 *
 * 做四件事：
 *   1. 读 scripts/cua/config/<PROG>.json（按钮清单：功能码 / 文字 / 图标 / 信息文本）
 *   2. 注入模板 scripts/cua/ZCUA_APPLY.tpl.abap → _build/ZCUA_APPLY.abap
 *   3. 推送并激活到 SAP（$TMP，集团取 env/dev.env）
 *   4. 运行 ZCUA_APPLY，校验 write rc=0 且回读四项全 Y
 *
 * pfno（功能键号）与 but_no（按钮序号）**不用配**，ABAP 侧自动分配：
 * 先按 pfnoPool 顺序挑空位，池子用尽才从 pfnoStart 起顺序找；重跑按 code 沿用旧号，幂等。
 *
 * ⚠️ pfnoPool 只能填 01-48 的槽位号。49+ 不在生成的 CUA 功能键表里，
 *    按钮画得出来但一点就报「无效脚本标识」（WebGui）。2026-09-18 已踩过。
 *    也不要指望 noPfk：'S' 是工具栏分隔符，开了按钮会全消失。
 *
 * 配置格式见 scripts/cua/config/ZMY_PROGA.json。
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// --- 路径自适应：portable/ = MCP 包目录，env/ = 连接配置目录 ---
const __path = require('path');
const REPO_ROOT = process.env.MCP_ABAP_ROOT || __path.resolve(__dirname, '..');
const MCP_ROOT = process.env.MCP_PROJECT || __path.join(REPO_ROOT, 'portable');
const DEFAULT_ENV_FILE = __path.join(MCP_ROOT, 'env', 'dev.env');
const ROOT = REPO_ROOT;
const CUA_DIR = path.join(ROOT, 'scripts/cua');
const CFG_DIR = path.join(CUA_DIR, 'config');
const BUILD_DIR = path.join(CUA_DIR, '_build');
const TPL = path.join(CUA_DIR, 'ZCUA_APPLY.tpl.abap');
const BUILD = path.join(BUILD_DIR, 'ZCUA_APPLY.abap');
const ENV_FILE = DEFAULT_ENV_FILE;

// 字段长度上限（对应域：GUI_FUNC / GUI_TEXT / GUI_ICTEXT / GUI_INFO）
const MAXLEN = { code: 20, text: 40, iconId: 4, iconName: 30, iconText: 40, infoText: 60 };

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const names = args.filter((a) => !a.startsWith('-'));

function die(msg) {
  console.error('ERR ' + msg);
  process.exit(1);
}

// ---------- 1. 读配置 ----------
if (!fs.existsSync(CFG_DIR)) die('配置目录不存在: ' + CFG_DIR);
let files = fs
  .readdirSync(CFG_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort();
if (names.length) {
  const want = new Set(names.map((n) => n.toUpperCase()));
  files = files.filter((f) => want.has(path.basename(f, '.json').toUpperCase()));
  const found = new Set(files.map((f) => path.basename(f, '.json').toUpperCase()));
  for (const w of want) if (!found.has(w)) die('找不到配置: config/' + w + '.json');
}
if (!files.length) die('没有可处理的配置文件');

const cfgs = [];
for (const f of files) {
  const p = path.join(CFG_DIR, f);
  let c;
  try {
    c = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    die(f + ' JSON 解析失败: ' + e.message);
  }
  const prog = String(c.prog || path.basename(f, '.json')).toUpperCase();
  if (!/^Z[A-Z0-9_]{1,29}$/.test(prog)) die(f + ' 程序名非法: ' + prog);
  if (!Array.isArray(c.buttons) || !c.buttons.length) die(f + ' 缺少 buttons 数组');
  // pfnoPool：优先占用的功能键槽位（必须 ≤48，49+ 在 WebGui 下点按钮会报
  // “无效脚本标识”——RSMPE_BUT 靠 pfno 引用 PFK，槽位不在生成的 CUA 里即失败）
  const pool = Array.isArray(c.pfnoPool) ? c.pfnoPool : [];
  if (pool.some((v) => Number(v) > 48)) die(f + ' pfnoPool 只能填 01-48 的槽位号');
  cfgs.push({
    file: f, prog, baseline: c.baseline || '',
    pfnoStart: c.pfnoStart || 49, noPfk: !!c.noPfk,
    pfnoPool: pool.map((v) => String(Number(v)).padStart(2, '0')),
    buttons: c.buttons,
  });
}

// 基线：全配置必须一致（模板里只有一个 c_baseline 常量）
const baselines = [...new Set(cfgs.map((c) => c.baseline).filter(Boolean))];
if (baselines.length > 1) die('各配置的 baseline 不一致: ' + baselines.join(' / '));
const BASELINE = baselines[0] || 'ZMY_PROGA';
const PFNO_START = cfgs[0].pfnoStart;
// 优先槽位：取所有配置的并集（按 A/B/C/D 声明顺序去重），引号内逗号分隔
const PFNO_POOL = [...new Set(cfgs.flatMap((c) => c.pfnoPool))].join(',');
// noPfk：是否不绑功能键。实测 pfno='S' 是工具栏分隔符 —— 开了按钮会全消失，
// 所以只作保留开关，默认不要启用。全配置一致。
const NO_PFK = cfgs.every((c) => c.noPfk) ? 'X' : ' ';

// ---------- 2. 校验 ----------
let bad = 0;
const codesAll = new Map();
for (const c of cfgs) {
  const seen = new Set();
  for (const b of c.buttons) {
    const tag = `${c.prog}/${b.code || '?'}`;
    for (const k of ['code', 'text', 'iconId', 'iconName', 'iconText', 'infoText']) {
      if (!b[k]) {
        console.error(`ERR ${tag} 缺字段 ${k}`);
        bad++;
      } else if (String(b[k]).length > MAXLEN[k]) {
        console.error(`ERR ${tag} 字段 ${k} 超长 (${String(b[k]).length} > ${MAXLEN[k]})`);
        bad++;
      }
    }
    if (b.code) {
      const code = String(b.code).toUpperCase();
      if (seen.has(code)) {
        console.error(`ERR ${tag} 同一程序内功能码重复`);
        bad++;
      }
      seen.add(code);
      if (codesAll.has(code + '@' + c.prog)) {
        console.error(`ERR ${tag} 重复定义`);
        bad++;
      }
      codesAll.set(code + '@' + c.prog, true);
      // 允许 '&' 前缀：ALV 回调程序的惯例功能码（如 &SEND/&SHOW，
      // 集团 ZFI221 原状态即用 & 码；strip_zcodes 只剔 Z 码不受影响）
      if (!/^[&A-Z][A-Z0-9_]*$/.test(code)) {
        console.error(`ERR ${tag} 功能码只能 & A-Z 0-9 _，且不以数字开头`);
        bad++;
      }
    }
    if (b.iconId && !/^@..@$/.test(String(b.iconId))) {
      console.error(`ERR ${tag} iconId 应形如 @XX@，实为 ${b.iconId}`);
      bad++;
    }
  }
}
if (bad) die(`配置校验失败，共 ${bad} 处`);

// ---------- 3. 生成 ABAP ----------
const esc = (s) => String(s).replace(/'/g, "''");

const lines = [];
for (const c of cfgs) {
  lines.push(`* --- ${c.prog} ---`);
  for (const b of c.buttons) {
    const code = String(b.code).toUpperCase().padEnd(8);
    lines.push(
      `    ( prog = '${c.prog}' code = '${esc(code)}' ftext = '${esc(b.text)}'`
    );
    lines.push(
      `      icon_id = '${esc(b.iconId)}' icon_name = '${esc(b.iconName)}'` +
        ` icon_text = '${esc(b.iconText)}'` +
        ` info_text = '${esc(b.infoText)}' )`
    );
  }
}

const tpl = fs.readFileSync(TPL, 'utf8');
if (!tpl.includes('*{{TARGET}}')) die('模板缺少 *{{TARGET}} 占位符');
const src = tpl
  .replace('*{{TARGET}}', lines.join('\n'))
  .replace("'{{DO_WRITE}}'", DRY ? "' '" : "'X'")
  .replace("'{{BASELINE}}'", `'${esc(BASELINE)}'`)
  .replace("'{{PFNO_START}}'", `'${esc(PFNO_START)}'`)
  .replace("'{{PFNO_POOL}}'", `'${esc(PFNO_POOL)}'`)
  .replace("'{{NO_PFK}}'", `'${esc(NO_PFK)}'`);

if (/\{\{\w+\}\}/.test(src)) die('模板仍有未替换的占位符: ' + src.match(/\{\{\w+\}\}/)[0]);

fs.mkdirSync(BUILD_DIR, { recursive: true });
fs.writeFileSync(BUILD, src, 'utf8');
console.log(`[gen] ${path.relative(ROOT, BUILD)}  (${src.split('\n').length} 行)`);
console.log(`[cfg] 程序 ${cfgs.map((c) => c.prog).join(', ')} / 按钮 ${cfgs.reduce((n, c) => n + c.buttons.length, 0)} 个`);
console.log(`[cfg] 基线 ${BASELINE}，pfno 起点 ${PFNO_START}，${DRY ? 'DRY RUN' : '正式写入'}`);

// ---------- 4. 推送 + 运行 ----------
function run(cmd, argv, env) {
  const r = spawnSync(cmd, argv, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  const out = (r.stdout || '') + (r.stderr || '');
  return { code: r.status, out };
}

const quiet = (s) => s.replace(/^\(node:\d+\).*$/gm, '').replace(/NODE_TLS_REJECT_UNAUTHORIZED.*$/gm, '');

const push = run('node', ['scripts/push_prog_source.js'], {
  SAP_ENV_FILE: ENV_FILE,
  SRC_FILE: BUILD,
});
const pushOut = quiet(push.out);
process.stdout.write(pushOut);
if (push.code !== 0 || !/final version => active/.test(pushOut)) die('推送/激活失败');

const runRes = run('node', ['scripts/adt.js', 'run', 'ZCUA_APPLY'], { SAP_ENV_FILE: ENV_FILE });
const runOut = quiet(runRes.out);
process.stdout.write(runOut);
if (runRes.code !== 0) die('运行 ZCUA_APPLY 失败');

// ---------- 5. 校验结果 ----------
const fails = [];
const rtCodes = new Map(); // prog -> Set(code)：RS_CUA_GET_FUNCTIONS 列出的码
let curProg = '';
for (const line of runOut.split('\n')) {
  const mp = line.match(/###\s*程序\s+(Z[A-Z0-9_]+)/);
  if (mp) {
    curProg = mp[1];
    if (!rtCodes.has(curProg)) rtCodes.set(curProg, new Set());
    continue;
  }
  // 功能码不一定是 Z 开头（&SEND / S1 等），只要求是「大写字母或 & 开头」的码
  const mrt = line.match(/\[RT\]\s*(&?[A-Z][A-Z0-9_]*)/);
  if (mrt && curProg) {
    rtCodes.get(curProg).add(mrt[1]);
    continue;
  }
  const mrc = line.match(/RS_CUA_GET_FUNCTIONS rc =\s*(\d+)/);
  if (mrc) {
    if (mrc[1] !== '0') fails.push(curProg + ' RS_CUA_GET_FUNCTIONS rc=' + mrc[1]);
    continue;
  }
  const mw = line.match(/write rc =\s*(\d+)/);
  if (mw && mw[1] !== '0') fails.push(curProg + ' write rc=' + mw[1]);
  if (/!!/.test(line)) fails.push(line.trim());
  const chk = line.match(/(&?[A-Z][A-Z0-9_]+)\s+pfno=(\S+)\s+set=(\S)\s+fun=(\S)\s+but=(\S)\s+pfk=(\S)/);
  if (chk) {
    const [, code, pfno, s, f, b, p] = chk;
    // 回读的 but/pfk 两列在 generate rc=3（环境固有）下读到的是旧激活版，
    // 不可靠 —— 只校验 set/fun（这两张表不受 generate 影响），
    // but 与 pfk 的最终判定交给下方探针 ZTEST_CUA_READ。
    if (s !== 'Y' || f !== 'Y') {
      fails.push(`${curProg} ${code} 回读异常 (set=${s} fun=${f})`);
    }
  }
}
if (!/DONE/.test(runOut)) fails.push('未跑完（没看到 DONE）');

// 运行时接口必须列出每个配置的功能码（dry run 不写库，跳过此项）
if (!DRY) {
  for (const c of cfgs) {
    const got = rtCodes.get(c.prog) || new Set();
    for (const b of c.buttons) {
      const code = String(b.code).toUpperCase();
      if (!got.has(code)) fails.push(`${c.prog} 运行时接口未列出 ${code}`);
    }
  }
}

// noPfk 模式：用独立探针 ZTEST_CUA_READ 核对激活版 PFK 里**没有** Z 功能键，
// 以及 8 个自定义按钮的 pfno 均已落到 'S'（分隔符占位，不绑快捷键）。
// 这是最终权威判据（回读段在 generate rc=3 下读到的旧激活版会误报 pfk=Y）。
if (NO_PFK === 'X' && !DRY) {
  const probe = run('node', ['scripts/adt.js', 'run', 'ZTEST_CUA_READ'], { SAP_ENV_FILE: ENV_FILE });
  const probeOut = probe.out || '';
  for (const c of cfgs) {
    const seg = probeOut.slice(
      probeOut.indexOf(`@@@PROG ${c.prog}`),
      probeOut.indexOf('@@@PROG', probeOut.indexOf(`@@@PROG ${c.prog}`) + 1),
    );
    if (seg.indexOf(`@@@PROG ${c.prog}`) === -1) {
      fails.push(`${c.prog} 探针未输出该程序段`);
      continue;
    }
    // PFK 里不该有 Z 功能键
    const zPfk = seg.split('\n').filter((l) => /^pfk\|.*funcode=Z/.test(l)).length;
    if (zPfk > 0) fails.push(`${c.prog} PFK 仍残留 ${zPfk} 个 Z 功能键（快捷键未删净）`);
  }
}

if (fails.length) {
  console.error('\n校验未通过：');
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log('\nOK  CUA 登记完成并校验通过' + (DRY ? '（dry run，未写入）' : ''));
