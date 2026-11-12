---
name: sap-abap-prog-push-run
description: 在 ADT/MCP 通道上推送、激活、无头运行 ABAP 报表（REPORT）并产出测试报告（跨项目通用）。主册只放主干：PROG 创建/激活报文的协议细节、按 env 文件或 SAP_CLIENT_OVERRIDE 切集团、项目模版对齐的硬指标自检清单、报表交付标准四步、adt.js run 的适用边界（ALV 自动降级、WRITE 在 ALV 之前必 500、验文本元素要 SAP_LANGUAGE_OVERRIDE=zh）。专题在 references/：挂传输请求与推函数模块（含 FG 内 FORM 形参类型必须与标准 FM 逐字一致）、文本元素与消息类、ALV 自定义按钮（S/4 下 function ALV 已断，走 CUA 功能码）、无头 500 的根因定位、探针设计与「E2E 不得手工复位」纪律、ABAP/SQL 语法与激活报错速查、生产订单状态操作。当需要新建/更新 $TMP 测试报表、跑 SAP 端回归用例、推送函数模块或文本元素、给 ALV 加按钮、或 SAP 只回一句拼接消息/一个 500 需要定位根因时加载。
agent_created: true
---

# ABAP 报表推送 / 运行 / 测试报告（ADT 通道）

适用项目：示例客户 SAP ERP（`~/ABAP-AI`，系统 DEV）。

> 本技能负责**报表侧**：推送、激活、运行、诊断、测试报告。
> **BAPI / 标准函数调用**（参数结构、静默失效、按域选型、语言、对账）见 `sap-abap-bapi-usage`；
> 项目封装接口（`ZFM_FII001`/`FII003`/`FII001_SPLIT`）的签名属项目私有，见你自己项目的作业总纲（写法参照仓库 `examples/project-ops-template.md`）。

**主册只留「每次都要走的主干」，专题按需读 `references/`：**

| 要做什么 | 去哪 |
|---|---|
| 切集团、推 REPORT、无头运行、模版自检、交付四步 | 本文件 §0–§2 |
| 挂传输请求、`DESC` 程序标题、推函数模块、FG 内 FORM 形参类型、接口嵌套结果集 | [`references/push-transport-fm.md`](references/push-transport-fm.md)（§5） |
| 文本元素 `TEXT-xxx` 推送/激活/排查、消息类 `T100` 双语言 | [`references/text-elements.md`](references/text-elements.md)（§6） |
| ALV 加按钮（S/4 下 function ALV 已断）、CUA 功能码自动登记、标准弹框与返回语义 | [`references/alv-cua.md`](references/alv-cua.md)（§7） |
| 无头运行 500、只回一句拼接消息、短文本为空时的一刀切 | [`references/diagnose-500.md`](references/diagnose-500.md)（§3、§8.1） |
| 探针设计（可判定断言）、E2E 不得手工复位、写调自定义 FM 的探针 | [`references/probe-e2e.md`](references/probe-e2e.md)（§8.0、§13） |
| ABAP / SQL 语法陷阱、激活报错速查 | [`references/abap-gotchas.md`](references/abap-gotchas.md)（§8 余下、§12） |
| 生产订单 TECO / 用户状态 / 状态判定结构化写法 | [`references/prodorder-status.md`](references/prodorder-status.md)（§10） |
| 测试报告骨架 | 本文件 §9 |
| 会计凭证过账选型 | 本文件 §11 |

> 分册里的章节号**沿用拆分前的主册编号**，所以「见 §8.1」这类引用按上表定位即可。

## 0. 集团切换（最容易踩）

| 脚本 | 切集团方式 |
|---|---|
| `scripts/push_prog_source.js` | `SAP_ENV_FILE=/tmp/sap300.env`（读 env 文件的 `SAP_CLIENT`）**或** `SAP_CLIENT_OVERRIDE=300`（2026-09-29 起支持，与 `adt.js` 同口径，**优先级高于 env 文件**） |
| `scripts/call-adt-tool.js` | `SAP_ENV_FILE=/tmp/sap300.env`（脚本读 env 文件的 `SAP_CLIENT`） |
| `scripts/adt.js`（query/table/run/dumps） | `SAP_ENV_FILE=$PWD/portable/env/dev.env SAP_CLIENT_OVERRIDE=300`（**只认 OVERRIDE 变量，env 文件里的 SAP_CLIENT 对它无效**） |

生成 300 环境文件：
```bash
awk '{if($0~/^SAP_CLIENT=/)print "SAP_CLIENT=300"; else print}' env/dev.env > /tmp/sap300.env && chmod 600 /tmp/sap300.env
```
判断实际落到哪个集团：看输出 `[adt] client = N`。**$TMP 对象是集团相关的**，测试报表必须建在目标集团。

**⚠ 可传输对象（非 $TMP）推送报 403 时先换集团，别当权限问题**：
报 `Object R3TR PROG ZXXXX locked in task DEVK900007 (USER) not specified for this client`
＝ 该对象已在**另一个集团**的任务里被锁，**换回请求所属集团再推即可**
（实例：`ZFIB001` 用 `SAP_ENV_FILE=/tmp/sap300.env` 报 403，用 `portable/env/dev.env`＝100 一次通过）。
`$TMP` 对象不受此限，两个集团都能推。

## 1. 推送报表

```bash
SAP_ENV_FILE=/tmp/sap300.env SRC_FILE=$PWD/scripts/ZZTEST_XXX.abap \
  node scripts/push_prog_source.js          # 可选 PKG=ZFICO，默认 $TMP
```
源码首行必须是 `REPORT zxxx.`（脚本用正则取程序名）。流程：POST 创建 → LOCK → PUT `source/main` → UNLOCK → ACTIVATE。

**4 处协议细节（错一个就 400/406）**

1. 创建报文根元素是 `program:abapProgram`（不是 `app:program`）；对象名与描述以**属性**给出：
   `<program:abapProgram ... adtcore:name="ZXXX" adtcore:description="…" adtcore:type="PROG/P" adtcore:masterLanguage="ZH" adtcore:responsible="USER" abapLanguageVersion="standard"><adtcore:packageRef adtcore:name="$TMP"/></program:abapProgram>`，POST 到 `/sap/bc/adt/programs/programs?pureCreation=true`。
2. 激活 URL 必须带 `method=activate`：`/sap/bc/adt/activation?method=activate&preauditRequested=true&version=inactive`，否则 `Parameter method could not be found`。
3. 激活报文用 `adtcore:objectReferences` + `adtcore:objectReference`（自造 `activation/item` → `System expected the element '{…}objectReferences'`）。
4. **激活返回 HTTP 200 不等于成功**：要判 `activationExecuted="false"` 并从 `<msg type="E"><txt>` 取语法错误——激活同时充当语法检查闸门。

对象已存在时脚本自动跳过创建；改源码只需重跑。PUT header 用 `Content-Type: text/plain; charset=utf-8` + `Accept: text/plain`。必须**剥代理**（脚本已 `delete HTTP(S)_PROXY` + `NO_PROXY=*`）。

### 1.0 ★ 动手前先对齐项目模版（用户两次纠错换来的规矩，2026-10-12）

**"能跑通" ≠ "合项目规范"。** 本项目两次返工都是一个根因：

| 纠错原话 | 根因 | 治本 |
|---|---|---|
| 「你是真的不遵守规范啊ZIFLOG。你把这个表建好不就行了，为嘛不见数据元素」 | 建 `ZIFLOG` 时 7 个字段用匿名内置类型（`abap.char(1)` / `abap.string(0)`） | 建表字段**一律挂数据元素**，STRING 走域 `STRING`（见技能 `sap-ddic-object-ops`）|
| 「你就不能按照我们的程序模版来创建吗」 | 报表没按 `开发模板/ABAP_报表程序开发模板.abap` 写（程序头/事件段/FORM 命名/ALV 用 SLIS）| 照模版重写（本报表 `ZIFLOG_VIEW` v4）|

**动手顺序（不可跳）**：

1. 读 `开发模板/` 下对应模版：`ABAP_报表程序开发模板.abap`（报表）、`ABAP_批导程序开发模板.abap`（批导）、
   `ABAP_报表程序开发模板_文本元素.csv`（文本编号口径）。
2. 找**同类型、正在跑**的程序当实现范式（本报表照 `FICO/ZFIR_0237_CBS付款排程单查询平台.abap`）。
3. 再写代码。

**硬指标自检清单**（写完逐条过）：

- [ ] 程序头八字段齐全：单位/程序名称/程序描述/开发编号/功能顾问/申请日期/技术顾问/开发日期 +
      **摘要**（一.业务背景 / 二.使用场景 / 三.程序使用）+ **注意** + **变更记录**（含本次请求号）
- [ ] 输出行结构 `ty_alv` ＋ `DATA gt_alv TYPE TABLE OF ty_alv WITH EMPTY KEY`
- [ ] **ALV 一律 LVC**：`lvc_t_fcat` / `lvc_s_fcat` / `lvc_s_layo` / `lvc_title` / `disvariant`
      ＋ `REUSE_ALV_GRID_DISPLAY_LVC`（项目在跑报表清一色 LVC；SLIS 连 `COLTEXT` 都没有，见 §8 坑）
- [ ] 事件段：`INITIALIZATION` / `AT SELECTION-SCREEN OUTPUT` / `AT SELECTION-SCREEN` /
      `START-OF-SELECTION` / `END-OF-SELECTION`
- [ ] `END-OF-SELECTION` 按 `sy-batch IS INITIAL` 分流：前台 `frm_show_alv`，后台 `frm_send_data`
      （纯查询报表无推送动作时用假脱机清单 `frm_show_list`，并在程序头「注意」里写明为什么不是 `frm_send_data`）
- [ ] FORM 命名对齐模版：`frm_get_data` / `frm_show_alv` / `frm_build_fcat` / `frm_adjust_fcat` /
      `frm_fill_fcat` / `frm_layout` / `frm_display`
- [ ] `frm_fill_fcat` 用模版范式：`USING p_fname p_coltext p_edit p_table p_field`（`p_coltext TYPE lvc_txtcol`），
      调用侧 `'FIELD' TEXT-T01 space space space`
- [ ] 空数据：`frm_get_data` 末尾 `MESSAGE TEXT-003 TYPE 'S' DISPLAY LIKE 'E'` + `LEAVE LIST-PROCESSING`
      （后台跑要加 `sy-batch IS INITIAL` 保护，否则作业清单被掐掉）
- [ ] 界面文案**零中文字面量**，全走 `TEXT-xxx`；文本编号按模版 CSV：`001/002` 块/界面标题、
      `003` 未查询到数据、`010+` 消息与弹窗段、`T01+` 列标题
- [ ] **推程序必须带 `DESC="中文短名"`**（见 §5.1.1）

### 1.1 ★ 报表交付标准四步（缺一步就是半成品）

```bash
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/<生成器>.js               # 1. 源码 + 文本元素 + CUA 配置（生成器是项目私有脚本，自己写）
SAP_ENV_FILE=$PWD/portable/env/dev.env SRC_FILE=$PWD/FICO/<PROG>_<描述>.abap \
  node scripts/push_prog_source.js                                  # 2. 推源码并激活
SAP_ENV_FILE=$PWD/portable/env/dev.env PROGS=B,C,D \
  node scripts/push_textelements.js                                 # 3. 文本元素（PUT 完必须单独激活，见 §6.0）
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/gen_cua.js               # 4. GUI 状态（功能码 + 图标 + 文本）
```

**第 4 步最容易漏**：不做的话程序能跑、文本也对，但工具栏上一个自定义按钮都没有。
详见 §7.5 与技能 `sap-cua-gui-status-functions`。

## 2. 运行

```bash
SAP_ENV_FILE=$PWD/portable/env/dev.env SAP_CLIENT_OVERRIDE=300 node scripts/adt.js run ZZTEST_XXX
```
- `run` 走 `/sap/bc/adt/programs/programrun/<name>`，`Accept: text/plain`，服务端把结果渲染成文本表返回。
- **带选择屏幕的报表也能跑**（2026-10-12 更正）：`ZIFLOG_VIEW`（`SELECT-OPTIONS` ×4 + `PARAMETERS`）
  直接返回 200 并跑完 `START-OF-SELECTION` → `END-OF-SELECTION`。programrun 会带默认值自动往下走，
  等价于前台按 F8（所以**选择屏默认值决定取到哪些数据**，截图取数前先确认默认值）。
- **★ ALV 报表也能无头验**（2026-10-12 更正，旧结论"带 ALV 必然 500"过宽）：无 GUI 时
  `REUSE_ALV_GRID_DISPLAY*` **自动降级成清单输出**，返回**网格标题 + 列标题 + 数据行**的文本表 ——
  列标题是不是 `TEXT-T0n` 一眼可见。**唯一硬约束：ALV 调用之前一句 `WRITE` 都不能有**，否则必 500
  `Screen output without connection to user`（探针 `scripts/ZTEST_ALV_HEADLESS.abap` 两版对照坐实）。
  诊断信息挪到 ALV 之后，或塞进列标题/数据行。
- **验文本元素必须带 `SAP_LANGUAGE_OVERRIDE=zh`**：不传时按用户主语言（本系统 = **EN**）开会话，
  而项目文本池只有 ZH 版 ⇒ 标题/列头**全空**，极易误判成"文本元素没推上去"。
- 输出带 banner，正文从第一行 `===`/表格头开始。
- **不要在报表里用 `SET LOCALE LANGUAGE`** —— 该会话下会 500：`Key word for accessing the SAP text environment table TCP0C is too long`。
  - **实测反例（2026-09-29）**：`SET LOCALE LANGUAGE '1'.` / `sy-langu = '1'.` **都改不动 BAPI 的取文本语言** —— 见 §6.4。想在 ADT 无头会话下切语言，**唯一有效手段是 HTTP 头 `sap-language`**。
- **会话语言由 HTTP 头决定**：`adt.js` 支持 `SAP_LANGUAGE_OVERRIDE`（2026-09-29 起）——
  ```bash
  SAP_ENV_FILE=$PWD/portable/env/dev.env SAP_CLIENT_OVERRIDE=300 SAP_LANGUAGE_OVERRIDE=zh node scripts/adt.js run ZTEST_XXX
  ```
  不传则取会话默认（`client 100` 实测 `sy-langu='1'` / `client 300` 实测 `'E'`）。**BAPI 标准消息文本、`TSPAT` 产品组文本、`T100` 消息文本都按这个语言查**。

> 排查「只回一句拼接消息」的报错见 [`references/diagnose-500.md`](references/diagnose-500.md)。

## 4. 细节备忘

> 金额/日期字段口径（`AMT_DOCCUR` 传字符串、`PSTNG_DATE`、ALPHA/MATNR）见 `sap-abap-bapi-usage` → `references/_语言与数据格式.md`。

- `ACDOCA-HSL` 为**带符号**金额（借正贷负），校验借贷平衡时要对贷方取 `abs( )`，否则平衡凭证会被误判为不平。
- 科目/业务伙伴号在 `SKB1` / `LFB1` 里是 **10 位补零**存储：查 `100001` 要写成 `0000100001`，或直接用 `LIKE '%100001%'`。
- 诊断报表与回归报表都放 `$TMP`、不建请求、不传输，源码同步归档到 `scripts/`。

## 9. 测试报告骨架

`scripts/ZZTEST_ISP002_测试报告.md` 是范式，章节：元信息表 → 接口契约（签名/参数/凭证行规则）→ 测试主数据 → 用例与结果表 → 关键用例证据（凭证行明细 + 底表快照）→ 本轮定位并解决的问题（现象 / 排查过程 / 结论 / 处置）→ 遗留事项（责任方）→ 结论。

## 11. 会计凭证过账 / 冲销：走项目封装接口，不要直接调 BAPI

选型结论与理由见 `sap-abap-bapi-usage` → `references/bapi-acc-document-post.md`；本项目封装接口（`ZFM_FII001` / `ZFM_FII001_SPLIT` / `ZFM_FII003`）的签名、模拟导入、拆分规则、消息处理属项目私有，不入公开仓库。
