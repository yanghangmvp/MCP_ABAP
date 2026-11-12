---
name: sap-abap-project-ops
description: ABAP 项目作业总纲模板（可直接套用到新项目）。一份跑完整个 ERP 实施项目后沉淀下来的「项目级操作手册」骨架，覆盖：环境与集团切换（哪个集团是空壳、哪个有数据、怎么切）、scripts 速查命令、ADT 写入六铁律（proxy:false、CORR_NR 传父请求号、可传输对象不带 SAP_CLIENT_OVERRIDE、HTTP 200 ≠ 激活成功、lock→PUT→unlock→activate 不可颠倒、异常只印 e.message）、项目硬性约定（强制中文、瘦函数体+FORM、文案走文本元素、交付四步、建表唯一路径、生产源码注释口径）、出向/入向接口范式（属性表取 URL、name_mappings、compress 传空、网关 HTTP Basic、键级对账）、项目封装接口（会计凭证过账/冲销/拆分）的调用口径、高频坑索引、主要生产对象清单、交付脚本约定。用法：复制本文件到新项目和/或技能目录，把「示例客户 / DEV / 100 / 300 / DEVK9xxxxx / ZXXX」这类占位逐个替换成本项目实际值，跑完一次就成型。当要为新 SAP 项目建立作业总纲、或需要回忆环境·集团·命令·项目约定、或排查「激活失败 / 对象被锁 / 接口报错 / 数据为空」时加载本技能。
agent_created: true
---

# ABAP 项目作业总纲（模板）

适用工作区：`~/ABAP-AI`（示例路径，按项目实际填）。

> **这是模板，不是某家公司的文档。** 下文出现的 `示例客户`、`DEV`、`DEV-B`、`DEVK9xxxxx`、`sapdev.example.com`、`devuser`、`ZXXX` 等均为占位符，套用到新项目时整体替换即可。
> 保留的是**结构与判据**：哪些东西必须开工前摸清、哪些顺序不可颠倒、哪些坑必踩、哪些话必须先问用户。


对象级实现细节 → 工作区 `.workbuddy/memory/档案_系统对象.md`；细分手法 → 文末第 9 节列出的专项技能。

---

## 0. 环境与集团

| 环境 | 地址 / 配置文件 | 集团 | 备注 |
|---|---|---|---|
| DEV | `https://sapdev.example.com:44300`，`env/dev.env` | 100 | 用户 devuser。**空壳集团** |
| DEV | 同上 + `SAP_CLIENT_OVERRIDE=300` | 300 | **真实数据都在这** |
| DEV-B | `env/dev2.env` | 200 | MCP `adt-dev2` |

- ★ **100 是空壳**：`BKPF / BSEG / EKKO / EKPO / RSEG / RBKP / ZTFI0002` 全 0 行。
- ★ **300 有完整数据**：BKPF 793 / BSEG 17783 / RSEG 1050 / ANLA 330。
  ⇒ **凡查真实数据，一律 `SAP_CLIENT_OVERRIDE=300` + `$TMP` 探针**。
- 100 的 `ZGSP_PPS` 整表空（接口地址表），新接口地址全部需要另维护。

---

## 1. 速查命令

```bash
# 查询 / 建对象走 MCP 工具通道；以下为工作区脚本
SAP_ENV_FILE=$PWD/env/dev.env node scripts/work/prep_object.js PROG ZFIR_0237   # ★改前一次性预取
SAP_ENV_FILE=$PWD/env/dev.env node scripts/work/adt.js query "<sql>" [rows]   # 亦可 table/run/dumps
SAP_CLIENT_OVERRIDE=300 SAP_LANGUAGE_OVERRIDE=zh node scripts/work/adt.js <cmd|run PROG>
CORR_NR=<父请求号> PKG=ZFICO SRC_FILE=/abs/x.abap node scripts/work/push_prog_source.js
SAP_CLIENT_OVERRIDE=300 SRC_FILE=/abs/x.abap PKG='$TMP' node scripts/work/push_prog_source.js  # $TMP 探针
SRC_FILE=/abs/x.abap TARGET_GROUP=ZFG_x TARGET_FM=Zx_y CORR_NR=<父请求号> node scripts/work/push_fm_source.js
TE_FILE=...json CORR_NR=... node scripts/work/push_textelements.js
node scripts/work/get_source.js <PROG|INCL|FM|CLAS|TABL|STRU|DTEL> <名> [GROUP] --out=/tmp/x
node scripts/call-adt-tool.js <Tool> @args.json   # 含中文参数一律 @文件
node scripts/work/check_activation.js             # 未激活对象清单
PROGS=A,B node scripts/work/delete_prog.js        # 删程序
OBJ=ZXXX OBJ_TYPE=PROG/P OBJ_URI=/sap/bc/adt/... node scripts/work/_act_dbg.js  # 完整激活报文
```

---

## 2. 六铁律（ADT 写入）

1. 一律 `proxy: false`（本机代理会让写请求 socket hang up / 报 CSRF 失败）。
2. 可传输对象 `CORR_NR` 传**父请求号**（`DEVK900006`=请求、`DEVK900007`=任务；E071 记在任务下属正常）。
3. 改可传输对象**不带** `SAP_CLIENT_OVERRIDE`（该变量仅用于 300 的 `$TMP` 探针）。
4. **HTTP 200 ≠ 激活成功** —— 必须看返回里 `final version => active`。
5. lock → PUT → unlock → activate，顺序不可颠倒。
6. 异常只印 `e.message`。

**配套判定手法**

- 激活报错被截断（只印 `<shortText>`）⇒ 用 `_act_dbg.js` 拿完整 XML，`href="...#start=行,列"` 直接给坐标。
- `check_activation.js` 把 `FUGR/F`、`FUGR/I SAPLxxx` 误列 inactive ⇒ 以 `ActivateObjects` + `ENLFDIR.ACTIVE='X'` 为准。
- **403 一律被 MCP 翻成 locked / CSRF 失败，别信**（真锁的报文是「使用者 xxx 当前编辑 yyy」）。
- ★ **两句 403 要分清**（2026-11-02 踩过，白绕一圈）：
  - `User DEVUSER is currently editing ZFIDxxx` ＝ 用户 SE80 真开着那个对象，等他关。
  - `Object R3TR PROG ZFIDxxx locked in task DEVK90011x (DEVUSER) not specified for this client`
    ＝ **集团不对**，跟"谁在编辑"无关。换 `corrNr`（父请求/任务号/不传）三种都没用，
    唯一解法是换回**请求所属集团**再推（实测同一程序 100 下 LOCK 立刻 200）。
- 推可传输对象前先定集团：`env/dev.env` 的 `SAP_CLIENT=100` 就是请求所属集团，
  脚本默认值即正确 —— **不要习惯性加 `SAP_CLIENT_OVERRIDE=300`**，那个只给 300 的 `$TMP` 探针/查数据用。
- 源码、GUI 状态（`D010S/D010L/D010INC` 无 `MANDT`）、**文本池（`TEXTPOOL` 只有 `ID/KEY/ENTRY`，无 `MANDT`）**
  三者**都跨集团**，在请求所属集团（100）改一次，两个集团都生效。
  ⇒ 300 下推文本元素报「没有为此客户端指定在任务 xxx 中锁定的对象 LIMU REPT」，直接忽略，不是问题。
- 改多程序同一功能时，**先各自确认基线差异**再动手：`ty_alv` 有没有那个字段、field catalog
  有没有那一列、有没有可复用的 F4/弹窗辅助 FORM。别假设兄弟程序结构一致（实例：ZFID001C 有
  `FRM_F4_VAL_TAB`、ZFID001D 没有，得先补建才能复用）。

---

## 3. 项目硬性约定（15 条）

1. 语言强制 **ZH**（含 DDIC 主语言）。
2. 接口一律「**瘦函数体 + FORM**」。
3. S/4 新语法优先，**SELECT 列表逗号分隔**。
4. 写 SAP 前先查锁、先 backup；凭据不外传不回显。
5. 产出位置：报告 → `测试报告/`，测试源码 → `scripts/work/`，
   **交付源码归档 `FICO/<程序名>_<中文描述>.abap`**；`$TMP` 对象不传输。
6. **文案一律走文本元素**；`MESSAGE TEXT-xxx TYPE 'S' WITH n.` 不合法 ⇒ 用辅助 FORM（范式 `frm_msg_count`）。
   接口返回的消息可直接写中文字面量。
7. 按钮分支不用 CONSTANTS，`CASE pv_ucomm.` 写 `WHEN 'ZCLAIM'.` 字面量。
8. **交付四步**：生成 → 推源码 → 推文本元素（PROG/PX 必须单独激活）→ `gen_cua.js` 生成 GUI 状态。包一律 `ZFICO`。
   ★ 第 3 步**改既有程序时**必须先 `read_textelements.js` 回读现网文本元素并与本地 JSON 合并
   （见 §3 第 14 条），否则会覆盖用户前台改过的文本。
9. **建表唯一路径**：`CreateTable`（建空壳，自带 DD09L）→ `UpdateTable`（完整 DDL + activate）。
   半途建的表壳激活会报 *维护和保存 X 的技术设置* ⇒ **删表重建**；技术设置对齐同族 `APPL0 / size 0 / 不缓冲`。
10. **程序名可 ≠ 事务码**（`ZFIR_0237` / TCODE `ZFI237`）：TCODE 无 ADT 资源 ⇒ `$TMP` 调 `RPY_TRANSACTION_INSERT`
    （`transaction_type = ststc_c_type_report`、`language='1'`、`transport_number` 传**任务号**——与 ADT 传父请求相反）；
    删除用 `RPY_TRANSACTION_DELETE`（TADIR 留 `DELFLAG=X` 属正常，以 `TSTC` 为准）。
11. ★★ **生产源码注释口径（用户硬要求，2026-10-09 起）**：只保留
    「汉得标准程序头 + 摘要/注意 + 变更记录 + FORM 三行横幅 + `-->`/`<--` 形参文档 + `*&---xxx-BEGIN/END` 标记 + 短行代码注释」；
    **不写**设计依据／口径／联调实测／坑位／TODO 理由；
    **绝不把 `scripts/work/*.js`、`ZTEST_*` 写进源码**。
    剥离后必做 diff：**代码本体逐行零改动**。
12. ★★ **动手前先读 `开发模板/` 模版（2026-10-12 用户两次纠错换来）**：
    `ABAP_报表程序开发模板.abap`（报表）/ `ABAP_批导程序开发模板.abap`（批导）/
    `ABAP_报表程序开发模板_文本元素.csv`（文本编号口径：`001/002` 标题、`003` 未查询到数据、`T01+` 列标题）；
    再找**同类型正在跑**的程序当实现范式（报表看 `FICO/ZFIR_0237`）。**硬指标**：程序头八字段 + 摘要/注意/变更记录；
    事件五段；`END-OF-SELECTION` 按 `sy-batch` 分流；FORM 用模版命名；**ALV 一律 LVC 不用 SLIS**；
    建表字段**一律挂数据元素**。自检清单见技能 `sap-abap-prog-push-run` §1.0。
13. ★★ **命名先报，请求号不自己造（2026-10-22 用户定，越线即返工）**：
    - **绝不自行创建请求号**：不建 request / task、不调任何 `create_transport` 类接口、不臆测 `DEVK9xxxxx`。
      推可传输对象前若缺 `CORR_NR` ⇒ **停手报告还差请求号，由用户自己输入**；
      已给出的号按原号用（请求/任务层级仍遵 §2 第 2 条）。
    - **新建 TADIR 对象（程序 / 事务码 / 表 / 结构 / FM 等）命名先给方案**：
      取名一律按 **`开发模板/ABAP对象命名规范.md`**（模板目录；含各类对象形态、长度红线、
      编号台账「下一个可用号」、TADIR 查重手法与禁用清单）；
      方案写清 `对象类型 + 建议名 + 同前缀已占用清单（TADIR 查重，LIKE 带 ESCAPE '#'）+ 编号延续理由`，等用户点头再建；
      他不表态就**不建**。沿用既有规律可以，但**编号落点归他定**。
    - 违反后的返工代价高（建错名要删对象 + 清 `TADIR` + 重挂请求），所以先说后做。
    - ★ **例外（2026-10-23 用户定）：已挂请求号的既有对象，后续改动一律复用原请求号，不再询问。**
      例：`ZFIR_0237` → 父请求 `DEVK900006`（任务 `DEVK900007`）。缺号仍停手，不臆测。
14. ★★ **改程序必先回读现网**（2026-10-23 用户定，与 §8 首条同源、升级为硬约定）：
    凡调整**已存在**对象的程序 / FM / 类，**第一步 `get_source` 取系统最新代码**，以现网为唯一基线；
    本地 `FICO/` 等归档只作比对，不作基线。回读后必做 diff，改完反向覆盖归档。
    **禁止凭记忆或凭归档直接打补丁** —— 用户常在 SE80 直改生产对象且不回写归档
    （实例：`ZFIR_0237` 现网比归档多 2 处改动）。
    ★★ **文本元素也必须回读（2026-11-11 用户纠错，已造成真实覆盖事故）**：
    `get_source` **只取源码，不含 TEXTPOOL**。对已存在程序做覆盖式推送前，必须
    `SAP_ENV_FILE=$PWD/env/dev.env node scripts/work/read_textelements.js <PROG> symbols`
    与 `... <PROG> selections` 各跑一次，取**激活版**全文存 `backup/<PROG>_textelements_<日期>.json`，
    与 `scripts/work/textelements/<PROG>.json` 逐行 diff 后**人工合并**，再 `push_textelements.js`。
    **严禁拿陈旧 JSON 直接推文本元素** —— 用户在 SE38「转到 → 文本元素」前台改的内容会被无痕冲掉，
    代码 diff 完全看不出来，事后只能靠他回忆。凡交付四步中的第 3 步（推文本元素）执行前，本条为强制前置。
15. ★★ **测试／探针对象测完即删（2026-11-05 用户定，取代 2026-09-14 旧口径「放 $TMP 不传输不删除」）**：
    客户不需要、也不应看到测试程序。**每轮联调／验证结束，本轮新建的 `$TMP` 测试程序、探针、
    临时类／表一律从系统删掉**，不留 `TADIR` 残留；不得把测试对象挂进 `ZFICO` 等交付包或写进传输请求。
    - 顺序：**先 `get_source` 回读源码留档到 `backup/`（删除不可逆）→ 再删 → 再回查 `TADIR`/`TRDIR` 确认清零**。
    - 删除命令：`PROGS=A,B node scripts/work/delete_prog.js`（`$TMP` 本地对象**不需要请求号**，
      绝不为此新建请求号；脚本自带 LOCK→DELETE，删除后不用 UNLOCK）。
    - **只删本轮自己建的**；他人创建的（`DEVUSER2`／`200001` 等）、已挂包／请求的对象、
      以及仍在用的 DEMO／工作台（如 `ZDEMO_WORKBENCH`）一律不动，需要清理先给清单等用户确认。
    - 生产源码里不得出现 `ZTEST_*` 引用（与 §3 第 11 条同源）。
    - 现存历史遗留清单与归属见 `.workbuddy/memory/2026-11-05.md`。

---

## 4. 接口范式

### 出向 `*ISC*` / 入向 `*ISP*`

- 出向签名：`IMPORTING VALUE(is_data) TYPE <结构> OPTIONAL` + `EXPORTING VALUE(es_return) TYPE zcis_return`（+ `es_data`）；
  报文最外层即数组时入参写成行表（TTYP）。入向同构，入参 `is_input` / `is_head`。
- URL 取 `zgsp_cl_abap_properties=>get_property( '<接口名>' )`（表 `ZGSP_PPS`，按集团维护）。
- 序列化 `/ui2/cl_json=>serialize` → `cl_http_client=>create_by_url` + `set_cdata` POST → `deserialize`。
- 日志 `INCLUDE zgsp_1c_rfc_logger`（★ 写在 FUNCTION 体内）。
- ★ **出向接口报文日志（2026-10-12 定稿）**：真实报文另落自建表 `ZIFLOG`
  （`zcl_if_log=>save( is_log = ls_log )`，独立提交）；表 `ziflog` 七业务字段：
  `funcname/iftype('O'出向)/url/reqbody/reshttp/resbody/msgty/msgtx`。
  **平台快照 MEMO 不回挂日志号**（用户口径「接口平台不需要管 MEMO」⇒ MEMO 保持原字面量），
  日志定位靠 `FUNCNAME + CRDAT/CRTIM`；查询走 TCODE `ZIFLOG`（报表 `ZIFLOG_VIEW`）。
  `MSGTY` 只标**传输层**（连不上/发不出/收不到才 `'E'`；HTTP 403 属"收到响应"⇒ 空）。
  实施样例：`ZCBS_ISC001~006`（补丁脚本 `scripts/work/patch_cbs_isc_iflog_*.py`）。

### 报文与网关

- **网关（IPAAS）需 HTTP Basic**：`ZGSP_PPS-USERNAME/PASSWORD` + `lo_client->authenticate( )`。
  不带凭据会回 200 + `msg=token已失效...` 且**没有 `code` 键** ⇒ 遇「无 code」把原文带回 `MSGTX`。
- **金额用 `DEC` 不用 `STRING`**；**`compress` 必须传空**（置 `'X'` 会丢空值字段）；CURR/QUAN 用 `DEC:l,d`。
- **JSON 键名靠 `name_mappings`**：serialize 查 `abap` 键、deserialize 查 `json` 键 ⇒ **请求/返回各备一张表**。
  ① `pretty_name='X'` 按每层独立推导 ⇒ 嵌套层**绝不能加层级前缀**；
  ② 唯一键表，同键重复登记抛 *A row already exists with this key*；③ 只登记推导不出来的键。
  **DDIC 组件名 30 字符静默截断**。→ 细节见技能 `sap-json-interface-mapping`。
- ★ **返回结构必做「键级对账」**（FS 样例逐键核）；只靠探针跑通会漏掉**值恰为空**的字段。
- ★ `ES_RETURN-RVAR*` 语义每个接口都不同。**成功判定别只看 `code`**（失败时也可能是 `'0'`）。

### DDIC 与 FM

- **DDIC 三交叉**：`CheckStructure` 报 *从数据库导入对象 X 时出错* 只说明 ADT 资源读不出 ⇒
  以「激活返回 + 上层结构检查 + 探针运行」交叉为准。改结构行字段后引用它的 TTYP 会失效 ⇒ `ActivateObjects` 复活。
  `UpdateStructure` 对不存在的对象报 403（被翻成 CSRF 失败）⇒ 新对象必须 `CreateStructure`。
  `CreateTableType` 用 **`row_type_name`**；`DeleteTableType` 带 `transport_request`。
  字段一律 `data_type:"STRING"`；嵌套用 `structure_ref`、明细用 `table_ref`；建后核 `TADIR.MASTERLANG=1`。
  → 细节见技能 `sap-ddic-object-ops`。
- **新建 FM 默认不远程使能** ⇒ ADT 属性资源 PUT（媒体类型
  **`application/vnd.sap.adt.functions.fmodules.v3+xml`**，用 `application/xml` 返 406）改 `processingType`→`"rfc"`。
  ★ PUT 的 URL **必须同时带 `corrNr`**：只带 `lockHandle` 会返 500 /「已在用户 xxx 请求中锁定」——那是缺 `corrNr`，**不是真锁**。
  脚本 `set_fm_rfc.js`。

### 查询类 `*ISP*` 与嵌套结果集

- ★ 查询类 `*ISP*` **只出 `es_return` + 结果集**（**不返回** FS「Tables」段的 `ET_RETURN`）。
- 结果集做**嵌套**「行含在抬头里」（参照 `ZBPM_ISP005`）。
- ★ 嵌套子结构**不放父键** ⇒ `APPEND INITIAL LINE TO <fs_head>-item ASSIGNING <fs_item>` 就地嵌入；
  跨结构落库用 `MOVE-CORRESPONDING` 中转。

### 会计凭证过账走 `ZFM_FII001`、冲销走 `ZFM_FII003`，不要再直接调 BAPI

FICO 付款平台（ZFID001A/B/C/D）与 `ZBPM_ISP003 / ZFM_FII002` 过账全部走**项目封装接口 `ZFM_FII001`**；
冲销走 **`ZFM_FII003`**（2026-09-20 起）。写新程序时**先确认当前口径**
（同事在改其他程序时可能刚切过去），别照抄老程序的 BAPI 写法。

```abap
DATA: ls_req  TYPE zsfii001_req,
      ls_head TYPE zsfii001_head_in,
      ls_item TYPE zsfii001_item_in,
      lt_item TYPE zttfii001_item_in,
      ls_resp TYPE zsrest_out.
" HEAD: bukrs/blart/bldat(凭证日期)/budat(过账日期)/monat/usnam/xblnr/waers/bktxt
"       STATUS 留空 = 直接过账；置 '2' = 走预制凭证
" ITEM: buzei/bschl/hkont/kunnr/lifnr/umskz/kostl/aufnr/vbel2/zfbdt/wrbtr/sgtxt/zuonr/rstgr
ls_req-req-head = ls_head.
ls_req-req-item = lt_item.
CALL FUNCTION 'ZFM_FII001'
  EXPORTING i_req  = ls_req
  IMPORTING o_resp = ls_resp.
" ★ 判定：ls_resp-msgty = 'S' **且** ls_resp-sapnum 非空才算过账成功；
"   sapnum 就是会计凭证号。接口内部自己 COMMIT / ROLLBACK 并拼好 msgtx。
```

**★ 模拟导入：`i_testrun = 'X'`（2026-09-22 新增，`ZFIB001` 用）**

```abap
CALL FUNCTION 'ZFM_FII001'
  EXPORTING i_req     = ls_req
            i_testrun = 'X'        " 只校验、不落库
  IMPORTING o_resp    = ls_resp.
```

- 非票据路径改调 **`BAPI_ACC_DOCUMENT_CHECK`**（与 POST 参数结构完全兼容，仅少 `obj_key` 出参，
  所以字段组装 / `EXTENSION2` 增强逻辑全复用），**不 COMMIT 也不 ROLLBACK**；
  通过时 `msgtx = ZFI_MSG-017「模拟通过，未生成会计凭证」`、`sapnum` 留空。
- **票据（汇票）行**（`UMSKZ = W/X/Y` → `lv_bdc='X'`）本来是绕 BAPI 走 BDC 的，
  而 `POSTING_INTERFACE_START` 的 `I_UPDATE` 值域实测只有 **`S/A/L`**
  （源码 `IF UPDATE CN 'SAL' → UPDATE_INVALID`）—— **没有"不更新数据库"档位**，
  故模拟时**直接回 `E` + `ZFI_MSG-018`，不伪造成功**。
- 参数可选，老调用方（`ZBPM_ISP002` 等）不传即维持原行为。
- **不要在调用方"跑完再 `ROLLBACK`"** —— 接口内部自己 `BAPI_TRANSACTION_COMMIT`，外层回滚无效。
- **模拟结果不能标成"已处理"**：若调用方用图标驱动"待处理行"判定（`ZFIB001` 的
  `frm_before_import` 判据是 `lv_id <> icon_led_green`），模拟必须回**黄灯 `icon_led_yellow`**、
  绿灯只留给"已落库"。否则用户「先模拟、再正式导入」时正式导入命中 0 行
  —— 与 `ZFIB003` 缺陷 D-07 同一类，已验证过两次。
- 落地实例：`ZFIB001` 的 `ZTEST`（模拟）/`ZLOAD`（正式）按钮，
  测试报告 `测试报告/ZFIB001_会计凭证批导_模拟导入_测试报告_20260922.md`。

**★ 模拟模式验证「拆分创建」`ZFM_FII001_SPLIT`（2026-09-22 交付，同函数组 `ZFG_FI001`）**

`BSEG-BUZEI` 是 `NUMC(3)`，单张 FI 凭证 999 行是**物理上限**（S/4HANA 2023 也一样），
`ZFM_FII001_SPLIT` 把 >999 行拆成多张：入参 `i_req / i_testrun / i_trans_hkont`，
出参 `o_resp / et_doc(ZTTFII001_SPLIT)`；≤999 行直接委托 `ZFM_FII001`。

```abap
CALL FUNCTION 'ZFM_FII001_SPLIT'
  EXPORTING i_req = ls_req  i_testrun = 'X'  i_trans_hkont = '2202999900'
  IMPORTING o_resp = ls_resp  et_doc = lt_doc.   " et_doc 每张：ITEM_FROM/TO/CNT/DIFF_AMT/DIFF_BSCHL
```

- **每张最多 998 行明细 + 1 行轧差行 = 999**；片内 `BUZEI` 重新编号。
- 汇总按 **`TBSL-SHKZG='H'` 取负**（不要硬编码 `50/31/11/39/19` 列表）；
  **Σ>0 → 轧差行贷方 `50`，Σ<0 → 借方 `40`**；金额 `= -Σ`（BAPI 符号：借正贷负）。
- **切片阈值取 998，不是「剩余 > 999」**：1997 行按后者会产出 1000 行的张（BUZEI 溢出）。
  边界用例必测 **1997**（→998+998+1）、1000（→998+2）、1998（→998+998+2）。
- **切片上限必须按场景区分**：拆分场景 `998`（给轧差行留一行），**不拆分（≤999 行）场景 `999`**。
  曾因无条件按 998 截断，把 **999 行**的单据切成 998+1 两张 —— 第 2 张只有单边 1 行且无轧差行，
  报 `Accounting Interface: Balance in transaction currency`。**边界用例必须包含 999 与 1997**。
- **`i_trans_hkont` 必须是资产负债类（非成本相关）科目**，否则轧差行缺成本对象，报
  `Account xxx requires an account assignment relevant to cost accounting`。
- 断言集：张数 = `(行数+997) DIV 998`、每张明细 ≤998、ΣDIFF_AMT = 0、末张覆盖到末行、方向与符号一致。

**★ 探针必带「基线对照」（本次靠它切开 2 次环境误判）**

同一抬头/科目/期间，先调**原始** `ZFM_FII001` 跑 5 行：

- 基线返回 `S` ⇒ 环境正常，新逻辑的失败才算缺陷；
- 基线同样报错 ⇒ 问题在抬头/科目/期间/字段状态组，**别改新代码**。

FI 侧最常见的两类环境坑（报错文本有误导性）：
科目字段状态组要求 `RSTGR` 付款原因代码（`Field Reason Cde is a required field for G/L account …`，
该字段只经 `ZSFI_BSEG` 扩展给 BADI，标准检查阶段看不到）；
成本要素/P&L 科目必须有成本对象。挑测试科目时优先字段状态组宽松的（公司 5000 下资产/负债类多为 `Z001`）。

**★ `MESSAGE ... WITH` 对整条文本有长度上限（实测约 70 字符）——长错误会被静默截断**

症状：只能看到 `Field Reas...` 这种半截串，后半段凭空消失。**不要用 `WITH` 传长文本**：

```abap
MESSAGE e022(zfi_msg) INTO o_resp-msgtx WITH lv_seq space.   " 只用它拼短前缀
IF lv_msg IS NOT INITIAL.
  o_resp-msgtx = |{ o_resp-msgtx }{ lv_msg }|.              " BAPI 原文手工接上（≤220 字符）
ENDIF.
```

另：`WRITE` 列表输出也会截行，诊断时按 `msgtx+0(55) / +55(55) / +110(55) / +165(55)` 分段打印。

**★ 与「直接调 BAPI」的差别（照抄必错）**

- `ZFM_FII001` **按 BSCHL 查 TBSL 反推借贷方向**（内部 `ls_item-shkzg = ls_tbsl-shkzg`），
  **金额一律传正数**。记账码必须给对 —— 给错或给了 TBSL 里没有的码，接口回报「记账码不存在」类错误（zfi_msg 002）。
- 行项目号字段是 `ZSFII001_ITEM_IN-BUZEI`（NUMC 3），**不是** BAPI 的 `ITEMNO_ACC`。
- **`BAPIACGL09` 没有 `RSTGR` 字段**；原因代码填 `ZSFII001_ITEM_IN-RSTGR`，接口自动走
  `EXTENSION2` + 扩展结构 `ZSFI_BSEG` 传入。
- **★ 冲销也走项目封装接口 `ZFM_FII003`**（2026-09-20 起；`BAPI_ACC_DOCUMENT_REV_POST` 写法已废弃）：

```abap
DATA: ls_req  TYPE zsfii003_req,
      ls_resp TYPE zsrest_out.
ls_req-req-bukrs = <bukrs>.  ls_req-req-belnr = <belnr>.   " 前导零可有可无
ls_req-req-gjahr = <gjahr>.  ls_req-req-stgrd = <冲销原因>.
ls_req-req-budat = <冲销日期>.
CALL FUNCTION 'ZFM_FII003' EXPORTING i_req = ls_req IMPORTING o_resp = ls_resp.
" ★ 判成败只能看 MSGTY='S'（成功时 MSGTX 也非空！）；ls_resp-sapnum = 冲销凭证号
" ★ 内部经 CALL TRANSACTION 'FB08' 的 BDC 自行提交，调用方不要再 BAPI_TRANSACTION_COMMIT
```

  要点：入参**只有 `I_REQ-REQ` 一个子结构**（`ZSFII003_REQ` 顶层的同名字段不被读取）；
  内部已做「原凭证未冲销(`BKPF-XREVERSAL=''`)」与「来源 RMRP/VBRK 拒冲」校验，调用方不必重复。
  **易踩**：`ZSREST_OUT-MSGTX` 成功时非空 —— 老程序里「MSGTX 非空 = 失败」的判据必须改成
  `IF ls_ret-msgty <> 'S'.`（ZFID001C/D 已改）。详见 `FS文档/ZFM_FII003_冲销接口说明_20260920.md`。
  旧写法（需 `FI_REFERENCE_CREATE` 拼 `REVERSAL-OBJ_KEY_R`、BAPI 的 `OBJ_KEY` 由过账后回填）仅作历史参考。

#### `ZFM_FII001_SPLIT`：一张逻辑凭证拆成多张后，怎么把「哪一行落在哪一张」传回调用方

`ZFM_FII001_SPLIT` 的 `ET_DOC`（`ZTTFII001_SPLIT`）每张返回
`SEQ / BUKRS / BELNR / GJAHR / ITEM_FROM / ITEM_TO / ITEM_CNT / DIFF_AMT / DIFF_BSCHL / HKONT`。

**关键结论：按行归属要用「组内行序」，不要用 `ITEM_FROM/ITEM_TO`。**

原因：`ITEM_FROM/ITEM_TO` 是**入参行的 `BUZEI`**，而批导模板里的 `BUZEI` **允许留空或重复**
（探针把 1000 行全填 `001` 也照样能预览正确归属）。`ZSFII001_ITEM_IN-BUZEI` 实测是 `POSNR_ACC`(NUMC10)、
装得下 1~1080，**不是** `NUMC3`；但既然来源不保证唯一，就不能拿它当匹配键。

正确做法（`ZFIB001` 2026-09-23 实践）：

```abap
"调用后：用 ITEM_CNT 依次累加，换算成「组内第几行」的区间
lv_maxseq = lines( lt_doc ).
CLEAR lv_idx.
LOOP AT lt_doc INTO ls_doc.
  CLEAR gs_split.
  gs_split-number = lv_number.          "排序号（逻辑凭证）
  gs_split-seq    = ls_doc-seq.
  gs_split-maxseq = lv_maxseq.
  gs_split-belnr  = ls_doc-belnr.
  IF ls_doc-item_cnt IS NOT INITIAL.
    CLEAR lv_take.
    lv_take           = ls_doc-item_cnt.
    gs_split-idx_from = lv_idx + 1.     "★ 组内第几行，从 1 起
    gs_split-idx_to   = lv_idx + lv_take.
    lv_idx            = gs_split-idx_to.
  ENDIF.
  APPEND gs_split TO gt_split.
ENDLOOP.
```

回写侧要求**入参顺序 = 行序**：建 `ls_req-req-item` 时的 `APPEND` 顺序，与回写 ALV 时遍历
`<ft_data>` 的顺序必须用**同一套过滤条件**（同一 `READ TABLE gt_temp ... CONTINUE`），否则序号错位。

四个必踩的细节：

1. **`TY_SPLIT-SEQ/MAXSEQ` 用 `TYPE i`**，不要用 `NUMC3` —— 否则字符串模板拼出「本行第 001/002 张」。
2. **只在该逻辑凭证 `MAXSEQ > 1` 时追加标注**，未拆分的不要动消息列，否则改变既有行为（要做回归断言守住）。
3. **缓存表必须随 `GT_TEMP` 一起在「导入前检查」里 `CLEAR`**，否则重复点按钮会累积旧区间。
4. 模拟模式（`i_testrun='X'`）下 `ET_DOC-BELNR` 为空，消息渲染成「…（本行第 1/2 张，未生成凭证号）」。

**落表位置取决在模板有没有列**：`ZFIB001` 上传模板固定 18 列
（`CHECK/ID/MSG/NUMBER/BUKRS/BLART/BLDAT/BUDAT/MONAT/WAERS/BKTXT/BUZEI/BSCHL/HKONT/WRBTR/KOSTL/LIFNR/MEINS`），
**没有 `BELNR` 列** → 只能写 `MSG`。若以后要独立列，程序里 `PERFORM frm_convent_data_in USING 'BELNR' ...`
在列不存在时 `ASSIGN COMPONENT` 失败会静默忽略，可以预先埋着。

**验证方式**：把探针的 1000 行明细分两段（如 1~998 借、999~1000 贷），
断言「行 1~998 命中第 1/2 张、行 999~1000 命中第 2/2 张、错位 0」；
并且**故意把全部行的 `BUZEI` 都写成 `001`** —— 这样断言通过就等于证明走的是行序而非 `BUZEI`。

### 11.2 ⭐ 用户报「拆分后第 001 张不平」时的排查套路（2026-09-23 实战，一手结论：先反推输入集合）

**症状**：批导消息列报 `第 001 张凭证创建失败：… 会计接口：以交易货币 880.00- (CNY) 计的余额`，
用户坚称「改之前是好的」。

**先算，别先读代码。** FI 那条 `Balance in Transaction Currency &1` 里的金额＝**该批的带符号净额**，
显示口径是 `借 − 贷`（尾随负号＝贷方多）。拿上传文件算各前缀净额，能唯一反推出「哪一段行被单独成了一批」：

```python
# 从 xlsx 取每行 BSCHL/WRBTR，按 40→借(+) / 50,31→贷(−) 求带符号净额
# 实测：1080 行整份净额 0；前 998 行 = +880；第 999~1080 行 = −880  → 与报错 880.00- 精确吻合
```

**两条极易误判的陷阱**：

1. `第 &1 张` 里的张号是 `ZFM_FII001_SPLIT` 的**函数局部变量 `lv_seq`**，每次调用都从 1 起
   → **第 N 批也写成「第 001 张」**，不能据此断定它是第一张。
2. `LV_SPLIT`（是否拆分）只由**入参行数**决定：`lv_cnt > 999` 才置真，**只有真时才追加轧差行**。
   所以「一批 ≤999 行、本身不平」必然透传 BAPI 原始余额错 —— 报错金额＝那一批的净额，与代码无关。

**结合两条 ⇒ 若报错金额对得上「某一段行的净额」，那批就是被按 `NUMBER`（凭证接口编号）分成了多批**
（`ZFIB001` 用 `AT END OF NUMBER` 逐组调函数），每批 <999 都不拆不轧差 → 各自不平。
2026-09-23 实例：1080 行的文件若 `NUMBER` 全为 1 则完全正常（实测模拟 + 真实过账均通过，
落地凭证 100000053/100000054）；报 `880.00-` 的只可能是被分成 1~998 与 999~1080 两批的情形 ——
把两段各当一批单独调用即可**逐字复刻**报错（998 行 → `880.00 (CNY)`；82 行 → `880.00- (CNY)`）。
`CHAR` 排序里空格最小，**`NUMBER` 留空的那段排在最前**，所以它才是「第 001 张」。
**处置：一张逻辑凭证的 `NUMBER` 必须一致（通常全填 1）。**

**复现必须用真文件逐字生成探针**（`scripts/work/gen_probe_fii001_real.py` → `ZTEST_FII001_SPLIT_REAL.abap`）。
生成器按「行段」参数化（`分界 998`），场景：A 基线全量 / B 基线 1~998 / C 基线 999~N /
D 新函数 1~1000 / E 新函数全量 / F 新函数 1~998 / G 新函数 999~N（★复刻报错）；
**真实 POST 场景要显式开启**（生成器第三个参数），否则每次跑都会多建凭证。
手工重写数据会漏列：首版漏了贷方行必填的 `RSTGR=152`（只经 `ZSFI_BSEG` 扩展传给 BADI），
探针报出 `Field Reason Cde is a required field` —— **错误全变了，根因被盖住**。

**推 `$TMP` 探针到 300 的两个坑**：

```bash
sed 's/^SAP_CLIENT=100$/SAP_CLIENT=300/' env/dev.env > /tmp/sap300.env   # push 只认 env 里的 SAP_CLIENT
SAP_ENV_FILE=/tmp/sap300.env SRC_FILE=$PWD/.../ZTEST_X.abap node scripts/work/push_prog_source.js
SAP_ENV_FILE=$PWD/env/dev.env SAP_CLIENT_OVERRIDE=300 node scripts/work/adt.js run ZTEST_X   # run 反之
```

- **探针程序里不要定义 `FORM`**：同一份代码内联能激活，抽出 `FORM` 后激活报
  `Statement is not accessible`（`CheckProgram` 却返回**零错误**，极具误导性）→ 改回内联即可。
- `WRITE: / 4(4) x` 非法（`/` 与列格式必须连写）；分段读 `msgtx` 前先赋给定长 `CHAR220`，否则越界。

**结论先行的话术**：先给「当前代码 + 你的文件跑通了（含真实过账凭证号）」的证据，再给「报错金额反推出的输入集合」，
最后问一句「上传文件的 `NUMBER` 列是不是全 1」。这比逐行读代码快一个数量级。

### 归档包移植

先查 `/THINKWAY/*` 依赖（本系统没有，换 `zgsp_1c_rfc_logger` / `zgsp_cl_abap_properties`）→ 瘦函数体 + FORM
→ `compress=''` → 补 HTTP 非 2xx / 空报文分支 → 地址两级回退 → 凭据前置校验 → `RVAR1`。

- 地址回退链：`ZCBS_ISCxxx` → `ZGSP_EPIC_ISC100`。
- **归档函数名 ≠ 客户编号**时，去对应 FS 的 A1「接口编号（原集团 ZCBS_ISxxxx）」找，别去试编号
  （原集团 `ZCBS_ISC003` → 客户 `ZCBS_ISC006`）。

---

## 5. 高频坑索引

- ★★ **FM（函数模块）四坑（2026-10-16 `ZFM_AIAB_MOUNT` 实测）**：
  ① **FM 源码里 `*"` 是签名声明区，不是自由注释** —— 写自由文本被 ADT 拒收
     （`FUNC_ADT 028 Parameter comment blocks are not allowed`）。接口改用 **ADT 内联签名语法**
     （`FUNCTION xxx` 之后直接写 `IMPORTING ... EXPORTING ... TABLES ... .`），普通注释一律用 `*`；
     `TABLES` 参数写 `it_rules TYPE cobrb`（写成 `STRUCTURE cobrb` 报
     `Parameter IT_RULES declares no type`）。
  ② **`CreateFunctionModule` 必须显式传 `transport_request`** —— 不传报 `CTS_WBO_API 019`
     「对象已在用户 xxx 的请求 yyy 中锁定」（其实是同一请求，误导性极强）；`CreateFunctionGroup` 同带。
  ③ **`CALL FUNCTION` 参数段顺序强制**：`EXPORTING` → `IMPORTING` → `CHANGING` → `TABLES` → `EXCEPTIONS`。
     把 `TABLES` 写在 `IMPORTING` 之前，编译报 `Unable to interpret "EV_OBJNR"`（完全看不出是顺序问题）。
  ④ 新建 FM 后需 `ActivateFunctionGroup` + `ActivateFunctionModule` **双激活**，否则调用侧接口参数不可见。
- ★ **字符串模板不能作 `PERFORM ... USING` 实参** ⇒ 报 `Field "|" is unknown`；先赋给变量再传。
- ★★ **`POPUP_GET_VALUES` 的 `RETURNCODE` 语义是反的直觉**（2026-10-16 ZFID001C 实测）：
  **`'A'` = 用户取消；空格 = 用户确认且 `FIELDS` 已回填**
  （`SAPLSPO4` / `LSPO4U01`：`IF ok_code_save = 'CANC'. returncode = 'A'. ELSE. fill_values. returncode = space.`）。
  写成 `IF lv_rc <> 'A'` 会把「确认」当「取消」⇒ 现象是**点弹窗确认后毫无反应**（无消息、无动作、无转储）。
  正确写法 `IF lv_rc = 'A'. <取消处理> ENDIF.`（ZFID001A 即此写法）。
- ★★ **`POPUP_GET_VALUES` 只在「字段挂得住 DDIC 搜索帮助」时才弹 F4**（2026-10-16 ZFID001C 实测）。
  字段有没有帮助，用 `F4IF_DETERMINE_SEARCHHELP` 判（rc 0=有 / 2=字段在但无帮助 / 1=字段不存在）——
  这就是弹框内部（`SAPLSPO4`/`LSPO4I20`）走的路子：
  `svali-tabname`(可带 `*` 前缀) + `svali-fieldname` → `F4IF_FIELD_VALUE_REQUEST`。
  故**「加搜索帮助」有两条路**：
  1. **借现成帮助**：把该字段的 `sval-tabname/fieldname` 指到有帮助的表字段（如 `SKA1-SAKNR`、`CSKS-KOSTL`、`AUFK-AUFNR`、`VBAK-VBELN`、`BSEG-UMSKZ`）。
     **代价是字段属性跟着变**（长度 + **输入转换 ALPHA**）⇒ 存库/校验口径会变，慎用。
  2. **自建出口（推荐，ZFID001C 采用）**：改用 `POPUP_GET_VALUES_USER_HELP`，传 `F4_FORMNAME` + `F4_PROGRAMNAME = sy-repid`，
     字段属性一律不变；自己按字段名取值（借 DDIC 帮助用 `F4IF_FIELD_VALUE_REQUEST`，自建列表用 `F4IF_INT_TABLE_VALUE_REQUEST` + DFIES 表做列标题）。
     ★ 出口 FORM 的形参由 FM 以 **5 个 `USING`** 调用（`tabname, fieldname, display_flag, returncode, value`），
     **把选中值写回第 5 个形参并把 `returncode` 置 `'F'`**，弹框才会 `DYNP_VALUES_UPDATE` 刷屏（拿不到 `sy-stepl`，不要走 dynprofield 回填）。
     判定取消仍按 `returncode = 'A'`。
- ★★ **FORM 的 `TABLES` 形参必须写在 `USING` / `CHANGING` 之前**（2026-10-16 ZFID001C 实测）：
  `FORM f TABLES pt TYPE ty_tab USING a b CHANGING c.` —— 写成 `USING ... CHANGING ... TABLES ...`
  激活报 **`Field "TABLES" is unknown.`**（把关键字当成了形参名）；`PERFORM` 调用侧同理 `TABLES` 在前。
- ★★ **`F4IF_INT_TABLE_VALUE_REQUEST` 传 `FIELD_TAB` 时，每行必须能推出 `INTTYPE`**（2026-10-16 ZFID001C 实测）：
  推导链为 `TABNAME` → `INTTYPE` → `DATATYPE` → `DOMNAME` → `ROLLNAME`，全落空即走 `SAPLSDHI` 第 161 行
  `message DH208 raising parameter_error` ⇒ **按 F4 弹不出列表、`sy-subrc = 1`**。
  只填 `FIELDNAME` + `FIELDTEXT` **不够**（编译过、激活过，一按 F4 才炸，`parameter_error = 1`）。
  最小填法：`FIELDNAME` + `DATATYPE='CHAR'` + `INTTYPE='C'` + `LENG` + `OUTPUTLEN` +（`REPTEXT`/`SCRTEXT_S/M/L` 写列标题）。
  `OUTPUTLEN` 兼作列宽（为 0 会被挤没）；**`RETFIELD` 所在行的 `SCRTEXT_L` 会成为 F4 弹窗标题**（FM 第 252 行）。
  该 FM 另有 3 个 `PARAMETER_ERROR` 触发点：① `FIELD_TAB` 空且自动推导失败（第 83-87）；
  ② `DDIC_STRUCTURE` 取值失败（第 192-195）；③ `RETFIELD` 所在行累计 `OUTPUTLEN` > 1000 被截断 → DH198（第 280-284）。
  `IRC = 4` 的 `no_values_found`（DH801）在**弹窗之后**才判 ⇒ 「传空值表」验证不了参数合法性。
  ★ 另：**`POPUP_GET_VALUES_USER_HELP` 的 F4 出口里调 F4IF 系是合法的** —— `LSPO4I20` 第 65-67 行
  用户出口与标准 F4 分支互斥，第 89-94 行由屏幕 F4 事件直接 `PERFORM (f4_form_name) IN PROGRAM (f4_program_name)`（5 个 `USING`）。
  离线验证手法：`$TMP` 探针复刻该推导链，用同款 DFIES 走查（范式 `ZTEST_F4_DFIES`）。
  ★★ **`INTLEN` / `OFFSET` 必须一并填对**（2026-10-16 同日第二轮，用户 GUI 报转储）：
  `INTLEN` 是**字节**长度 —— Unicode 下 **`INTLEN` = 字符数 × 2**（CHAR40 → 80、CHAR60 → 120）；
  `OFFSET` 是**字节**偏移。只填 `LENG`/`OUTPUTLEN` 不填 `INTLEN` ⇒ **F4 弹得出来、但选中/关窗时转储**：
  `SAPLSDH4` / `LSDH4F02` 第 583 行 `FORM convert_result` 的
  `assign <value_x>(len_neu) to <value_neu>`（`len_neu = DFIES-INTLEN`）⇒ *ASSIGN with length 0*。
  ★ 正解：用 `DESCRIBE` 从**同类型实例**动态取，别硬编码 ——
  `DESCRIBE FIELD ls-zzval LENGTH lv IN BYTE MODE.` / `... IN CHARACTER MODE.` /
  `DESCRIBE DISTANCE BETWEEN ls AND ls-zzval INTO lv IN BYTE MODE.`
  黄金样本：真实 DDIC 结构 `TCURT` 的 DFIES（`LTEXT` CHAR40 = intlen 80 / off 18 / leng 40；
  各字段 offset 按字节累加自洽）。
  ★ 更省心的一条路：**传 `DDIC_STRUCTURE`**，FM 自己 `DDIF_FIELDINFO_GET` 填 `FIELD_TAB`（零猜测），
  代价是要建一个 DDIC 结构；程序**局部**类型走不通 —— `get_fields_of_value_tab`（`LSDHIF03`）
  依赖 `DDIF_FIELDINFO_GET` + `DESCRIBE FIELD ... HELP-ID`，查不到局部类型 ⇒ `FIELD_TAB` 空 ⇒ DH110。
- ★ **`DDIF_FIELDINFO_GET` 的 `FIXED_VALUES` 形参类型是 `DDFIXVALUES`**（TABLES 参数，非 DD07V）：
  传自定义结构会在**运行期**报 500 `Type conflict in a function module call` —— 编译不报、只炸运行。
  查 FM 形参类型别猜，直接读 `fupararef`：`SELECT parameter, paramtype, structure FROM fupararef WHERE funcname = '...'`。
- ★★ **FORM 形参不能写 `TYPE c LENGTH n`**（2026-10-10）⇒ 报 *Numeric literals cannot be used as field names*。
  `DATA` 里合法，**只有 FORM 形参不允许** ⇒ 用 `TYPE char<n>` 或 DDIC 类型。
- ★★ **字符类按引用传参要求实参长度与形参一致** ⇒ 短变量传长形参**编译期**报
  *the actual parameter "X" is incompatible with the formal parameter "Y"*；**字面量与文本符号例外**（只免编译检查——文本符号传**固定长度**形参仍会运行期
  500 `Type conflict when calling a FORM`，2026-10-15 ZFIR_0224 实测：TEXT-041 传 `TYPE char10` 形参；
  ⇒ 形参一律改泛型 `TYPE c`，或调用侧先赋同长变量）。
  `TYPE string` 形参接不了 `CHARn` 变量 ⇒ 中间变量中转。
- ★ **最常复发三条**：① SQL 里 CHAR+NUMC 拼接只能用 `concat( a, b )`（`&&`、`CAST` 都不行）；
  ② **FORM 形参不能内联 `TYPE STANDARD TABLE OF`**，先 `TYPES` 命名；
  ③ **`SELECT ... INTO TABLE` 按位置赋值**，别拿整表结构当容器；
     **显式列清单 + `TABLE OF <库表>` 目标 = 必踩**（2026-10-20 ZFID001A：`ztepic3a` 第 3 组件 `ZJK`(CHAR10,ZEJK)
     vs SELECT 第 3 列 `ZJYRQ`(CHAR8) ⇒ 激活报 `SELECT 368 The data type of the component "ZJK" of "LT_FILE" is not compatible with the data type of "ZJYRQ"`，
     `_act_dbg.js` 拿坐标）⇒ 显式列清单一律配 `INTO TABLE @DATA(...)` 内联（结构由列表生成），或干脆 `SELECT *`；
     现网 ZFKLSH 段没雷正因它用 `@DATA(lt_3a)`。
- ★ **DDIC 结构字段名允许前导下划线**（2026-10-10）：`_T00011` 建成并激活，`DD03L.FIELDNAME='_T00011'`、`DATATYPE=STRG`。
  ADT 那句 *Names may consist only of A-Z "_" 0-9 (not leading)* 是**提示不是报错**。
- ★ **`adt.js run` 输出不带 `[adt]` 前缀** ⇒ `grep '^\[adt\]'` 会吃掉全部，改用 `sed -n '/run status/,$p'`。
  SAP 列表宽 ~80 列会**截断长 JSON** ⇒ 探针按 60 字符分段 `WRITE`。
- ★★ **SD 增强字段 / 数量 / 参考单据的坑不在本文件** —— 统一见 `sap-abap-bapi-usage`：SD 参数全表在其分册 `50-SD-销售订单`（`EXTENSIONIN` 四条硬约束、`TVEPZ` 数量双通道、参考单据三件套、退货单 `Z011`），通用规则见分册 `00-通用调用规范`。本项目只记三条口径：
  ① 入参复用 `ZBPM_ISP014_HEAD_S`，底层 `SD_SALESDOCUMENT_CREATE` / `_CHANGE`，增强字段走 `EXTENSIONIN`（`ZSBAPE_*` → `VBAKKOZ`/`VBAPKOZ` append，四段缺一不可），**已无直写底表**；
  ② 行项目参考单据必须补 `REF_DOC_CA`（取被参考单据的 `VBAK-VBTYP`），退货单必需；
  ③ 计划行数量校验按 `TVEPZ` 判据豁免无计划行的项目类别（`Z014`/`Z015`）。

**其余坑位**（SQL/内表/字符串、SELECT 字段、ALV/弹框/探针、外部系统、SD 长文本 `BAPISDTEXT` 的
`MSGFN='003'` 删除开关、`DD03L` 嵌套展平、`DD03T` 描述写入、`CL_DEMO_OUTPUT`）
→ 工作区 `.workbuddy/memory/档案_系统对象.md` 的「通用坑位详解」。

---

## 6. 主要生产对象

- **FM / 过账**：`ZFM_FII001` 过账、`ZFM_FII003` 冲销（成功判 `MSGTY='S'`）、`ZFM_FII001_SPLIT` 拆分（>999 行）。
- **出向 `*ISC*`**：`ZCBS_ISC001`(客商)、`002`(查付款排程)、`003`(推付款单据)、`004`(查收付款结算单)、
  `005`(联行号)、★`006`(同步票据文件，源自原集团 `ZCBS_ISC003`)、`ZBPM_ISC012`。
- **入向 `*ISP*`**：`ZSAP_ISP001`、`ZBPM_ISP001/002/003/010/011/014/016/017`。
  `ISP014`→`ZFG_BPM014`、`ISP016`→`ZFG_BPM016` 的包是 `ZSD`；`ISP017` 包 `ZFICO` / `ZFG_BPM017`。
- **平台 / 报表**：`ZFID001`(付款平台 A~E，`E`=收付款结算单查询)、`ZFID003`、`ZFIB001`、`ZFIB003`、
  `ZFID004`、`ZFIR005`、★`ZFIR_0237`（CBS 付款排程单查询，TCODE `ZFI237`）、
  ★`ZIFLOG` 表 + `ZCL_IF_LOG` + `ZIFLOG_VIEW`（TCODE `ZIFLOG`，包 `ZGL`，请求 `DEVK900006`）。
- **自建表**：`ZTEPIC01/02`、`ZTEPIC03A~03F`（★ FS 写 `ZTEPIC03A`，实际是 **`ZTEPIC3A`**；9 主键含 `INCLUDE ZSCOMM_LOG`）、
  `ZTEPIC04/05/07`、`ZTEPIC13`。遗留 inactive：`ZTFI0010`、`ZMMD303`。
- 单个对象的实现细节 / 测试结论 / 遗留项 → `档案_系统对象.md`。

---

## 7. 交付脚本约定

- ★★ `prep_object.js`（2026-11-11）：**改任何既有对象前的第一步**。一轮并行取齐
  「现网源码 + 文本元素 symbols/selections 激活版 + TADIR + E071/E070 请求归属 + 档案命中段 + 归档 diff」，
  并直接给判据（现网 vs 归档是否一致、挂哪个请求号、有无业务 include）。
  用法 `node scripts/work/prep_object.js <PROG|FM|CLAS|INCL> <名> [函数组]`，产出落 `backup/prep_<名>_<时间戳>/`。
  替代原先 5~6 轮串行往返（get_source → read_textelements×2 → 查 TADIR → diff 归档 → 翻档案）。
  ★ 实现坑：①每个并行任务必须用**独立 ADT 会话**（独立 connectionid + cookie + csrf），共用一个 stateful 会话并发会被 403；
  ②cookie jar 必须存整段 `name=value`，只存 value 会让 Cookie 头退化成裸值 → 报「CSRF 令牌验证失败」；
  ③diff 前必须把两侧换行规范化（`\r\n`→`\n`、去 BOM），否则整文件全红是假差异。
- `create_isc00x_objects.js` / `create_isp0xx_objects.js`：`base` 建对象 / `fix` 全量 DDL / `ttyp` 复活表类型 / `verify` / `del`；
  一律支持 `ONLY=`。
- `gen_isc00x_json_probe.js`：从源码**正则抽取** `name_mappings`，生成 `$TMP` 保真探针。
- **改结构 / 切版本必须双向留档**（`backup/iscxxx_日期/` 同放 `_改前` 与 `_新版`）。
- `set_fm_rfc.js`、`_act_dbg.js` 幂等通用。
- **沙箱 2 分钟超时 SIGTERM 会打断长批量脚本**（留半成品 + `ESDICT` 残留锁）⇒ 建对象脚本按 `ONLY=` 分批，每批 ≤5 个。
- **★ 批量补丁脚本必须带「生成后自检断言」**：锚点命中数校验防不住"值错"（实例：模板 `'%s'`
  只喂流水号，四个文件的 `funcname` 全落成 `'003'` 这种残值）。生成后必须断言关键值
  （如 funcname 全名恰好 1 处、禁止残留词计数为 0），断言不过即非零退出、不写盘。

---

## 8. ★ 2026-10 增补硬事实

- **改可交付对象前先回读现网**：用户会直接在 SE80 改生产对象而不回写归档。
  实例 `ZBPM_ISP002` 现网比 `FICO/` 归档多 71 行（`ZDJZT/ZSFJW/ZSKDW 拆分/CRNAM`），
  `frm_get_empno` 改成解析 `is_head-zskdw`（「名/G工号」取第 2 段加 `G`）、分摊行成本中心用 `LS_IT-KOSTL`。
  **流程：`get_source` 回读 → 与归档 diff → 以现网为基线打补丁 → 归档同步。**
- **`LFA1-NAME1` 中文姓名是「名 姓」倒序含空格**：张三 = `"三 张"`（`LIFNR = G000001`，供应商编码 = `G`+工号），
  拼文本不会自动变「张三」。
- **集团 300 有 FI 凭证替代 `ZFI001`**（`GB92.SUBSTID=ZFI001` / `BOOLCLASS 008`）：
  把 8* 费用行**空**的 `BSEG-ZUONR` 补成记账日期（16,343 行）。**显式写入的不被覆盖**。
- `SKAT` 取科目描述需 `KTOPL`（`T001-KTOPL`）+ `SAKNR` + `SPRAS='1'`（`TXT20` / `TXT20_SKAT`）。
  100 的 `T001` 无客户公司代码 ⇒ 涉 `T001` 的链路只能在 300 验。
- `BAPIACGL09-ITEM_TEXT`(CHAR50) / `BAPIACHE09-HEADER_TXT`(CHAR25) **静默右截断**；
  拼「前缀+后缀」先把前缀截到 `长度-后缀长度`。
- **`ZBPM_ISP016`（销售订单维护，`ZFG_BPM016` / 包 `ZSD`）**：入参复用 `ZBPM_ISP014_HEAD_S`；
  底层 `SD_SALESDOCUMENT_CREATE` / `_CHANGE`；**增强字段走 `EXTENSIONIN`**
  （`BAPE_VBAK/VBAKX/VBAP/VBAPX`，链 `ZSBAPE_*` → `VBAKKOZ`/`VBAPKOZ` append `ZSVBAKKOZ(Z)`/`ZSVBAPKOZ(X)`，四段缺一不可），
  已无直写底表；**行项目补 `REF_DOC_CA`**（改取被参考单据的 `VBAK-VBTYP`，退货单必需）
  + 行项目参考单据的**行号必填 / 存在性**校验；**行项目补 `TARGET_QTY = KWMENG`**（`Z014`/`Z015` 无计划行）。
  ★ **计划行数量校验按 `TVEPZ` 判据豁免无计划行的项目类别**（`Z014`/`Z015`）。
  E2E `ZTEST_ISP016_E2E2`（300，**PASS 71 / FAIL 0**，订单 `7000000155`）。
  报告 `测试报告/ZBPM_ISP016_销售订单维护接口_测试报告_20260929.md`，
  备份 `backup/isp016_20261010_{ext,z011,z014,z007,schedchk}/`；
  初版 10 个历史 DDIC 对象（5 结构 + 5 表类型）已于 2026-10-10 删除，留档 `backup/isp016_20261010_delold/`。
- **写含中文的 ABAP 后做隐藏字符体检**：Edit 可能混入**零宽字符**（实测 `U+200B` 进标识符 `vgb?el`，编译期才炸）
  ⇒ `LC_ALL=C grep -n '[^ -~]' <file>` 快筛，或 python 判 `ord>127` 且不在 CJK/全角区间；修正用 python `re.sub`。
  （★ BSD grep 无 `-P`、无 `\|` 交替 ⇒ 多关键字用 `grep -E`。）
- **探针入参为数值型（`DEC`）必须用数值字面量赋值**：`ZYFKBL(DEC 5,2)` 赋字符串 ⇒ 报
  `cannot be interpreted as a number` 并返 500。
- **GSP 接口日志（`ZGSP_1C010`）受事务控制**：`create_snapshot` → `EXPORT ... TO DATABASE ZGSP_1c010(fl) ID ms_key`，
  只有 `iv_commit='X'` 才 `COMMIT WORK`。⇒ **业务里任何 `ROLLBACK WORK` 都会把同 LUW 的接口日志（含 `indx=01` 入参快照）一并回滚**。
  凡「写底表 + 失败回滚」的接口都要在**写库前**独立 `COMMIT WORK`，且必须早于 `frm_create_doc`
  —— 因为 **`ZFM_FII001` 内部也 `BAPI_TRANSACTION_ROLLBACK`**（第 675 行）。
- **`ZGSP_1C010` 列名**：`MANDT/RELID/NAME/ERDAT/STAMP/INDX/PARA/SRTF2/ERZET/AREA/ERNAM/MEMO/RTYPE/RTMSG/CLUSTR/CLUSTD`
  （**无 `SRTFD`**）；按 `NAME + ERDAT + STAMP` 区间查。开关表 `ZGSP_1C020` 按 `funcname + begda/endda`。
- **★ 用户红线：接口平台代码一律不改** —— `ZGSP_1C_*` / `zgsp_1c_rfc_logger` / `ZGSP_1C010` / `ZGSP_1C020` /
  `ZGSP_1C_RFC_MONITOR`。问题只在业务侧解决。
- **★ 平台快照 MEMO 不塞业务值**（2026-10-12 用户口径「接口平台不需要管 MEMO」）：
  曾把 ZIFLOG 日志号回挂 `create_snapshot( iv_memo = … )` 做互跳，同日收掉；
  MEMO 恢复平台原字面量，`frm_send` 不为传日志号加出口参数。
  注意 `zgsp_1c010-stamp` 是**时间字段**（`16:33:10,750293`），日期在 `erdat` —— 按
  `name + erdat + indx` 查快照，别拿 stamp 当完整时间戳过滤。
- **MCP 配置**：`~/.workbuddy/mcp.json`（**没有点前缀**），改完需重启并信任。

---

## 9. 相关专项技能

| 技能 | 覆盖内容 |
|---|---|
| `sap-abap-bapi-usage` | ★ **BAPI 索引**（七个分册）：通用规范、静默失效、语言格式、FI/PP/SD/BDC |
| `sap-abap-pitfalls` | ★ **踩坑与解法库（跨项目通用）**：约 120 条「现象→根因→解法」，含静默失效清单、假锁/假成功判定、ST22 排查手法。排障先查它 |
| `sap-abap-prog-push-run` | 报表推送/激活/运行/测试报告、集团切换、500 根因定位、嵌套结果集 |
| `sap-ddic-object-ops` | 域/数据元素/表/结构的建与改、MASTERLANG、代理与假锁 |
| `sap-json-interface-mapping` | `name_mappings`、大小写、压缩丢空值、三形态探针 |
| `sap-tcode-create` | `RPY_TRANSACTION_INSERT` 建事务码 |
| `sap-cua-gui-status-functions` | `gen_cua.js` 批量登记 GUI 状态 |
| `sap-bdc-to-bapi-migration` | BDC 录屏改 BAPI/标准函数 |
| `sap-dump-to-excel-cell` | 从 short dump 反查 Excel 出错单元格 |
| `sap-export-column-mapping` | 自建导出表头 ↔ 源码字段映射 |
