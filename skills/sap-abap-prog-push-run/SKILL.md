---
name: sap-abap-prog-push-run
description: 在 ADT/MCP 通道上把 ABAP 可执行报表（REPORT）推送并激活到 SAP、运行取回结果、再产出测试报告的完整流程。含 PROG 创建/激活报文的 4 处协议细节、按 SAP_ENV_FILE 或 SAP_CLIENT_OVERRIDE 切集团、adt.js run 的适用边界、★「动手前先对齐 `开发模板/` 项目模版」（程序头八字段/事件段/FORM 命名/LVC ALV/文本元素编号的硬指标自检清单，用户两次纠错换来的规矩）、★「带选择屏幕和 ALV 的报表也能无头运行：无 GUI 时 ALV 自动降级成清单输出、网格标题与列标题可核，但 ALV 调用之前有 WRITE 就必 500 Screen output without connection to user；验文本元素必须带 SAP_LANGUAGE_OVERRIDE=zh，否则 ZH-only 文本池读空会误判成文本没推上去」、无头运行返回 HTTP 500 时「用短文本反查运行时错误名（TABLE_INVALID_INDEX / ITAB_ILL_COMPONENT 等）+ 注释二分法」的定位手法、★「短文本为空时用 gen_e2e_harness.js 生成 $TMP E2E 副本，一刀切开『ALV 渲染限制』与『真实转储』」的判定手法、★「FG 内 FORM 形参类型与标准 FM 形参类型不一致（本系统 TDNAME=CHAR16 vs READ_TEXT 的 TDOBNAME=CHAR70）导致编译通过但运行期 500 Type conflict」的根因与两种修法（改 `TYPE tdobname`；或 STXL 直读 + IMPORT FROM INTERNAL TABLE 替代 READ_TEXT）、（BAPI 调用相关经验已抽到 `sap-abap-bapi-usage`）、★★「长文本必须先批量取回再内存 IMPORT，禁止在循环里逐条 SELECT」（含 FOR ALL ENTRIES 空表防护、`INTO` 必须放 SELECT 末尾、键表分批、实测 13,400 次往返→1 次）、★「接口返回『行包含在抬头里』的嵌套结果集（参照 `ZBPM_ISP005`：DDIC 结构内嵌 TTYP 组件 + ABAP 按唯一键二分归位）」、SY-TABIX 被 READ TABLE 改写导致 DELETE ... INDEX 0 转储的陷阱、文本元素（TEXT-xxx）推送后必须单独激活（PROG/PX 对象，激活父程序不会连带激活它）的排查方法，以及「用场景表驱动的诊断报表直接调 BAPI 打印 MSGID/MSGNO/V1..V4」这种把模糊报错钉死到根因的排查手法。当需要新建/更新 $TMP 测试报表、跑 SAP 端回归用例、推送函数模块/文本元素、或 SAP 只回一句拼接消息/一个 500 需要定位根因时加载。
agent_created: true
---

# ABAP 报表推送 / 运行 / 测试报告（ADT 通道）

适用项目：示例客户 SAP ERP（`~/ABAP-AI`，系统 DEV）。

> 本技能负责**报表侧**：推送、激活、运行、诊断、测试报告。
> **BAPI / 标准函数调用**（参数结构、静默失效、按域选型、语言、对账）见 `sap-abap-bapi-usage`；
> 项目封装接口（`ZFM_FII001`/`FII003`/`FII001_SPLIT`）见 `sap-abap-project-ops` §4。

## 0. 集团切换（最容易踩）

| 脚本 | 切集团方式 |
|---|---|
| `scripts/work/push_prog_source.js` | `SAP_ENV_FILE=/tmp/sap300.env`（读 env 文件的 `SAP_CLIENT`）**或** `SAP_CLIENT_OVERRIDE=300`（2026-09-29 起支持，与 `adt.js` 同口径，**优先级高于 env 文件**） |
| `scripts/work/call-adt-tool.js` | `SAP_ENV_FILE=/tmp/sap300.env`（脚本读 env 文件的 `SAP_CLIENT`） |
| `scripts/work/adt.js`（query/table/run/dumps） | `SAP_ENV_FILE=$PWD/env/dev.env SAP_CLIENT_OVERRIDE=300`（**只认 OVERRIDE 变量，env 文件里的 SAP_CLIENT 对它无效**） |

生成 300 环境文件：
```bash
awk '{if($0~/^SAP_CLIENT=/)print "SAP_CLIENT=300"; else print}' env/dev.env > /tmp/sap300.env && chmod 600 /tmp/sap300.env
```
判断实际落到哪个集团：看输出 `[adt] client = N`。**$TMP 对象是集团相关的**，测试报表必须建在目标集团。

**⚠ 可传输对象（非 $TMP）推送报 403 时先换集团，别当权限问题**：
报 `Object R3TR PROG ZXXXX locked in task DEVK900007 (USER) not specified for this client`
＝ 该对象已在**另一个集团**的任务里被锁，**换回请求所属集团再推即可**
（实例：`ZFIB001` 用 `SAP_ENV_FILE=/tmp/sap300.env` 报 403，用 `env/dev.env`＝100 一次通过）。
`$TMP` 对象不受此限，两个集团都能推。

## 1. 推送报表

```bash
SAP_ENV_FILE=/tmp/sap300.env SRC_FILE=$PWD/scripts/work/ZZTEST_XXX.abap \
  node scripts/work/push_prog_source.js          # 可选 PKG=ZFICO，默认 $TMP
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
SAP_ENV_FILE=$PWD/env/dev.env node scripts/work/gen_zfid001x.js          # 1. 生成源码 + 文本元素 + CUA 配置
SAP_ENV_FILE=$PWD/env/dev.env SRC_FILE=$PWD/FICO/<PROG>_<描述>.abap \
  node scripts/work/push_prog_source.js                                  # 2. 推源码并激活
SAP_ENV_FILE=$PWD/env/dev.env PROGS=B,C,D \
  node scripts/work/push_textelements.js                                 # 3. 文本元素（PUT 完必须单独激活，见 §6.0）
SAP_ENV_FILE=$PWD/env/dev.env node scripts/work/gen_cua.js               # 4. GUI 状态（功能码 + 图标 + 文本）
```

**第 4 步最容易漏**：不做的话程序能跑、文本也对，但工具栏上一个自定义按钮都没有。
详见 §7.5 与技能 `sap-cua-gui-status-functions`。

## 2. 运行

```bash
SAP_ENV_FILE=$PWD/env/dev.env SAP_CLIENT_OVERRIDE=300 node scripts/work/adt.js run ZZTEST_XXX
```
- `run` 走 `/sap/bc/adt/programs/programrun/<name>`，`Accept: text/plain`，服务端把结果渲染成文本表返回。
- **带选择屏幕的报表也能跑**（2026-10-12 更正）：`ZIFLOG_VIEW`（`SELECT-OPTIONS` ×4 + `PARAMETERS`）
  直接返回 200 并跑完 `START-OF-SELECTION` → `END-OF-SELECTION`。programrun 会带默认值自动往下走，
  等价于前台按 F8（所以**选择屏默认值决定取到哪些数据**，截图取数前先确认默认值）。
- **★ ALV 报表也能无头验**（2026-10-12 更正，旧结论"带 ALV 必然 500"过宽）：无 GUI 时
  `REUSE_ALV_GRID_DISPLAY*` **自动降级成清单输出**，返回**网格标题 + 列标题 + 数据行**的文本表 ——
  列标题是不是 `TEXT-T0n` 一眼可见。**唯一硬约束：ALV 调用之前一句 `WRITE` 都不能有**，否则必 500
  `Screen output without connection to user`（探针 `scripts/work/ZTEST_ALV_HEADLESS.abap` 两版对照坐实）。
  诊断信息挪到 ALV 之后，或塞进列标题/数据行。
- **验文本元素必须带 `SAP_LANGUAGE_OVERRIDE=zh`**：不传时按用户主语言（本系统 = **EN**）开会话，
  而项目文本池只有 ZH 版 ⇒ 标题/列头**全空**，极易误判成"文本元素没推上去"。
- 输出带 banner，正文从第一行 `===`/表格头开始。
- **不要在报表里用 `SET LOCALE LANGUAGE`** —— 该会话下会 500：`Key word for accessing the SAP text environment table TCP0C is too long`。
  - **实测反例（2026-09-29）**：`SET LOCALE LANGUAGE '1'.` / `sy-langu = '1'.` **都改不动 BAPI 的取文本语言** —— 见 §6.4。想在 ADT 无头会话下切语言，**唯一有效手段是 HTTP 头 `sap-language`**。
- **会话语言由 HTTP 头决定**：`adt.js` 支持 `SAP_LANGUAGE_OVERRIDE`（2026-09-29 起）——
  ```bash
  SAP_ENV_FILE=$PWD/env/dev.env SAP_CLIENT_OVERRIDE=300 SAP_LANGUAGE_OVERRIDE=zh node scripts/work/adt.js run ZTEST_XXX
  ```
  不传则取会话默认（`client 100` 实测 `sy-langu='1'` / `client 300` 实测 `'E'`）。**BAPI 标准消息文本、`TSPAT` 产品组文本、`T100` 消息文本都按这个语言查**。

## 3. 排查「只回一句拼接消息」的报错

FM 常把 `BAPIRET2` 拼成 `/msg1/msg2/…` 返回，信息量不足。做法：

1. **先定消息号**：`SELECT arbgb, msgnr, sprsl, text FROM t100 WHERE text LIKE '%关键字%'`（`sprsl='1'` 中文 / `'E'` 英文），拿到 MSGID+MSGNO 才知道是哪类检查。
2. **再写场景表驱动的诊断报表**：`TYPES BEGIN OF ty_scen … END OF ty_scen` + `lt_scen = VALUE #( ( … ) ( … ) )`，循环调用 `BAPI_ACC_DOCUMENT_CHECK` 等接口，**逐条打印 `MSGTYP/MSGID/MSGNO/MESSAGE_V1..V4`**（不要只看拼接后的文本）。
3. **一次只改一个变量**（换业务伙伴 / 去某行 / 换记账码 / 去成本中心 / 加纯总账对照组），用「哪组通过」把范围夹死。
4. 怀疑主数据就**逐字段 diff 两个业务伙伴**：`SELECT lifnr, ktokk, name1, sperr, loevm FROM lfa1 WHERE lifnr IN (...)` + `lfb1` 同查。

**已踩过的实例**：FI 过账失败只回 `Error in document: BKPFF $ …/Account 100001 5000 is blocked for posting`。消息号定位到 `F5 351`（总账科目过账冻结，参数=科目+公司代码），但该科目在科目表里根本不存在——因为 `100001` 其实是业务伙伴号 `0000100001` 去前导零后的显示值。逐字段 diff 发现根源是 **`LFA1-SPERR = 'X'`（业务伙伴集中冻结）**，接口代码无缺陷。**教训：消息里的"科目"不一定是科目，先换算 ALPHA=OUT 再判断。**

## 4. 细节备忘

> 金额/日期字段口径（`AMT_DOCCUR` 传字符串、`PSTNG_DATE`、ALPHA/MATNR）见 `sap-abap-bapi-usage` 分册 `20-语言与数据格式`。

- `ACDOCA-HSL` 为**带符号**金额（借正贷负），校验借贷平衡时要对贷方取 `abs( )`，否则平衡凭证会被误判为不平。
- 科目/业务伙伴号在 `SKB1` / `LFB1` 里是 **10 位补零**存储：查 `100001` 要写成 `0000100001`，或直接用 `LIKE '%100001%'`。
- 诊断报表与回归报表都放 `$TMP`、不建请求、不传输，源码同步归档到 `scripts/work/`。

## 5. 挂传输请求（对象落到可传输包时）

创建/LOCK/PUT 都要带 **父请求号**（不是任务号，传任务号会报对象已被锁）：

```bash
SAP_ENV_FILE=$PWD/env/dev.env CORR_NR=DEVK900006 PKG=ZFICO SRC_FILE=/abs/x.abap node scripts/work/push_prog_source.js
```

- 脚本用 `CORR_Q(first)` 在 CREATE / LOCK / PUT 三处拼 `corrNr=`（**PUT 也要带**，只带 LOCK 会 400 `Parameter corrNr could not be found`）。
- **E071 里查到的是任务号，不要误判挂错了**：SAP 语义上对象只能记入任务（E070-TRFUNCTION='S'，其 `STRKORR` 指向请求 'K'），所以 `E071.TRKORR = <请求下的任务号>` 就等于"挂在请求下面"。
- 校验落点：`SELECT trkorr, trfunction, trstatus, as4user, strkorr FROM e070 WHERE trkorr LIKE 'DEVK%'` + `SELECT trkorr, pgmid, object, obj_name FROM e071 WHERE obj_name = 'ZXXX'`。

### 5.1 写操作的 client 必须与"对象锁所属 client"一致（重要）

报错原文：

```
Object LIMU FUNC ZBPM_ISP002 locked in task DEVK900007 (DEVUSER) not specified for this client
```

**这不是死锁，是集团不匹配。** 任务 / 请求是**集团相关**的（E070-MANDT），对象锁也记在任务的集团下；如果请求建在 client 100，却在 300 里 LOCK，ADT 就认定这把锁"不属于本 client"，直接 403。

- **判据**：`SELECT trkorr, strkorr, trfunction, trstatus, as4user, as4date, as4time FROM e070 WHERE trkorr LIKE 'DEVK%'` —— `trfunction='K'` 是请求、`'S'` 是任务，任务的 `strkorr` 指向其父请求。看 `as4date/as4time` 可判断锁是"活动会话"还是"残留"。
- **处置**：把 `SAP_CLIENT_OVERRIDE` **去掉**，用 `env/dev.env` 里的默认 `SAP_CLIENT` 推送（本项目 DEV 的请求都建在 client 100）。

```bash
# ✅ 正确：模块池/函数模块改源码，用请求所属的 client
SAP_ENV_FILE=$PWD/env/dev.env CORR_NR=DEVK900006 \
  TARGET_GROUP=ZFG_BPM002 TARGET_FM=ZBPM_ISP002 \
  SRC_FILE=$PWD/scripts/work/ZBPM_ISP002_new.abap node scripts/work/push_fm_source.js
```

- **别混淆两条规则**：**ABAP 源码是跨集团的**（用哪个 client 推、激活的是同一份），但**对象锁/传输请求是集团相关的**；而 **`$TMP` 测试程序的对象是集团相关的**，必须建在目标集团（300）。

### 5.1.1 ★ 推程序必须带 `DESC`（程序标题），否则落成 `DIAG`

程序标题 = `TRDIRT.TEXT`，就是 SE38 属性里的「标题」。**它不等于程序名**，是业务语义短名。
项目既有口径：`ZFIR_0237` = 「CBS-付款排程单查询」、`ZFID001A` = 「付款处理(推送CBS)」。

**两个坑叠在一起，错了就永远错**：

1. `push_prog_source.js` 原来写死 `const desc = process.env.DESC || 'DIAG';` ⇒ 不传就落 `DIAG`。
2. 程序**一旦创建过**，脚本走 `already exists, skip create` 分支，**之后再怎么推都不碰描述**。

```bash
# ✅ 新程序 / 老程序都这么推（已存在时脚本会自动回写标题）
SAP_ENV_FILE=$PWD/env/dev.env CORR_NR=DEVK900006 PKG=ZGL DESC="接口报文日志查询" \
  SRC_FILE=/abs/x.abap node scripts/work/push_prog_source.js
```

脚本输出会打印 `PUT meta => 200 (标题: DIAG -> 接口报文日志查询)` 和 `description => …`，每次核对。

- **回写要点**：`PUT /sap/bc/adt/programs/programs/<prog>?lockHandle=…&corrNr=…`，
  Body 是 `program:abapProgram` XML（同创建报文），`Content-Type: application/vnd.sap.adt.programs.v2+xml`。
- **包名必须用 GET 现网读到的**（`<adtcore:packageRef adtcore:name=…>`），**不能用本次 `PKG`**，否则会把程序挪包。
- 核验：`SELECT name, sprsl, text FROM trdirt WHERE name = 'ZXXX'`（`SPRSL='1'` 是 ZH）。
- 同类问题：**类**的描述在 `SEOCLASSTX-DESCRIPT`、**表/域**在 `DD02T` / `DD01T`，
  建对象时就要给对，不要事后补。

### 5.2 函数模块（FM）推送

```bash
SAP_ENV_FILE=$PWD/env/dev.env CORR_NR=DEVK900006 TARGET_GROUP=ZFG_BPM002 TARGET_FM=ZBPM_ISP002 \
  SRC_FILE=/abs/x.abap node scripts/work/push_fm_source.js
```

流程：GET 预热会话 → LOCK（带 corrNr）→ PUT `source/main` → UNLOCK → ACTIVATE。**顺序不可颠倒。**

**改完必须两步核验**（HTTP 200 ≠ 激活成功）：

```bash
# ① 拉回源码与推送源逐字 diff
SAP_ENV_FILE=$PWD/env/dev.env node scripts/work/get_source.js FM ZBPM_ISP002 ZFG_BPM002 --out=/tmp/after.abap
diff <(tr -d '\r' < /tmp/after.abap) <(tr -d '\r' < 推送源.abap)
# ② 未激活对象应为 0：GET /sap/bc/adt/activation/inactiveobjects，过滤 adtcore:name
```

**在函数模块源码里加 FORM 是可行的**：`FUNCTION … ENDFUNCTION.` 之后（同一 include 内）可以写 `TYPES:` / `CONSTANTS:` / `FORM … ENDFORM.`，它们是函数组的全局区，**但常量优先声明在 FORM 内部**，避免与其他 include（`$01` TOP / `F01`）里的同名符号撞车。

**★ 但「函数体外」的 FORM 看不到「函数体内 INCLUDE 展开的符号」**（2026-09-24 `ZBPM_ISP011` 实测，两轮激活失败才定位）：

```abap
FUNCTION zxxx
  INCLUDE zgsp_1c_rfc_logger.        " _o_logger 只在这个函数体内可见
  zgsp_1c_create_logger.
  PERFORM frm_log ...                " ✗ FRM_LOG 里写 _o_logger → Field "_O_LOGGER" is unknown
ENDFORM.  " ← 判断依据：报错行号指向 FORM，而不是 FUNCTION 顶部
```
⇒ **接口函数里的日志 / include 符号调用只能内联在函数体内，不要抽 FORM**（`ZBPM_ISP002` 就是每个返回分支内联 `set_message` + `create_snapshot`）。同理 **FORM 形参不能引用函数体的局部 `DATA`**。

**★ 项目里的接口 FM，它的校验 FORM 经常不在函数本体里，而在函数组的 FORM include**（2026-09-29 `ZBPM_ISP002` 实测：`frm_check_lifnr` / `frm_check_kunnr` 在 **`LZFG_BPM002F01`**，主源码里只剩调用点）。
`get_source.js FM <FM> <组>` 只回函数本体 —— 想追「这条报错是谁报的、读的哪个字段」时会直接扑空。做法：

```bash
# ① 列函数组的全部 include
SAP_ENV_FILE=$PWD/env/dev.env node scripts/work/adt.js query \
  "SELECT master, include FROM d010inc WHERE master = 'SAPLZFG_BPM002'"
#   → LZFG_BPM002$01（TOP）/ LZFG_BPM002U01（PBO…）/ LZFG_BPM002F01（FORM）/ ZGSP_1C_RFC_LOGGER …
# ② 拉 FORM include（名字规律：L<函数组>F01）
SAP_ENV_FILE=$PWD/env/dev.env node scripts/work/get_source.js INCL LZFG_BPM002F01 --out=/tmp/x.abap
grep -nE "^FORM|^ENDFORM" /tmp/x.abap        # ★ 用 -E，BSD grep 不认 \|
```
**判据**：主源码里 `PERFORM frm_xxx` 有调用点、但全文搜不到 `FORM frm_xxx`，就是它躺在 include 里（别误判成"这段逻辑没实现"）。

**新语法在接口函数里两处必踩**（都会被编译器顶回来，激活直接取消）：
- `UPDATE … SET f1 = @a, f2 = @b` —— **多个赋值之间必须逗号分隔**（空格分隔报 *The elements in the "SET" list must be separated using commas*）。
- `DELETE FROM … WHERE f = var` / `SELECT … WHERE f = var` —— **变量与 `CONSTANTS` 常量都要 `@` 转义**（报 *The variable "X" must be escaped using "@"*）。

**接口是否可被外围（RFC/HTTP）调用：查 `ENLFDIR`**（注意是 `ENLFDIR`，`ENLFD` 报「找不到」）：

```bash
SAP_ENV_FILE=$PWD/env/dev.env node scripts/work/adt.js query \
  "SELECT funcname, area, active FROM enlfdir WHERE funcname LIKE 'ZBPM_ISP%'"
# ACTIVE='X' 即远程启用；新建的函数默认在表内，无需手工勾选
```

### 5.3 ⭐ FG 内 FORM 的形参类型必须与标准 FM 的形参类型**逐字一致**（否则运行期 500）

**症状**（2026-09-29 `ZBPM_ISP014` 实测）：函数模块激活全过、`CheckFunctionModule` 零错误，
但**一命中真实数据就跑 `HTTP 500 Type conflict during a function module call`**；**空入参反而正常**。

**根因**：本系统数据元素 **`TDNAME` = `CHAR16`（域 `TDCHAR16`）**，而 `READ_TEXT` 的 `NAME` 形参类型是
`THEAD-TDNAME` ＝ 数据元素 **`TDOBNAME`（`CHAR70`）**。FORM 形参写 `TYPE tdname`（CHAR16）接到
`READ_TEXT` 的 CHAR70 形参上：**编译不报、运行抛类型冲突**。
（`TDID`=CHAR4 / `TDOBJECT`=CHAR10 与标准形参一致，本不是问题。）

**修法**（二选一）：

1. **改形参类型** `TYPE tdobname`；调用方还需先把 `VBAK-VBELN`(CHAR10) 抄进 `TYPE tdobname` 的局部变量再 `PERFORM` ——
   直接传字段会报 *actual parameter "<FS_HEAD>-VBELN" is incompatible with the formal parameter "IV_NAME"*。
2. **⭐ 绕开 `READ_TEXT`，直读 `STXL` 簇表**（本项目采用；本系统 `SAVE_TEXT` 的落库格式与 `STXL` 簇一致）：

```abap
TYPES: BEGIN OF ty_stxl_raw, clustr TYPE stxl-clustr, clustd TYPE stxl-clustd, END OF ty_stxl_raw.
DATA: lt_stxl_raw TYPE STANDARD TABLE OF ty_stxl_raw,
      lt_lines    TYPE STANDARD TABLE OF tline,
      ls_line     TYPE tline.

SELECT clustr, clustd                      " ← S/4 必须逗号分隔，漏一个逗号激活即失败
  FROM stxl INTO CORRESPONDING FIELDS OF TABLE @lt_stxl_raw
  WHERE tdobject = @iv_object AND tdname = @iv_name AND tdid = @iv_id
    AND tdspras  = '1'.                    " 先试 ZH(1)
IF lt_stxl_raw IS INITIAL AND sy-langu <> '1'.
  SELECT clustr, clustd
    FROM stxl INTO CORRESPONDING FIELDS OF TABLE @lt_stxl_raw
    WHERE tdobject = @iv_object AND tdname = @iv_name AND tdid = @iv_id
      AND tdspras  = @sy-langu.             " 再兜底运行语言
ENDIF.
IF lt_stxl_raw IS INITIAL.  RETURN.  ENDIF.
IMPORT tline = lt_lines FROM INTERNAL TABLE lt_stxl_raw.
IF sy-subrc <> 0 OR lt_lines IS INITIAL.  RETURN.  ENDIF.
LOOP AT lt_lines INTO ls_line.
  IF cv_text IS INITIAL.  cv_text = ls_line-tdline.
  ELSE.                   cv_text = |{ cv_text } { ls_line-tdline }|.  ENDIF.
ENDLOOP.
```

**等价性已验证**：另建 `$TMP` 探针用**报表环境下的标准 `READ_TEXT`** 读同一批文本，与本实现**逐字一致**
⇒ 该写法可直接作为标准 `READ_TEXT` 的替代。
**边界**：直读**不解析文本引用 `TDREFNAME`**（销售订单文本均为直接维护，无引用场景）；`IMPORT` 前必须判空。

**★★ 长文本必须「先批量取回、再在内存里 IMPORT」，禁止在循环里逐条查 `STXL`**：

「订单 × 文本标识」两层循环里逐条 `SELECT` ⇒ 往返 = `(抬头数 + 行项目数) × 10`。
正确顺序：① 收集全部文本键（`VBBK` 用 `VBELN`、`VBBP` 用 `VBELN+POSNR`）
→ ② **一条 `FOR ALL ENTRIES` 取回全部簇**
→ ③ 内存逐簇 `IMPORT` 拼串
→ ④ `SORT` + `BINARY SEARCH` 回填。

```abap
SELECT tdobject, tdname, tdid, tdspras, clustr, clustd
  FROM stxl
  FOR ALL ENTRIES IN @lt_key
  WHERE tdobject = @lt_key-tdobject
    AND tdname   = @lt_key-tdname
    AND tdid     IN ( 'Z001', ... 'Z010' )     " tdid 常量列表
  INTO CORRESPONDING FIELDS OF TABLE @lt_stxl. " ← INTO 必须在末尾！
```
- **`INTO` 必须放 SELECT 末尾**：`INTO CORRESPONDING FIELDS OF TABLE` + `FOR ALL ENTRIES` 组合，`INTO` 写前面激活报
  *The INTO/APPENDING clause must be at the end of the SELECT*（SELECT 563）；同文件里 `INTO TABLE` 写前面却没事，别被带偏。
- 键表先 **`CHECK lt_key IS NOT INITIAL`**：`FOR ALL ENTRIES` 空表 = 全表查询。
- 键表上千个要**分批**（如每 500 键一轮），否则生成超长 OR 链 SQL。
- 实测收益（2026-09-29，300 集团 139 抬头 / 1201 行项目）：往返 **13,400 次 → 1 次**，文字部分推算 7.9 s → 整体 1.4 s。
  **旧写法的代价与文本是否存在无关**（本例仅 18 个文本字段有值，照样跑满 13,400 次）——这是最容易被忽略的点。
- 想量化收益时写个 `$TMP` 计时探针（`GET RUN TIME FIELD` 取差值 / 1000 = ms），新旧两种取数方式各跑一遍。

**★ 这类「空入参正常、带真实数据才崩」的 500 定位手法（转储不落 ST22，只能这么夹）**：

① 不带参数调 FM → 正常；② 只传入参 → 正常；③ 传全参数 + **不存在的键** → 正常；
④ 传全参数 + **真实键** → 崩；⑤ 在可疑 FORM 首行插 `RETURN.` → 恢复正常 ⇒ 故障点即该 FORM。
（本系统 ADT 无头 `programrun` 产生的转储**不出现在 `adt.js dumps`**、按 dump id 直读也是 404，参考 §8.1。）

### 5.4 接口返回「行包含在抬头里」（嵌套结果集，参照 `ZBPM_ISP005`）

外层只回**一张抬头表**，抬头结构内嵌子表 TTYP 组件，子表行类型里再嵌下一层：

| 接口 | 形态 |
|---|---|
| `ZBPM_ISP005` | `ET_DATA(BP_BASIC_S)` → `IND_SECTOR` / `ZBP_FIN` / `ZBP_SALES` / `ZBP_BANK` |
| `ZBPM_ISP014` | `ET_DATA(HEAD_S)` → `ITEM(ITEM_T)` → `SCHED(SCHED_T)` |

- 出参通常只有 **`es_return` + `et_data`** 两个；**查询类接口不返回 FS「Tables」段的 `ET_RETURN`**（无单据号可回）。
- DDIC 结构加嵌套组件的 DDL 写法：`item : zbpm_isp014_item_t;`（小写类型名，同 `zbp_fin : zbpm_isp005_bp_fin_t;`）。
  用 `UpdateStructure` 传**完整 DDL**（链式引用合法：`HEAD_S → ITEM_T → ITEM_S → SCHED_T → SCHED_S`，无循环）。
- ABAP 侧操作嵌套表**只用 `APPEND wa TO <struct>-<comp>`**（最稳）；`lines( ls_head-item )`、
  `READ TABLE ls_head-item INTO wa INDEX 1`（工作区上的嵌套表）实测可用。
- **归位用「唯一键 + 二分查找」，不要线性扫描**：行项目按 `VBELN`（抬头唯一）归入抬头、
  计划行按 `VBELN+POSNR`（行项目唯一）归入行项目；两张源表先 `SORT`。
- ⚠️ **不能把「读缓冲表」抽成独立 FORM**：FORM 形参类型必须在 FORM 语句处可见，FORM 体内的 `TYPES` 对另一个 FORM 不可见
  ⇒ 要么在填充循环里内联（可用 `ASSIGN COMPONENT <动态字段名> OF STRUCTURE <结构> TO <fs>` 做多字段分发），要么把 `TYPES` 放到函数组 TOP include。
- ⚠️ 联调前跟对接方确认一次中间件能否消化「结构内含内表」——部分经典 RFC 栈有限制（`ZBPM_ISP005` 已在用，风险较低但值得先验报文）。


## 6. 文本元素（TEXT-xxx）：块标题、ALV 列标题、消息 —— 推送 / 激活 / 排查

**`SELECTION-SCREEN ... WITH FRAME TITLE <x>` 的操作数只接受文本符号名（≤8 字符）**，既不能写中文字面量、也不能写变量。

- 写变量 `TITLE gv_title_b1` 报的是 EU 消息 **`The name of the comment can be up to eight characters long.`**（文案极具误导性，行号指向 TITLE 后面的操作数）。`act_dump_prog.js` 会用 `href="...#start=行,列"` 给出精确坐标，**别靠消息文案猜**。
- 正确写法：`WITH FRAME TITLE text-001.`，且**必须先推文本元素再激活源码**（激活时语法检查会校验符号存在）。

推送文本元素（`scripts/work/push_textelements.js`，JSON 见 `scripts/work/textelements/<PROG>.json`）：

```bash
SAP_ENV_FILE=$PWD/env/dev.env CORR_NR=DEVK900006 TE_FILE=$PWD/scripts/work/textelements/ZFIR005.json node scripts/work/push_textelements.js
```

**★ 增删符号的顺序不一样，别背成一条口诀**

- **新增**符号（源码要引用新 `TEXT-nnn`）→ **先推文本元素并激活，再推源码**（否则语法检查报符号不存在）。
- **删除**符号（源码去掉了某参数的文案，如删掉「测试运行」时连带删 `TEXT-021`）→ **先推源码，再推文本元素**。
  原因：文本元素 `PUT symbols` 是**整块覆盖**，删符号会立刻让 SAP 端 *当前 active 的* 源码变成"引用了不存在的符号"；
  先推源码就没有这个中间态。（顺序反了也不会立刻报错，但中间窗口做任何语法检查都会挂。）
- 删符号**一般用不着写探针**：PUT 是覆盖语义 → 从 JSON 里删掉重跑，看回读行数即可。
  实测：148 个符号回读 443 行、157 个回读 470 行（每符号 `@MaxLength` + `KEY=TEXT` + 空行 = 3 行）；
  `selections` 8 条 = 15 行、9 条 = 17 行。
  **但 `push_textelements.js` 的回读只打印前几行预览 + 总行数** —— 要确认**某一个符号**是否真没了，行数不够、
  得拉全文：`node scripts/work/read_textelements.js <PROG> symbols | grep -E "^T6[0-9]="`。
  （只读脚本，已进本仓库；要点：primer GET 用 `Accept: '*/*'`，后续请求必须带 `x-sap-adt-sessiontype: stateful`。）
- 清理时顺手做一次**一致性比对**（比人眼可靠）：源码里所有 `text-xxx` 引用集合 vs JSON 配置集合，
  双向差集都应为空。`SELECTION-SCREEN` 块里只剩一个元素时**整块删掉**（保留空块会留一个空白框）。

### 6.0 ★ 文本元素是独立可激活对象，PUT 完必须单独激活（曾漏掉，导致人工返工）

**`PUT /textelements/.../source/<sub>` 只写入 inactive 版本。** 文本元素在 ADT 里是**独立对象**，`adtcore:type = "PROG/PX"`，uri 就是文本元素自身（`/sap/bc/adt/textelements/programs/<prog>`），**必须再调一次 ACTIVATE**：

```bash
POST /sap/bc/adt/activation?method=activate&preauditRequested=true&version=inactive
Content-Type: application/vnd.sap.adt.activation.v1+xml
body: <adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">
        <adtcore:objectReference adtcore:uri="/sap/bc/adt/textelements/programs/zfid001b"
                                 adtcore:type="PROG/PX" adtcore:name="ZFID001B"/>
      </adtcore:objectReferences>
```

三条实测结论（2026-09-17 踩到，ZFID001B/C/D 文本元素挂在未激活状态、用户手工激活时发现）：

1. **激活父程序 `PROG/P` 不会连带激活它**。传 `PROG/P` 时 SAP 若认为无内容可激活，会返回 `activationExecuted="false"` **且不带任何 `<msg>`** —— 静默无效，别把它当成功。
2. **激活接口不接受 `corrNr`**（带了 400）。对象归属由自身已挂的请求决定，无需传。
3. 反过来，**当程序本身也有 inactive 版本时**，一次 `PROG/P` 激活会把 `PROG/PX` 一起带上 —— 所以"先推文本元素、紧跟着推源码激活"能碰巧成功。**但这是隐式捷径，不可依赖**；程序已 active 时再推文本元素就漏掉了。

**判据 —— 三步自查（都比看 HTTP 200 可靠）**：

```bash
# ① inactive 清单里有没有 PROG/PX（命名空间是 ioc:，不是 adtcore:，正则写错会得到"0 条"的假象）
GET /sap/bc/adt/activation/inactiveobjects
#   → <ioc:ref adtcore:type="PROG/PX" adtcore:name="ZFID001B" adtcore:parentUri=".../programs/zfid001b"/>
#   注意：PROG/P 也会出现在清单里（父对象有未激活子对象时），别据此判断程序源码未激活。

# ② 比对 active / inactive 两个版本的内容
GET /sap/bc/adt/textelements/programs/<prog>/source/symbols?version=active
GET /sap/bc/adt/textelements/programs/<prog>/source/symbols            # 默认 = inactive
#   → active 为空、inactive 有内容 = 未激活（本次 ZFID001B/C/D 的原始状态）

# ③ 激活后确认 active 非空 + activationExecuted="true"
```

**推荐执行顺序（每次改文本元素都走全）**：推文本元素（含激活）→ 推源码（含激活）。`push_textelements.js` 已内置 [5] 激活 + [6] active 版本回读校验，激活失败会 `exit 1`。

协议要点（实测）：
1. **primer GET 不要带 `Accept: application/vnd.sap.adt.textelements.v1`** —— 会 406。discovery 声明的对象媒体类型是 `application/vnd.sap.adt.textelements.v1+xml`；最稳是不指定 Accept 或用通配 Accept。
2. 返回 406 时先看响应里的 `Accepted content types:` 列表，别自己猜。
3. **LOCK handle 绑定 ADT 会话**：所有请求必须带同一个 `sap-adt-connectionid`（`randomUUID()`）+ 合并的会话 cookie，否则 PUT 报 `Resource REPT xxx is not locked (invalid lock handle)`。
4. LOCK/PUT 都带 `corrNr`；PUT 需要 `If-Match: <etag>`（GET `/source/<sub>` 取）；资源尚不存在时 GET 404，改用 `If-None-Match: *`。
5. 子对象 GET/PUT 的媒体类型分别是 `application/vnd.sap.adt.textelements.<symbols|selections>.v1`。
6. 序列化格式：symbols 为 `@MaxLength:<n>\nKEY=TEXT\n`（块间空行，n ≈ 字符数，中文按 2 计，非关键校验位）；selections 为 `KEY` 左对齐 8 位 + `=` + 文本。
7. 文本符号池**分语言**：会话 `sap-language` 必须与激活会话一致（本项统一 ZH）。

### 6.1 硬编码中文一律转文本元素（FICO 付款平台 ZFID001A 实践）

JS 的 `MESSAGE` 长文本、ALV 列标题、状态描述表都要走文本元素。命名分段（供参考）：

| 段 | 用途 |
|---|---|
| `001`~`00n` | `SELECTION-SCREEN ... WITH FRAME TITLE` 块标题 |
| `010`~`0nn` | 消息文本（含 `&` 占位符） |
| `T01`~`Tnn` | ALV 列标题 |
| `T60`~`T70` / `T80`~`T93` | 单据状态 / 支付状态描述 |

**ALV 字段目录也能引用文本符号**，但**字段名取决于用哪套 ALV**：

| ALV 形态 | 列目录结构 | 列标题字段 |
|---|---|---|
| **SLIS**（`REUSE_ALV_GRID_DISPLAY`） | `slis_fieldcat_alv` | **`SELTEXT_L` / `SELTEXT_M` / `SELTEXT_S`** —— **没有 `coltext`** |
| **LVC**（`REUSE_ALV_GRID_DISPLAY_LVC`） | `lvc_s_fcat` / `lvc_t_fcat` | `COLTEXT`（`TYPE lvc_txtcol`，CHAR40） |

`SELTEXT_L/M/S` 三个一起赋最稳（ALV 按列宽自动挑用哪一个）：

```abap
LOOP AT gt_fcat ASSIGNING FIELD-SYMBOL(<fs_fcat>).
  CASE <fs_fcat>-fieldname.
    WHEN 'LOGID'.  lv_text = TEXT-T01.
    ...
  ENDCASE.
  IF lv_text IS NOT INITIAL.
    <fs_fcat>-seltext_l = lv_text.
    <fs_fcat>-seltext_m = lv_text.
    <fs_fcat>-seltext_s = lv_text.
  ENDIF.
ENDLOOP.
```

**★ 什么时候必须手写 `SELTEXT_*`**：列标题若走 `REUSE_ALV_FIELDCATALOG_MERGE`（按 DDIC 文本取），
**自建表/结构没有字段文本时列标题就是空的**（`ZIFLOG_VIEW` 实例：`ZIFLOG` 的匿名类型字段
`SELECT … FROM dd03t WHERE tabname='ZIFLOG'` 7 行 `DDTEXT` 全空 ⇒ 用户看到一片空白）。
**造表时字段没给 `@EndUserText.label` 就一定会有这个后果**，两种修法：① 报表里手写 `SELTEXT_*`（本报表做法）；
② 回表定义补 `@EndUserText.label`（SE16/SE11 与其他消费者同时受益，治本）。
把 `TEXT-T01`~`Tnn` 与列顺序一一对齐最省事。不必写 `DDIF_FIELDINFO_GET`。

**`MESSAGE TEXT-xxx TYPE 'S' WITH n.` 语法检查不通过**（`WITH` 只适用于「消息类消息」，文本符号作消息文本的短形式不支持）。解法：加辅助 FORM，先取文本、替换占位符、再 `MESSAGE`：

```abap
FORM frm_msg_count USING pv_text TYPE c pv_num1 TYPE i pv_num2 TYPE i.
  DATA: lv_text TYPE string, lv_num TYPE string.
  lv_text = pv_text.
  lv_num  = pv_num1.  REPLACE '&' IN lv_text WITH lv_num.
  IF pv_num2 > 0.  lv_num = pv_num2.  REPLACE '&' IN lv_text WITH lv_num.  ENDIF.
  MESSAGE lv_text TYPE 'S'.
ENDFORM.
" 调用：PERFORM frm_msg_count USING TEXT-021 lv_count 0.
```

**推送顺序不可颠倒**：先 `push_textelements.js` 推符号 → 再推源码激活（激活时语法检查会校验符号存在）。

### 6.2 用户偏好：CASE 分支直接写功能码字面量

用户明确要求过：`CASE pv_ucomm.` 的按钮分支**不要用 `CONSTANTS` 定义**，直接写 `WHEN 'ZSUBMIT'.` / `WHEN 'ZPUSHCBS'.`。在程序头注释里列一张功能码清单即可（`ZSUBMIT/ZPUSHCBS/ZCHGST/ZCHGFB/ZCHGSB/ZGETDOC/ZSUMAMT/ZLOG`）。后续新建付款平台子程序沿用这种写法。

### 6.3 ★ 消息类（MSAG）的 `T100`：按运行语言**精确匹配**，不 fallback 到主语言

**症状**：`MESSAGE s017(zfi_msg) INTO lv_msg.` 拿到的是 **`S:ZFI_MSG:017`** 这种占位串，
不是消息正文 —— **不 dump、不报错、只静默降级**，很容易被当成"消息类没建好"而白查一轮。

**根因**：ADT 无头运行的语言取自**请求头 `sap-language`**（未显式指定时由会话/集团默认决定）：
`client 100` 实测默认 `sy-langu='1'`（ZH），`client 300` 实测默认 `'E'`（EN）。
只在主语言 `T100-SPRSL='1'` 下维护的消息，在 EN 会话下取不到 —— **SAP 不会退回 `T100A-MASTERLANG`**。
（会话语言可用 `SAP_LANGUAGE_OVERRIDE` 显式指定，见 §2 与 §6.4。）

**对策（新增消息一律照做）**：
```bash
# 1) AddMessage 写入主语言（ZH）
node scripts/call-adt-tool.js AddMessage @args.json
# 2) UpdateMessage 带 language 补 EN 条目，否则 300 无头/EN 登录下显示占位串
node scripts/call-adt-tool.js UpdateMessage \
  '{"message_class_name":"ZFI_MSG","msgno":"017","text":"...","language":"EN","transport_request":"DEVK900006"}'
```
- 本项目的既有惯例就是**双语言**（`ZFI_MSG` 001–007 的 `'1'` 和 `'E'` 都是同一段中文），
  新增消息跟随即可，别只写一个语言。
- 自检：`SELECT sprsl, msgnr, text FROM t100 WHERE arbgb = '<MSG>'` —— 每个新号都该有 `1` 和 `E` 两行。
- `MESSAGE ... INTO` 是**判据**：拿到 `X:CLASS:NNN` 形式就说明该语言下没文本。
- 实测 `T100` 数据在 100/300 **内容一致**（在这个系统里改一处两集团可见），
  但"运行语言"仍然是各集团各算，两件事别混。
- 已知残留（未修，待用户定）：`ZGL01-001` 只有 ZH；`ZFI_MSG` 008–016 只有 EN。

**顺带**：`CONCATENATE ... INTO` **不接受数值型变量**（`DATA lv TYPE i` 会报
*"LV_CNT" must be a character-like data object*）→ 拼接含数字的提示一律用字符串模板
`lv = |通过 { lv_ok } 条|.`。

### 6.4 BAPI / 主数据文本按「会话语言」读取

`SET LOCALE LANGUAGE` 与 `sy-langu` 赋值都改不动它，唯一入口是请求头 `sap-language`。根因、症状与对策见 `sap-abap-bapi-usage` 分册 `20-语言与数据格式`；`T100` 消息文本的同源问题见本节 6.3。

## 7. 给 ALV 加自定义按钮：S/4HANA 下 function ALV 的路已断

**结论先行**：在 S/4HANA 新 ALV 内核（`cl_salv_gui` 适配层）下，**`function ALV`（`REUSE_ALV_GRID_DISPLAY_LVC`）无法再通过 `SET HANDLER` + `TOOLBAR` 事件追加自定义工具栏按钮**。只有三条出路：

| 方案 | 可行性 | 代价 |
|---|---|---|
| **SALV**（`cl_salv_table`）`get_functions( )->add_function( )` | ✅ SAP 官方 API，必然生效 | 需重写 ALV 部分；`LVC_T_STYL` 置灰等 SLIS 特性要另找等价物 |
| **GUI 状态**（`SET PF-STATUS` + `i_callback_pf_status_set`） | ✅ 标准做法（**首选**） | 功能码可用 `RS_CUA_INTERNAL_*` **自动登记**（见 7.5，不必人工 SE41）。**REPORT 程序直接往自带的 `STANDARD` 状态加功能码即可**，不必另建状态名；`SET PF-STATUS` 引用不存在的状态在 PBO 上下文会短转储 |
| **hotspot 操作列**（function ALV 内） | ✅ 稳定 | 不是"按钮"外观；但走 `&IC1`，是 SLIS 层内建交互 |

### REPORT 程序的 `STANDARD` 是**默认可编辑**状态（可往里加自定义功能码）

> ⚠️ 本条曾被我写反过，2026-09-16 实测纠正。

对 **REPORT 程序**，`STANDARD` 是系统为该程序预置的默认 GUI 状态，**不是只读保留状态**。用 SE41 打开程序 → 状态 → `STANDARD`，可以直接往里加自定义功能码并分配到应用工具栏，**不需要另建一个叫程序名的状态**。加完后 `SET PF-STATUS 'STANDARD' EXCLUDING lt_extab.` 就能让按钮出现在顶部工具栏。

所以正确的心智模型是：

| 写法 | 结果 |
|---|---|
| `SET PF-STATUS 'STANDARD'`，**且已在 SE41 往 STANDARD 加了功能码** | ✅ 按钮出现 |
| `SET PF-STATUS 'STANDARD'`，没加过功能码 | ✅ 程序能跑，但只有标准按钮（返回/退出/取消等），无自定义按钮 |
| `SET PF-STATUS 'ZXXX'`，状态未建 | list 上下文静默忽略；**PBO 上下文短转储** |

### 怎么验证 GUI 状态到底建没建、功能码全不全（ADT 下唯一可靠办法）

**不要查 `D020S`** —— 那是 dynpro 屏幕头表，`TYPE='S'` 是普通屏幕（样本 `dnum/fnum = 1000`），**GUI 状态根本不在那里**。我曾据此误判"用户没建状态"，被实测打脸。

正确做法：写个 `$TMP` 诊断程序调官方接口，ADT 跑一次即可（范式 `scripts/work/ZZTEST_CUA.abap`）：

```abap
DATA: lt_sta TYPE TABLE OF rsmpe_stat,
      lt_fun TYPE TABLE OF rsmpe_funt,
      lt_act TYPE TABLE OF rsmpe_act,
      lt_but TYPE TABLE OF rsmpe_but,
      lt_pfk TYPE TABLE OF rsmpe_pfk,
      lt_men TYPE TABLE OF rsmpe_men,
      lt_mtx TYPE TABLE OF rsmpe_mnlt,
      lt_set TYPE TABLE OF rsmpe_staf,
      lt_doc TYPE TABLE OF rsmpe_atrt,
      lt_tit TYPE TABLE OF rsmpe_titt.      " ← 这 10 个 TABLES 全是必输，少传一个就
                                            "   dump「Missing parameter in CALL FUNCTION」

CALL FUNCTION 'RS_CUA_INTERNAL_FETCH'
  EXPORTING program = 'ZXXX'  state = 'A'   " state: 'A' 激活版本
  TABLES sta = lt_sta  fun = lt_fun  act = lt_act  but = lt_but  pfk = lt_pfk
         men = lt_men  mtx = lt_mtx  set = lt_set  doc = lt_doc  tit = lt_tit
  EXCEPTIONS not_found = 1  OTHERS = 2.

READ TABLE lt_sta INTO ls_sta WITH KEY code = 'STANDARD'.   " 状态是否存在
READ TABLE lt_fun INTO ls_fun WITH KEY code = 'ZTECO'.      " 功能码是否存在
```

实测样例（ZFIR005）：`sy-subrc = 0`、状态头 1 行（`STANDARD`）、**功能码 62 行**，其中 `ZTECO`（文本 TECO）、`ZUNTECO`（文本 取消TECO）。注意 `RS_CUA_GET_STATUS` 在同样数据下可能返回 `sy-subrc = 2`（not_found_status），**以 `RS_CUA_INTERNAL_FETCH` 为准**。

底层存储：`EUDB`/`EUFUNC` 等 **EU\* 簇表**（键 `RELID+NAME+SPRSL+SRTF2`，数据在 `CLUSTD` 二进制字段）。`SELECT` 能出行但 `CLUSTD` 读不出内容 —— **别试图用 SQL 解析状态**。

### 为什么 TOOLBAR 事件不work（读源码实证）

```abap
" CL_GUI_ALV_GRID 里唯一 RAISE EVENT toolbar 的地方：
method _raise_evt_toolbar.
  raise event toolbar exporting e_object = io_toolbar e_interactive = i_interactive.
endmethod.
" → 全文检索：该方法没有任何调用点

" 真正跑的是 SET_TOOLBAR：
method set_toolbar.
  _o_grid_assist->IF_SALV_GUI_GRID_UI_FUNCTIONS~update_toolbar(
    importing t_toolbar = m_cl_toolbar->mt_toolbar ).   " 直接覆盖内部按钮表
  me->set_toolbar_buttons( m_cl_toolbar->mt_toolbar ).
```

新内核直接**覆盖**按钮表、不回调客户 handler。下面这段老写法在 S/4HANA 上会注册成功，但按钮永远不出现：

```abap
METHODS handle_toolbar FOR EVENT toolbar OF cl_gui_alv_grid
  IMPORTING e_object e_interactive.          " e_object 类型 = CL_ALV_EVENT_TOOLBAR_SET
DATA ls_button TYPE stb_button.
ls_button-butn_type = 0.
ls_button-function  = 'ZTECO'.
ls_button-text      = '批量执行TECO'.        " 注意：设了 icon 就只渲染图标，TEXT 仅作悬停提示
APPEND ls_button TO e_object->mt_toolbar.
SET HANDLER gr_event_handler->handle_toolbar FOR gr_grid.
gr_grid->set_toolbar_interactive( ).
```

### hotspot 操作列的稳定写法（推荐替代）

```abap
" fieldcat：把操作列标成热点
LOOP AT gt_fieldcat ASSIGNING FIELD-SYMBOL(<fs_fcat>).
  IF <fs_fcat>-fieldname = 'Z_ACT_TECO' OR <fs_fcat>-fieldname = 'Z_ACT_UNTECO'.
    <fs_fcat>-hotspot = abap_true.
  ENDIF.
ENDLOOP.

" 回调：&IC1 是 ALV 内建交互，必然可用
CASE pv_ucomm.
  WHEN '&IC1'.
    CASE ps_selfield-fieldname.
      WHEN 'Z_ACT_TECO'.   PERFORM frm_pick_row USING ps_selfield-tabindex.  PERFORM frm_exec_teco.
      WHEN 'Z_ACT_UNTECO'. PERFORM frm_pick_row USING ps_selfield-tabindex.  PERFORM frm_exec_unteco.
    ENDCASE.
ENDCASE.
```

### 走 GUI 状态方案的实操（推荐给要"顶部真按钮"的场景）

程序侧：

```abap
CONSTANTS: c_pf_status TYPE flag VALUE ' '.   " 状态建好后改 VALUE 'X'（CONSTANTS 必须带 VALUE！）

" CALL FUNCTION 'REUSE_ALV_GRID_DISPLAY_LVC' EXPORTING ...
"   i_callback_pf_status_set = 'FRM_SET_PF_STATUS'

FORM frm_set_pf_status USING pt_extab TYPE slis_t_extab.
  IF c_pf_status IS INITIAL.     " 保护：状态没建就 RETURN，别硬调
    RETURN.
  ENDIF.
  SET PF-STATUS 'ZFIR005' EXCLUDING pt_extab.
ENDFORM.
```

- **`SET PF-STATUS` 引用不存在的状态**：**list 上下文静默忽略**（实测不短转储，`sy-pfkey` 仍被赋成该名）；**PBO 上下文会短转储**。→ 必须用开关或先确认状态已建，不能无条件调。
- **别想用表判断状态是否存在**：`D020S.TYPE='S'` 是**普通屏幕**不是状态（63718 行，样本 `dnum=fnum=1000`）；`D022S`/`D023S` 是**池表**，SQL 直接报「找不到」。**`RS_SCREEN_CREATE` 也只能建 dynpro**（`H_G=D020S`/`F_G=D021S`/`M_G=D023S`/`E_G=DYN_FLOWLIST`），不含 GUI 状态。
- 状态内容至少要含：自定义功能码（本例 `ZTECO`/`ZUNTECO`）+ **`&F03` / `&F15` / `&F12`**，否则用户会被困在列表里出不来。
- **`CONSTANTS` 语句必须带 `VALUE`**：`CONSTANTS: c_x TYPE flag.` 激活报 `"VALUE ..." is not specified.`

### 7.5 ★ 自动登记功能码：绕开 SE41（2026-09-17 突破）

> 完整操作手册见独立技能 **`sap-cua-gui-status-functions`**。

**结论：GUI 状态的功能码可以用 SE41 的宿主 API 自动写，不必人工。** 与「ADT 无 TCODE 资源 → 写 `$TMP` 报表调 `RPY_TRANSACTION_INSERT`」同构。

**标准入口（推荐）：`node scripts/work/gen_cua.js`** —— 配置驱动，一条命令跑完
「读配置 → 注入模板 → 推送 → 运行 → 回读 + `RS_CUA_GET_FUNCTIONS` 双复核」。
每个程序一份 `scripts/work/cua/config/<PROG>.json` 定义按钮（功能码/文字/图标/信息文本），
**`pfno` / `but_no` 不用配**，ABAP 侧自动挑空闲号、重跑沿用旧号（幂等）。
`gen_cua.js` 任一校验不过就非零退出，不会静默通过。

#### 登记一个自定义功能码 = 往 4 张表各加 1 行

以已在用的 ZFIR005（`ZTECO`/`ZUNTECO`）为样板 diff 得出：

| 表 | 类型 | 关键字段 |
|---|---|---|
| `set` | `rsmpe_staf` | `status='STANDARD'` + `function=<FCODE>` |
| `fun` | `rsmpe_funt` | `code` + `textno='001'` + `fun_text` + `text_type='S'` + `icon_id` + `text_name`（**是图标技术名**如 `ICON_MASS_CHANGE`，不是文本！） |
| `but` | `rsmpe_but` | `pfk_code='000001'` + `code='0001'` + `no=<按钮序号>` + `pfno=<功能键号>` |
| `pfk` | `rsmpe_pfk` | `code='000001'` + `pfno=<功能键号>` + `funcode=<FCODE>` + `funno='001'` |

- `000001` 指向状态头 `rsmpe_stat` 的 `butcode`/`pfkcode`；`but.no` 是应用工具栏上的**排列序号**（接现有最大值递增），`but.pfno` = `pfk.pfno` = 分配的**功能键号**。`but` 里 `pfno='S'` 表示分隔符。
- 功能键号要挑**空闲**的：F1–F24 / Ctrl+F / Alt+F 段按 01–99 编号。本项目 ZFID001x 用 **49–56**（Alt+F 段，实测全空、不与常用快捷键冲突）。**别占用 F4 这类常用键**。`gen_cua.js` 的 `pfnoStart` 默认 49，自动避让已占号。
- `act`（应用工具栏）**不需要动** —— ZFIR005 的 `ZTECO` 就不在 `act` 里。

#### 流程（顺序不可颠倒）

```abap
RS_CUA_INTERNAL_FETCH      " 读 state='A'，adm 一起取（WRITE 要求原样传回）
  → 追加上述 4 张表的行
RS_CUA_INTERNAL_WRITE      " state='A' 直接落激活版本
                           "   tr_key = (obj_type='PROG', obj_name=<prog>,
                           "             sub_type='CUAD', sub_name=<prog>, devclass=<TADIR 的包>)
COMMIT WORK AND WAIT       " ★ EXPORT TO DATABASE 走 update task，不 COMMIT 后续读不到
RS_CUA_INTERNAL_GENERATE   " 生成 load
```

#### 三个必须知道的坑

1. **`RS_CUA_INTERNAL_GENERATE` 必然回 `rc=3` / `EC/801`（"生成 &1 已终止，返回代码 4"）—— 环境固有，不是失败。** 对照实验：手工建的、正常工作的 `ZFIR005` 同样如此。**别为它折腾**，功能不受影响。
2. **判定成功的唯一依据是 `RS_CUA_GET_FUNCTIONS`（运行时真正读 CUA 的接口）能看到功能码**，别信 GENERATE 的返回码：
   ```abap
   CALL FUNCTION 'RS_CUA_GET_FUNCTIONS'
     EXPORTING program = 'ZXXX'
     TABLES function_list = lt_funl    " 行类型 rsmpe_funl：fcode/text/icon_id/pfno/but_seq/texttype
     EXCEPTIONS menu_not_found = 1 program_not_found = 2 OTHERS = 3.
   ```
3. **没在 GUI 打开过的程序 `FETCH` 会 `rc=1`（NOT_FOUND）—— 它压根没有 CUA 记录**，无法"追加"。解法：**从有记录的程序取基线整份写入**。依据是实测 diff：**REPORT 程序的 `STANDARD` 基线在各程序间完全一致**（ZFID001A 与手工建的 ZFIR005 除各自自定义码外逐字段相同）。写入前**先把基线里所有 `Z` 开头的功能码剔掉**（系统标准码都不是 Z 开头）——`gen_cua.js`/`ZCUA_APPLY` 已按此实现，别改成"按配置表里归基线名下的 code 剔"，那个只在基线正好在配置表里时才对。

#### 其它

- `RS_CUA_GET_FUNCTIONS` 看不到 `pfno`/`but_seq`（FUNL 表不带）；要这两个字段用 `RS_CUA_INTERNAL_FETCH` 的 `but`/`pfk` 表。
- 写入是**纯追加**且幂等（同 `code` / 同 `pfno` 先删再加）；要回退就从 4 张表里删掉这些 code 重写 —— 这就是备份。
- 传输：**CUA 是 `PROG` 的子对象 `CUAD`，随 `R3TR PROG` 走，不需要额外挂请求**。实证：
  `RS_GET_KEY_FOR_CLM_TOOL_LOG( object=<prog>, object_class='SCUA' )` 返回 `obj=PROG <prog>` / `sub=CUAD`；
  `TADIR` 全局 0 条 CUAD、`E071` 里没有 CUAD 行；`RS_CUA_VERSION_EXPORT( <prog>, 'A' )` 走传输导出入口 `rc=0`
  且实取到全部功能码。（`E071` 里的 `LIMU CUAD` 只在 SAP 自家 `SAPK-*` 补丁包出现。）
- `CONCATENATE` 不收 `TYPE i` 变量（报 `"LV_RC" must be a character-like data object`），先转 `TYPE char<n>` 再拼。

### 其它硬事实（都踩过）

- **`SET_TOOLBAR_INTERACTIVE` 无参数、无异常**（`method set_toolbar_interactive . set_toolbar( exporting i_interactive = 'X' ). endmethod.`）。写 `EXCEPTIONS error_in_set_toolbar` → 激活失败 `The exception "ERROR_IN_SET_TOOLBAR" does not exist`；写 `OTHERS` → 把真实异常**静默吞掉**。正确写法：`gr_grid->set_toolbar_interactive( ).`
- **`GET_GLOBALS_FROM_SLVC_FULLSCR` 不可靠**：新内核里带 `cl_salv_gui_broker=>todo( 'GET_GLOBALS_FROM_SLVC' )` 未完成迁移标记，`e_grid = gt_grid-grid` 可能为空。兜底：`ASSIGN ('(SAPLSLVC_FULLSCREEN)GT_GRID')` → `ASSIGN COMPONENT 'GRID' OF STRUCTURE`。
- **不要 `CREATE OBJECT gr_toolbar EXPORTING parent = gr_grid`** —— `cl_gui_toolbar` 的 `PARENT` 要 `cl_gui_container`，而 `cl_gui_alv_grid` 不是其子类，编译报 `"GR_GRID" is not type-compatible with formal parameter "PARENT"`。该版本 `cl_gui_toolbar` 也没有 `mt_toolbar`（只有 `add_button`）。
- `REUSE_ALV_EVENTS_GET` 的合法事件清单里 **`CALLER_EXIT` 存在**（`i_list_type = 0/1` 首项），`i_list_type = 2/3` 时不含。写个 `$TMP` 打印该清单即可自查。
- **不要在回调里调 `gr_grid->refresh_table_display`**：只声明 `FINISHED` 一个异常，事件处理阶段调用失败会**短转储且不可捕获**。刷新统一靠 `ps_selfield-refresh = 'X'`。
- **ALV `box` 勾选框必须调 `check_changed_data`**：勾选态只存在于前端网格，回调里不调这一步**不会回写输出内表** → 执行逻辑读到 `box` 全空，表现为「按钮点了但一条都没处理」（**不是**逻辑写错）。写法：

```abap
FORM frm_user_command USING pv_ucomm LIKE sy-ucomm
                            ps_selfield TYPE slis_selfield.
  IF gr_grid IS INITIAL.
    CALL FUNCTION 'GET_GLOBALS_FROM_SLVC_FULLSCR'
      IMPORTING e_grid = gr_grid.
  ENDIF.
  CALL METHOD gr_grid->check_changed_data.   " ← 少了这行，勾选全部丢失
  CASE pv_ucomm. ...
```
- 改 OO ALV 前先读源码：**声明用 `CLASD`、实现用 `CLASI`**（`node scripts/work/get_source.js CLASD|CLASI CL_GUI_ALV_GRID --out=/tmp/x`）。**核查"某方法/事件是否被调用"必须读 `CLASI`** —— `CLASD` 只有 METHOD 声明，在定义文件里 grep 调用点必然得到「0 处」的**假结论**。本项目据此复核 `_raise_evt_toolbar`：实现文件 16608 行里只有第 16529 行的 `method _raise_evt_toolbar.` 定义、全文无调用点（结论成立，但方法要用对）。**别凭记忆写 OO ALV API。**
- **想在 ADT 里"跑一次看 GUI 效果"做不到**：`REUSE_ALV_GRID_DISPLAY_LVC` 必然 `CALL SCREEN 500`，ADT 驱动不了 dynpro。**功能码是否登记成功**可以自动验证（`RS_CUA_GET_FUNCTIONS`，见 7.5）；但**按钮实际长什么样、排在哪**只能请用户在 GUI 里目视确认。

### 7.6 ★ 标准弹框 / 弹窗表格：实测可用的 FM 与「反直觉」返回语义

2026-09-17 做 ZFID001A 的 8 个按钮逻辑时实测。**先读 FM 源码再写调用**（`node scripts/work/get_source.js FM <名> <函数池> --out=/tmp/x`，
函数池用 `SELECT funcname, pname FROM tfdir WHERE funcname = '...'` 查），别凭记忆：

| 需求 | FM（函数池） | 关键参数 |
|---|---|---|
| 多选一（如选目标状态） | `POPUP_TO_DECIDE_LIST`（SAPLSPO5） | `TABLES t_spopli LIKE SPOPLI`（选项文本放 `VAROPTION`，CHAR65）、`EXPORTING titel / textline1 / cursorline`、`IMPORTING answer` |
| 可编辑字段录入 | `POPUP_GET_VALUES`（SAPLSPO4） | `TABLES fields LIKE SVAL`、`EXPORTING popup_title`、`IMPORTING returncode`；**异常只有一个** `error_in_fields` |
| 弹窗表格展示 | `REUSE_ALV_POPUP_TO_SELECT`（SAPLSALV） | `EXPORTING i_title / i_tabname / it_fieldcat`、`TABLES t_outtab`、`IMPORTING es_selfield` |
| 打开 URL / 文件地址 | `CALL_BROWSER`（SAPLSDCB） | `EXPORTING url` —— **泛型 `TYPE C`**，可直接传 `CHAR(1000)` 的地址字段 |

- **本系统没有 `POPUP_TO_DISPLAY_TABLE`**：`TFDIR` LIKE `POPUP%TABLE%` 只有 `POPUP_TABLE_DISPLAY / POPUP_WITH_TABLE / POPUP_TO_CONFIRM_WITH_TABLE / POPUP_WITH_TABLE_DISPLAY_OK / POPUP_SEEK_IN_TABLE / POPUP_TO_SHOW_DB_DATA_IN_TABLE / POPUP_WITH_TABLE_DISPLAY`。
  要**中文列头**就用 `REUSE_ALV_POPUP_TO_SELECT` + 自建 `SLIS_T_FIELDCAT_ALV`（`seltext_m` 取文本元素），别指望本地结构自动带出 DDIC 列标题。

**★ 反直觉点（照直觉写必错，已用源码坐实）**

1. **`POPUP_TO_DECIDE_LIST` 的 `ANSWER` 与直觉相反**（源码 176 行起）：`IF OK_CODE = 'ESC '. ANSWER = 'A'.`（**`'A'` = Abbruch = 取消**），否则 `ANSWER = ANTWORT` = **被选中行的行号（字符形式）**。
   → 判取消写 `IF answer IS INITIAL OR answer = 'A'.`；选中项必须 `READ TABLE ... INDEX lv_answer` 回取。
   → 它返回的是**行号不是选项文本**，所以**不要在显示串里反解业务码**：另建一张与 `t_spopli` 同序的码表，靠行号取码。
2. **`POPUP_GET_VALUES` 的 `returncode` 是 `'A' = 确认 / space = 取消`**（源码 56 / 60 行）→ 判取消写 `IF rc <> 'A'.`。
3. **`SVAL-FIELD_ATTR = '02'` = 只显示、不可输入**（其余为空 = 可输入）；`FIELDNAME` 在弹框内唯一时回读直接 `READ TABLE lt_sval INTO ... WITH KEY fieldname = 'ZFBANKA'`（字符比较自动忽略尾空格）。要显示 DDIC 标签就自己填 `FIELDTEXT`（CHAR20）。
4. **`REUSE_ALV_POPUP_TO_SELECT` 的 `T_OUTTAB` 形参是 `STANDARD TABLE`** → 项目里惯用的 `SORTED TABLE ... WITH UNIQUE KEY` 存在**传参类型不匹配风险**。弹窗展示用的内表一律声明为 `STANDARD TABLE OF ... WITH NON-UNIQUE KEY ...`，累加用「`READ TABLE ... WITH KEY` 命中就累加、否则 `INSERT`」保证不重。
5. **`EXCEPTIONS` 只写该 FM 真实存在的异常名**；想加兜底再补 `OTHERS`（必须最后）。写不存在的异常名 → 激活报 `The exception "XXX" does not exist`。

## 8. 可靠性与 SQL 侧注意

- **激活报错只给一条消息时**，用 `SRC_NAME=ZXXX node scripts/work/act_dump_prog.js` 打原始 `chkl:messages`（带 `href="#start=行,列"`），修完再推，逐轮收敛。
- **`@abap_true` 不允许与 `FOR ALL ENTRIES` 组合**：激活报 `The addition ABAP_TRUE is not allowed in combination with FOR ALL ENTRIES. Use JOINs or global temporary tables instead of FOR ALL ENTRIES.`（`SELECT SINGLE @abap_true … FOR ALL ENTRIES` 也一样不合法）。想要"存在即命中"，改成查**单个实际列**再判空：

```abap
" ❌ 激活被拒
SELECT @abap_true FROM csks FOR ALL ENTRIES IN @lt_kostl
 WHERE kostl = @lt_kostl-table_line AND bkzkp = 'X' INTO TABLE @lt_locked.
" ✅
SELECT kostl FROM csks FOR ALL ENTRIES IN @lt_kostl
 WHERE kostl = @lt_kostl-table_line AND bkzkp = 'X' INTO TABLE @lt_locked.
IF lt_locked IS NOT INITIAL.  " 命中
```
- **`col IN @空范围表` 的语义 = 不过滤**（实测：与无该条件时行数一致）。所以 `WHERE auart LIKE 'ZP%' AND auart IN @s_auart` 在用户不填订单类型时会返回全部 ZP* 订单，符合"非必输"预期。
- 本系统 SQL 接口（`GetSqlQuery` / `adt.js query`）限制：**只允许单条 SELECT、不支持表别名/JOIN、`COUNT(*)` 之类投影列要起别名**，否则 400。
- **BSD grep 不支持 `\|`**：多关键字一律 `grep -E`，否则"无匹配"是假象（本次据此误判过两轮）。
- **⭐ 部分列 SELECT：`INTO TABLE` 是按「位置」赋值，不是按字段名**。拿整行表类型去接**少于全列**的 SELECT 列表
  （如 `lt TYPE STANDARD TABLE OF dd07t` 接 `domvalue_l, ddtext`）→ 值落进结构的**前两个字段**
  （这里是 `DOMNAME`/`DDLANGUAGE`），再读 `domvalue_l`/`ddtext` **恒为空**。**不报错、不告警、行数还是对的**，
  只有事后取值才发现。部分列一律自建「只含所需列、顺序与 SELECT 列表一致」的结构（或 `INTO CORRESPONDING FIELDS OF`）。
  典型受害者：从域固定值取状态码描述。用 `$TMP` 探针跑一遍就能当场钉死。
- **`FORM ... USING` 形参写死长度会在不同实参长度上报错**：`IN PERFORM OR CALL FUNCTION "FRM_GET_ST_TEXT", the actual parameter "<FS_ALV>-ZDJZT" is incompatible with the formal parameter "PV_CODE".`。原因：形参声明 `TYPE char15` / `TYPE char20`，而实参 `ZDJZT`(CHAR2) / `ZDJZTMS`(CHAR10) / `ZFKZTMS`(CHAR20) 长度不一。**解法：形参改泛型 `TYPE c`，它会继承实参长度。**

```abap
" ❌ 固定长度，实参长度不同就炸
FORM frm_get_st_text USING pv_code TYPE char15.
" ✅ 泛型，长度随实参
FORM frm_get_st_text USING pv_code TYPE c.
```
（与下面 `TYPE string` 的坑是同一族问题的两面：**形参类型要么 `TYPE c`（继承长度）、要么 `TYPE string`（调用侧先赋 string 变量）**，别写 `TYPE char<n>`。）

- **`SELECT ... INTO TABLE @lt_distinct` 的 `INTO` 要放在 `FROM` 之后**；`VALUE #( FOR ls IN lt ( ... ) )` 里的 `ls` **是行本身**：当 `lt` 行类型是**标量**（如 `TABLE OF ztepic01-zskdw`）时写 `( code = ls-zskdw )` 必炸 —— 报 `"UP" is not allowed here. "." is expected.` 和 `The data object "LS" does not have a structure and therefore does not have a component called "ZSKDW"`。正确写法 `( code = ls )`。

- **`FORM ... USING` 的 `TYPE string` 形参不能收「字符串模板」与「变长字符变量」**：激活报实参与形参类型不兼容，`PERFORM f USING 1 '描述' |{ lv_x }|.` 必失败。测试程序的做法 —— 断言形参一律声明 `TYPE string`，调用侧先把值赋给全局 `TYPE string` 变量再传：

```abap
gv_e = 'S'.  gv_a = ls_ret-msgty.
PERFORM assert_eq USING 1 '返回类型应为 S' gv_e gv_a.
```

- **`adt.js query`（该 SQL 服务）不支持聚合函数**：`SELECT MIN(belnr) AS minb FROM bkpf` 报 `Unknown column name "MIN(BELNR)"`；`SELECT COUNT(*) AS c FROM t` 可用。要极值就取全量再本地算。
- 复核取值逻辑时可写**无选择屏幕的** `$TMP` 诊断报表（`adt.js run` 能跑），一次验证多个假设：范围表语义 + 真实数据分布 + 状态字典。范式 `scripts/work/ZTEST_ZFIR005_DIAG.abap`。
  *（2026-09-23 已实测复核：裸 `REPORT`、无 `PARAMETERS` / `SELECTION-SCREEN` 的程序，`adt.js run` **正常运行**并回全部 `WRITE` 输出。所以**不要**为了「能跑」去加占位选择屏幕。）*
- **⭐ `adt.js run` 回 `Error: Program does not exist!`（HTTP 200）时，先原样重试 2~3 次，不要改代码。**
  该短文本是 ADT 控制台侧**偶发**返回，**与程序是否存在 / 是否激活无关**：实测同一系统同一 client，
  裸 `REPORT` 的 `ZTEST_LOOPERF` 偶发命中该报错、**重试即通过**（连跑 3 次全成功），
  同时段裸 `REPORT` 的 `ZTEST_ZFIR005_DIAG` 一次就正常；直连
  `POST /sap/bc/adt/programs/programrun/<PROG>?sap-client=300` 也返回 200 + 正常输出。
  排查该报错前先确认这三件事都正常，再看是否**稳定复现**：`TRDIR` 有记录（`SELECT name, subc FROM trdir WHERE name = '<PROG>'`）、
  `check_activation.js` 不报 inactive、`adt.js dumps` 无新转储。
  **反例警示**：曾因「同时改了两处（加占位 `PARAMETERS` + 降低负载）后就好了」而把病因归到「缺选择屏幕」——
  这是**单次观测 + 多变量同改**造成的错误归因，隔日复查即被推翻。**排除性归因必须一次只动一个变量，且要能稳定复现。**
- **`fieldcat-fieldname` 写错不报激活错、运行期才炸**：本轮把 `ZFDJWJ` 写成 `ZFKDJWJ` 之外的拼法（与 `ty_alv` 组件不一致），激活一路通过，ALV 一渲染就找不到列。**推源码前先本地校验**：把 `frm_build_fcat` 里所有 `fieldname = 'XXX'` 抽出来，与 `ty_alv` 的组件名列表取差集，同时查重、查 `TEXT-Tnn` 是否连续。用 Python 正则扫一遍只要几秒。

- **`yyyy.mm` 期间 → 时间戳区间的换算走字符拼接，别做数值运算**：`ZSPTIM` 是 `DEC(15)` 存 `YYYYMMDDHHMMSS`，用 `CONCATENATE lv_gjahr lv_monat '00000000' INTO lv_low.` / `'99999999' INTO lv_high.` 构区间边界，避免 15 位大数的舍入/溢出。跨年回绕（如 11 月 ~ 次年 2 月）要**拆成多段 range 追加**，不能只给一个区间。换算正确性用 `$TMP` 探针验证（范式 `scripts/work/ZTEST_ZFID001A_CHK.abap`，覆盖单月 / 全年 / 跨年回绕三类用例）。

### 8.0 ★ 探针设计：断言要判「可判定」，别把数据面缺失报成 FAIL

**口径类断言先确认分母非空**。凡用「命中订单 / 某子集」当分母的用例，在该子集为空时会退化成 `0 = 0`
或 `0 > 0`，两者都不是对程序的判定 —— 前者是**伪 FAIL**（本次 ZFID003 T10a：命中 `E0002` 的订单其组件全被删除标记），
后者是无意义的 PASS。处理原则二选一：

1. **换口径断言**：把前提性结论（如「明细行与 RESB 行 1:1」）放到**全量集合**上验证 —— 换口径后本次拿到 52 = 52 行，依然是有效证据；
2. **判 SKIP 并写清依据**：给 `chk` 加第三种状态 `'S'` 并**独立计数**，正文里给出取证的数字（如「订单 resb 共 2 行且**全部** `XLOEK='X'`」）。

两种都要在断言文本里带上**实际数字与期望**，否则下一次复盘时无法判断它当时到底验了什么。

**口径变更类改动的回归套路**（本次 ZFID003 明细投料 COEP → MSEG → `RESB-ENMNG/ENWRT`）：
先找一条**能暴露差异的真实数据**当样板（同物料跨两道工序、两行已领量不同），
断言写成「两行各取自己的值」而不是「和等于 X」—— 前者在旧口径下必 FAIL、新口径下 PASS，才有回归能力；
再补一条「比值/单位成本一致」证明两个字段同源（金额不是另一处汇总来的）。

**★ 造探针数据前先查科目/主数据的「隐性必输字段」，否则整批全红还查不出代码问题。**
会计凭证类探针尤其容易踩：**成本相关科目（成本要素 / `KTOKS` 为费用类）每一行都必须带成本对象**
（`KOSTL` / `AUFNR` / `PS_POSID` 之一），漏了 BAPI 会报
`Account xxx requires an account assignment relevant to cost accounting` —— 行数多时表现为「全部行失败」，
极易被误判成新逻辑的缺陷。本次 `ZTEST_ZFIB001_SPLITROW` 1000 行全红就是这个原因（补 `KOSTL='50F01000'` 即通过）。
同理，`RSTGR`（付款原因代码）由字段状态组决定是否必输 —— **科目/字段状态组要挑「必输项最少」的那一个**
（本次测试公司 5000 用 `8000000034`，字段状态组 `Z008`；比 `1001001000` 少一个 `RSTGR`）。

**★ 造数前先看底表主键 —— `INSERT` 撞键只回 `sy-subrc<>0`，不报错不转储。**
2026-09-24 `ZBPM_ISP011` 探针：`ZTFI0002` 主键 = `MANDT+BUKRS+ZFKDT+ZFKDH`，**不含业务键 `ZBPMLCH`**；
两个测试流程号复用同一 `ZFKDT+ZFKDH` ⇒ 第二个流程整行没进去 ⇒ 后续用例以「流程号不存在」的**假象**报 FAIL，
差点被当成接口缺陷。⇒ **造数循环里逐条判 `sy-subrc`，并在正式用例前加一条「造数行数自检」断言**
（期望几行就断几行），否则数据面缺失会一路伪装成逻辑缺陷。

**跑多张拆分的探针时，轧差中转科目必须在目标集团存在且过账得了。**
`ZFM_FII001_SPLIT` 的 `i_trans_hkont` 缺省是 `1999999999` —— 实测该科目**只在 client 300 / 科目表 `5000` 有**，
client 100 / 科目表 `INT` 查无（`SKA1` + `SKB1` 都空）。探针直接调函数时可以传 `i_trans_hkont` 绕开；
但测**批导程序**（它不传该入参）时就必须目标集团真有这个科目，否则每张都失败、`ET_DOC` 被清空。

### 8.1 ★ 无头运行返回 500：先用「短文本 → 运行时错误名」反查根因

`adt.js run` 遇到运行时错误会返回 **HTTP 500 + 一个 HTML 错误页**，此时**程序里所有 `WRITE` 输出全部丢失**
（拿不到任何中间进度），页面里只有一句短文本，例如：

```
Error in ABAP statement while processing an internal table. (Message 20260920150104gsdcs4dev01_DEV_00 ...)
```

**正确姿势（比二分法快得多）**：把这句短文本丢给 WebSearch，命中 `sapfixhub.com/dumps/...` 就能拿到运行时错误名与「Error analysis」原文。

| 短文本 | 运行时错误名 | 触发条件 |
|---|---|---|
| `Error in ABAP statement while processing an internal table` | **`TABLE_INVALID_INDEX`** | `MODIFY/INSERT/DELETE ... INDEX n` 的 **n ≤ 0**（或 `FROM/TO n` 越界）。**直接转储，不是 sy-subrc=4** |
| `Illegal component access in internal table operation` | `ITAB_ILL_COMPONENT` | `ASSIGN COMPONENT` 的字段名/序号在行结构里不存在 |
| `No more storage space available for extending an internal table` | `TSV_TNEW_PAGE_ALLOC_FAILED` | 无 `UP TO n ROWS` 的大结果集 |
| `Field symbol has not been assigned yet` | `GETWA_NOT_ASSIGNED` | 访问未赋值的字段符号 |

**别试图读这次转储**：ADT 的 ST22 列表（`adt.js dumps`）**不包含**由 `programrun` 无头接口产生的转储
（今天 15:01 的转储在 `dumps` 的 20 条里完全不见），按 dump id 直读 `/runtime/dump/<id>/formatted` 返回 **404**。
**所以只能靠短文本反查 + 二分法**：把可疑 FORM 调用整段注释掉再跑，先确认边界。

### 8.1.1 ⭐ 短文本**为空**时：用「$TMP E2E 副本」一刀切开「ALV 限制」与「真实转储」

带 ALV 的报表无头运行可能 500 —— 但**不是必然**（2026-10-12 更正，见 §2）：
只有「ALV 调用之前有 `WRITE`」的程序必炸 `Screen output without connection to user`；
干净的 ALV 报表会降级成清单输出并正常返回 200。
麻烦的是它和真实转储**长得一样**：`HTTP 500` + `Application Server Error` 页。区分标志：

| 页面短文本 | 含义 |
|---|---|
| 有文字（如 `工厂 1000 未在 T001K 维护公司代码…`） | 程序里的 `MESSAGE ... TYPE 'E'`，正常终止 |
| **空的** ` (Message 00  001)` | 转储 **或** ALV 渲染失败 —— **光看这里分不出来** |

判据（实测可靠）：**同一次运行里，如果之前的分支本该先报 `MESSAGE` 却没报，就说明程序已经走过了那个分支**。
本例 `ZFID003`：集团 100 跑出 `工厂 1000 未在 T001K 维护…`，而集团 300 的 `T001K` 同样没有工厂 1000
（`SELECT bwkey, bukrs FROM t001k` 只有 0001/0003/5000/5099）却回了**空短文本** —— 说明它在别处先炸了。此时必须坐实。

**做法（推荐，一次搞定）**：`scripts/work/gen_e2e_harness.js` —— 把生产源码整份复制成 `$TMP` 新程序，**只做三处外科手术**：

```bash
HARNESS_JSON=scripts/work/harness/ZFID003.json node scripts/work/gen_e2e_harness.js --push
SAP_ENV_FILE=/tmp/sap300.env SAP_CLIENT_OVERRIDE=300 node scripts/work/adt.js run ZTEST_ZFID003_E2E
```

1. 改 `REPORT` 程序名；2. 改选择屏幕默认值（默认工厂往往不是有测试数据的工厂）；3. 把最后那行
`PERFORM frm_show_alv.` 换成自动追加的 `frm_e2e_dump`（用 `WRITE` 打印取数/汇总/字段目录/布局结果，并**反向再跑一次另一条视图分支**）。
配置见 `scripts/work/harness/<PROG>.json`（`replace` 是字符串替换表，`dumpForm` 是追加的 FORM 源码）。

**结论判读**：`frm_e2e_dump` 能跑完 = `frm_init_period` → 取数 → 汇总 → `frm_build_fcat` → `frm_layout` **全程无转储**，
即「500 是 ALV 限制」成立；若它自己 500，就是真缺陷，且已缩小到那条链路。

**两个必须知道的坑**：

- **新建 $TMP 程序的推送顺序**：先把源码推上去（程序对象才存在），**否则推文本元素报
  `Resource REPT ZTEST_XXX does not exist`（primer GET 404）**。本系统实测 `$TMP` 程序即使文本符号还没建，
  源码激活也会回 `final version => active`；稳妥起见仍按「推源码 → 推文本元素 → 再推一次源码」三步走。
- `gen_e2e_harness.js` 会顺带把 `scripts/work/textelements/<原程序>.json` 复制成新程序名的 JSON
  （`teSource` 字段），不然 `TEXT-nnn` 引用在新程序里没有符号池。
- **原程序没有独立文本元素对象时**（`teSource` 留空，如 `ZFIB001`）：把 `TEXT-nnn` 引用在
  `replace` 里**内联成字面量**（`|{ TEXT-001 }-{ sy-datum }|` → `|E2E-{ sy-datum }|`），
  并在 `dumpForm` 里用 `WRITE` 直接输出。`gen_e2e_harness.js` 早期版本在 `teSource` 缺省时
  仍会 `TE_FILE=null` 调 `push_textelements.js` → **ENOENT 崩溃**（2026-09-22 已修：无文本元素时跳过该步）。
- **动态内表的程序也能做 harness**：把取数 FORM 整段替换成自建造数 FORM，
  `lvc_t_fcat` 手写列名 + `cl_alv_table_create=>create_dynamic_table` 建表，
  再用 `ASSIGN COMPONENT` 按列名填值。列名必须与接口结构字段名一致
  （程序用 `MOVE-CORRESPONDING <fs_data> TO ls_item` 取值）。
  实测 `ZFIB001`：`scripts/work/harness/ZFIB001.json` → `ZTEST_ZFIB001_E2E`。

### 8.2 ★ `SY-TABIX` 会被 `READ TABLE` 改写 —— 循环里记行号必须第一句就取

`LOOP AT itab ASSIGNING <fs>.` 之后，`SY-TABIX` **不是**只属于这个循环：

- `READ TABLE ... WITH KEY ...` → 命中时置为**该表内的行号**，**查不到时置 `0`**；
- `READ TABLE ... INDEX n` → 置为 `n`；
- `APPEND / INSERT` → 置为新行号。

于是「循环里先 `READ TABLE ... WITH KEY` 判重，循环末尾 `APPEND sy-tabix TO lt_del`，循环外 `DELETE itab INDEX ...`」
这套**很常见的写法会直接炸**：查不到 → 记入 `0` → `DELETE ... INDEX 0` → **`TABLE_INVALID_INDEX` 转储**；
即便命中，删掉的也是**被读表的下标**而非本行号，会静默剔错行。

```abap
" ❌ 会转储 + 剔错行
LOOP AT ct_alv ASSIGNING <fs_f>.
  READ TABLE lt_done TRANSPORTING NO FIELDS WITH KEY ...   " ← 这里改写 SY-TABIX
  IF sy-subrc = 0.  lv_keep = abap_false.  ENDIF.
  ...
  IF lv_keep = abap_false.  APPEND sy-tabix TO lt_del.  ENDIF.
ENDLOOP.

" ✅ 首句取行号，并给删除加一道防御
LOOP AT ct_alv ASSIGNING <fs_f>.
  lv_rowidx = sy-tabix.          " ← 必须是循环体第一条语句
  ...
  IF lv_keep = abap_false.  APPEND lv_rowidx TO lt_del.  ENDIF.
ENDLOOP.
SORT lt_del DESCENDING.
LOOP AT lt_del INTO lv_delidx.
  IF lv_delidx >= 1 AND lv_delidx <= lines( ct_alv ).   " ← 索引非法一律跳过，保证永不转储
    DELETE ct_alv INDEX lv_delidx.
  ENDIF.
ENDLOOP.
```

**实例（2026-09-20，ZFID001B `FRM_FILTER_BY_APPROVER`）**：F01 场景里 T003 无审批流 → ⓑ 的 `READ TABLE` 查不到
→ `sy-tabix = 0` → `DELETE ct_alv INDEX 0` → 转储。该 FORM 在审批界面首次取数时必经此路径，
**属必现缺陷**；已按上面范式修复。排查时 `grep -n sy-tabix <文件>` 全文点一遍，成本极低。

## 9. 测试报告骨架

`scripts/work/ZZTEST_ISP002_测试报告.md` 是范式，章节：元信息表 → 接口契约（签名/参数/凭证行规则）→ 测试主数据 → 用例与结果表 → 关键用例证据（凭证行明细 + 底表快照）→ 本轮定位并解决的问题（现象 / 排查过程 / 结论 / 处置）→ 遗留事项（责任方）→ 结论。

## 10. 生产订单 TECO / 状态操作：ABAP 侧手法

> BAPI 选型（`BAPI_PRODORD_COMPLETE_TECH` / `SETUSERSTATUS` / 无 TECO Reset 只能用 BDC）见 `sap-abap-bapi-usage` 分册 `40-PP-生产订单`。本节只讲报表里怎么组织状态判定与取数。

### 10.1 批量技术完成 → `BAPI_PRODORD_COMPLETE_TECH`

抬头级技术完成有专用 BAPI，不要用 `BAPI_ALM_ORDER_MAINTAIN` + `it_methods`。签名、判错与「没有技术完成日期入参」的绕法见 `sap-abap-bapi-usage` 分册 `40-PP-生产订单`。

### 10.2 取消技术完成 → **没有标准 BAPI**，只能 BDC 调 CO02

实测 `SELECT funcname FROM enlfdir WHERE funcname LIKE 'BAPI_PRODORD%'`：34 个函数里有 `COMPLETE_TECH`/`CLOSE`/`SETUSERSTATUS`/`REVOKEUSERSTATUS`/`SET_DELETION_FLAG`，**无任何 TECO Reset**。`IBAPI_ALM_ORDER_TECO_RESET` 是 `IBAPI_*` 内部函数（未公开接口），不要当正式方案。

BDC 关键手法（屏幕 `SAPLCOKO1`）：

```abap
DATA(opt) = VALUE ctu_params( dismode = 'N' updmode = 'S' ).

" ★ 必须先取屏幕原值 —— 否则 CO02 的必输字段被 BDC 数据清空而报错
SELECT SINGLE aufnr, gamng, gmein, gltrp, gstrp, terkz, fhori, aprio
  FROM afko INTO @DATA(ls_afko) WHERE aufnr = @lv_aufnr.

PERFORM bdc_dynpro USING 'SAPLCOKO1' '0110'.       " 初始屏
PERFORM bdc_field  USING 'BDC_OKCODE' '=ENTK'.     " ★ 取消 TECO 功能码
PERFORM bdc_field  USING 'CAUFVD-AUFNR' lv_aufnr.
PERFORM bdc_field  USING 'R62CLORD-FLG_OVIEW' 'X'. " 展开视图

PERFORM bdc_dynpro USING 'SAPLCOKO1' '0115'.       " 切"数量/日期"页
PERFORM bdc_field  USING 'BDC_OKCODE' '=TABR'.

PERFORM bdc_dynpro USING 'SAPLCOKO1' '0115'.       " 保存
PERFORM bdc_field  USING 'BDC_OKCODE' '=BU'.
PERFORM bdc_field  USING 'CAUFVD-GAMNG' ls_afko-gamng.
WRITE ls_afko-gltrp TO lv_date.                    " 日期先转字符再传
PERFORM bdc_field  USING 'CAUFVD-GLTRP' lv_date.

CALL TRANSACTION 'CO02' USING gt_bdcdata
      OPTIONS FROM opt MESSAGES INTO gt_messtab.
```

**取 BDC 返回消息必须用表工作区字段**：`gt_messtab-msgid / -msgnr / -msgv1..4`，**不能写 `sy-msgid`/`sy-msgno`/`sy-msgv*`** —— 后者在 `LOOP AT gt_messtab` 里不随行变化，会导致错误信息取错或取空（标准模板里常见残留）。`BDCMSGCOLL` 的字段是 `MSGID/MSGNR/MSGTYP/MSGV1..4`（注意是 `MSGNR` 不是 `MSGNO`）。

### 10.3 用户状态（财务关闭标识等）用 `BAPI_PRODORD_SETUSERSTATUS`

`SETUSERSTATUS` / `REVOKEUSERSTATUS` 是 PP 官方接口，`STATUS_CHANGE_EXTERN` 亦可（`user_status` 传状态码、`set_chgkz = 'X'`）。细节见 `sap-abap-bapi-usage` 分册 `40-PP-生产订单`。

### 10.4 状态判定的结构化写法（强烈推荐）

```abap
TYPES: BEGIN OF ty_statu_flag,
         i0001 TYPE flag,   "已创建
         i0045 TYPE flag,   "技术性完成
       END OF ty_statu_flag.

" 状态串 -> 标志位：组件名直接取 JEST-STAT 值
ASSIGN COMPONENT ls_jest-stat OF STRUCTURE gs_flag TO FIELD-SYMBOL(<fs_value>).
IF sy-subrc = 0.  <fs_value> = abap_true.  ENDIF.
```

之后所有业务条件都是可读布尔式，且集中一处：

```abap
IF ( ps_flag-i0001 = abap_true OR ps_flag-i0002 = abap_true )
   AND ps_flag-i0043 = abap_false AND ps_flag-i0076 = abap_false.
```

加新状态只加结构字段，不改判断逻辑。**比硬编码 `CASE lv_stat WHEN 'I0045' OR ...` 好维护得多。**

### 10.5 状态一次性取全，别逐单查

```abap
SELECT jest~objnr, jest~stat, tj02t~txt04, tj02t~txt30
  FROM jest
  JOIN tj02t ON jest~stat = tj02t~istat AND tj02t~spras = @sy-langu
  JOIN @lt_aufk AS a ON jest~objnr = a~objnr        "#EC CI_BUFFJOIN
 WHERE jest~inact = ''
  INTO TABLE @DATA(lt_jest).
SORT lt_jest BY objnr.
```

配合 `READ TABLE lt_jest TRANSPORTING NO FIELDS WITH KEY objnr = ... BINARY SEARCH`
+ `LOOP AT lt_jest INTO ... FROM sy-tabix` + `IF objnr <> ... EXIT.` 按订单切片遍历 —— 避免 N+1 查询。

### 10.6 其它配套手法

- `SET PARAMETER ID 'ANR' FIELD lv_aufnr.` + `CALL TRANSACTION 'CO03' AND SKIP FIRST SCREEN.` → 订单号跳 CO03（写在 `&IC1` 分支里）。
- `icon_led_green` / `icon_led_red` 放一个 `ID` 列，比文字标识更快看出执行结果。
- 执行/取消这类互斥动作，选择条件用 **`RADIOBUTTON GROUP`** 而非两个 `AS CHECKBOX`；配合
  `SET PF-STATUS 'X' EXCLUDING lt_extab`（用 `APPEND c_ucomm_xxx TO lt_extab`）**动态隐藏**另一个动作的功能码。
- `MESSAGE_TEXT_BUILD`（`msgid`/`msgnr`/`msgv1..4` → `message_text_output`）把 BAPI/BDC 消息统一转文本，比 `MESSAGE ID ... INTO` 稳。

## 11. 会计凭证过账 / 冲销：走项目封装接口，不要直接调 BAPI

选型结论与理由见 `sap-abap-bapi-usage` 分册 `30-FI-会计凭证`；本项目封装接口（`ZFM_FII001` / `ZFM_FII001_SPLIT` / `ZFM_FII003`）的完整签名、模拟导入、拆分规则、消息处理见 `sap-abap-project-ops` §4 接口范式。

## 12. 激活报错速查（都是实测踩出来的）

| 报错 | 根因 / 修法 |
|---|---|
| `The SELECT-OPTION name ("S_XXX") can be up to eight characters long.` | `SELECT-OPTIONS` / `PARAMETERS` 名**最长 8 字符**（含 `S_` 前缀）。`S_ZYHJYLS`→`S_YHJYLS`、`S_PAYBILL`→`S_PYBILL` |
| `Different number of parameters in FORM and PERFORM (routine: X, number of formal parameters: 8...)` | **FORM 形参不能内联写 `TYPE STANDARD TABLE OF x WITH DEFAULT KEY`**，会被拆成一堆伪形参。先 `TYPES: ty_x_tab TYPE STANDARD TABLE OF x WITH DEFAULT KEY.` 再 `USING pt_x TYPE ty_x_tab` |
| `"XXX" is not type-compatible with formal parameter "DOCUMENT"` | `cl_gui_frontend_services=>execute` 的 `DOCUMENT` 是 **STRING**；CHAR1000 的网址字段先转 `lv_url TYPE string`（`CALL_BROWSER` 的 `url` 是泛型 `TYPE C`，可直接传，两者别混） |
| `Field "C_BUS_ACT" is unknown.` 之类 | 常量删了但还有引用 —— 冲销的 `BAPI_ACC_DOCUMENT_REV_POST` 仍需要 `bus_act` |
| `Type "CHAR55" is unknown.` | **ABAP 声明里 `TYPE char<n>` 非法**（`char<n>` 只在 FORM 形参/DDIC 语境下才有意义）→ 定长字符一律写 `TYPE c LENGTH n`：`DATA lv_seg TYPE c LENGTH 55.` / `TYPES ... msgtx TYPE c LENGTH 220.`。一次推 155 行的探针栽在这上面，激活直接 `inactive`。 |
| `The data object "<FS_FCAT>" does not have a component called "COLTEXT"` | **ALV 列标题字段名写错族**：`COLTEXT` 是 **LVC**（`lvc_s_fcat`，配 `REUSE_ALV_GRID_DISPLAY_LVC`）才有的；**SLIS**（`slis_fieldcat_alv`，配 `REUSE_ALV_GRID_DISPLAY`）必须写 **`SELTEXT_L` / `SELTEXT_M` / `SELTEXT_S`**。两套**不可混用**（一次报 10 行＝10 个 `WHEN` 分支全废）。本项目 `ZFIR_0237`/`ZFID001A` 走的是 LVC 才用 `coltext`，照抄会踩。 |
| `"ZXXX" must be a flat structure. Internal tables, strings, references, and structures cannot be used as components.` + `Field "ZXXX-YYY" is unknown.` | **`TABLES zxxx.` 不能用于含 `STRING` 的表** → 声明屏改 `DATA gv_yyy TYPE zxxx-yyy.` + `SELECT-OPTIONS s_yyy FOR gv_yyy` / `PARAMETERS p_yyy TYPE zxxx-yyy`（`ZIFLOG_VIEW` 实例） |
| `The data type of the component "AAA" of "LT_X" is not compatible with the data type of "BBB"` | **部分列 `SELECT … INTO TABLE @lt_x` 按「位置」赋值**：`lt_x` 用了整行表类型却只 SELECT 少数列，值落进结构**前 N 个字段**。→ 要么 `SELECT *`（配整行类型），要么自建「列序 = SELECT 列序」的窄结构（§8 / §13.3）。**类型恰好兼容时还静默不报**，事后取值才发现。 |
| `"UP" is not allowed here. "." is expected.` | `UP TO n ROWS` **必须紧贴 `INTO TABLE @lt` 之后**，写在 `INTO` 前面即报此错 |

排错手法：只报一条消息时用 `SRC_NAME=ZXXX node scripts/work/act_dump_prog.js plain` 打原始
`chkl:messages`（带 `href="#start=行,列"`），**注意脚本读的是 `SRC_NAME` 环境变量，不是 `PROG`**，
传错会静默去激活默认的 ZFIR005。

## 13. 写【调用自定义接口 FM 的探针】时的两件事（2026-09-22 ZSAP_ISP001 实测）

### 13.1 ★ `CALL FUNCTION` 的段名与形参方向相反 —— 写错会 dump `CALL_FUNCTION_PARM_UNKNOWN`

**被调方的 EXPORTING 形参，必须写在调用方的 `IMPORTING` 段；被调方 IMPORTING 形参写在调用方 `EXPORTING` 段。**

```abap
" 被调方签名：EXPORTING VALUE(ES_RETURN) TYPE ZCIS_RETURN / TABLES IT_ITEM
" ❌ 报 CALL_FUNCTION_PARM_UNKNOWN：Function parameter "ES_RETURN" is unknown.
CALL FUNCTION 'ZSAP_ISP001' EXPORTING es_return = ls_ret TABLES it_item = lt_item.
" ✅
CALL FUNCTION 'ZSAP_ISP001' IMPORTING es_return = ls_ret TABLES it_item = lt_item.
```

写错时报的是**运行时错误**（HTTP 500 + `CALL_FUNCTION_PARM_UNKNOWN` / `CX_SY_DYN_CALL_PARAM_NOT_FOUND`），
短文本指向被调方的形参名，**极易误判成「FM 接口没生成」**。本轮为此在
`GetFunctionModule` / `ActivateFunctionModule` / `FUPARAREF` 上查了一圈（都是好的）。
**判据**：拿一个肯定能用的接口 FM（如 `ZBPM_ISP002`）用同样写法调一次 —— 若同样报错，就是你调用方写错了。

### 13.2 `UpdateTable` 改不了结构，要用 `UpdateStructure`

结构（`INTTAB`，E071 里也是 `R3TR TABL`）用 `UpdateTable` 会回
`Resource controller does not support method PUT`（tables 资源不收结构）。
改结构字段用 `UpdateStructure {structure_name, ddl_code, transport_request, activate}`，步骤
`lock→check_new_code→update→unlock→check_inactive→activate`，返回 `activated:true` 才算成功。
范式脚本：`scripts/work/upd_zsfii006_out_v11.js`（`GetStructure` 取 DDL → 锚点替换 → 回推 → `dd03l` 复核）。

**结构被 FM 引用时**：AF 激活 FM 会连带生效（`push_fm_source.js` 走完即可）；
`ActivateFunctionGroup` / `ActivateFunctionModule` 在对象已 active 时返回
`activated:false / generated:true`，**属正常**（"nothing to activate"），不代表失败。

### 13.3 探针回查底表：部分列 SELECT 必须自建窄结构（再犯一次）

`SELECT ktopl, saknr, xspea, ... FROM ska1 INTO TABLE @lt_ska1` 里 `lt_ska1` 若是
`STANDARD TABLE OF ska1`（整行），激活报
`The data type of the component "ERDAT" of "LT_SKA1" is not compatible with the data type of "MCOD1"`。
一律先 `TYPES: BEGIN OF ty_ska1, ... END OF ty_ska1.`（列序 = SELECT 列序）再 `INTO TABLE @lt_ty_ska1`。
