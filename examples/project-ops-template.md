# 项目作业总纲 · 示例档案（已脱敏）

> **这是一份真实项目的作业总纲，不是通用规范。**
> 里面的系统拓扑、命名前缀（`*ISP*` / `*ISC*`）、15 条硬性约定、对象清单，都是**那个项目的甲方和团队定的**。
> 换一个项目，这些大概率全都不一样 —— 所以**抄结构，不要抄命名和约定**。

通用且确定的东西不在这里：

| 内容 | 在哪 |
|---|---|
| ADT 写入六铁律（`proxy:false` / 父请求号 / 不带 `SAP_CLIENT_OVERRIDE` / HTTP 200 ≠ 激活 / 锁顺序 / 只印 `e.message`） | [`docs/02-ADT写入铁律.md`](../docs/02-ADT写入铁律.md) |
| 作业脚本用法与环境变量 | [`docs/04-作业脚本手册.md`](../docs/04-作业脚本手册.md) |
| 跨项目可复用的踩坑（120 条） | [`skills/sap-abap-pitfalls`](../skills/sap-abap-pitfalls/SKILL.md) |
| BAPI / 标准函数调用 | [`skills/sap-abap-bapi-usage`](../skills/sap-abap-bapi-usage/SKILL.md) |

> 本文已去掉客户专属的封装接口签名表（甲方业务逻辑，不入公开仓库）。

---

## 0. 开工前必须摸清的 8 件事

**这一节是本文唯一可以直接照用的部分** —— 换任何项目，这 8 个问题都要先问清楚，问不清后面全是返工。

| # | 要问清 | 为什么 |
|---|---|---|
| 1 | 几套环境？各自 SID / 主机 / 端口 / 集团号 | 环境搞错是最高频事故 |
| 2 | **哪套集团是空壳、哪套有真实数据** | 决定查数据时切哪个，避免「查出来全是 0 行」 |
| 3 | 请求号体系：谁是父请求、谁是任务 | `CORR_NR` 传错，对象进不了传输 |
| 4 | 命名空间与包划分：对象前缀规则 | 建错前缀，激活/传输都受限 |
| 5 | 甲方对交付物的要求：注释语言、函数体风格、文案是否走文本元素、测试报告格式 | 交付被打回基本都在这几条上 |
| 6 | 接口规范：出向/入向命名、报文格式、网关地址存在哪、认证方式 | 接口地址硬编码是后期维护灾难 |
| 7 | 有没有「封装接口优先于直调 BAPI」的项目规定 | 有的话调 BAPI 前必须先找封装 |
| 8 | 生产对象清单由谁维护、怎么维护 | 否则交付时说不清改了哪些对象 |

下面 1~10 节是一份**填好的样例**，看它长什么样，然后照自己的答案写一份。

---


## 1. 环境与集团

> 样例：三套环境、两个集团，100 是空壳、300 有数据。你的项目结构不同，但**「哪套是空壳」这件事一定要写在这里**，否则每次查数据都要重新试一遍。

| 环境 | 地址 / 配置文件 | 集团 | 备注 |
|---|---|---|---|
| DEV | `https://sapdev.example.com:44300`，`portable/env/dev.env` | 100 | 用户 devuser。**空壳集团** |
| DEV | 同上 + `SAP_CLIENT_OVERRIDE=300` | 300 | **真实数据都在这** |
| DEV-B | `portable/env/dev2.env` | 200 | MCP `adt-dev2` |

- ★ **100 是空壳**：`BKPF / BSEG / EKKO / EKPO / RSEG / RBKP / ZTFI0002` 全 0 行。
- ★ **300 有完整数据**：BKPF 793 / BSEG 17783 / RSEG 1050 / ANLA 330。
  ⇒ **凡查真实数据，一律 `SAP_CLIENT_OVERRIDE=300` + `$TMP` 探针**。
- 100 的 `ZGSP_PPS` 整表空（接口地址表），新接口地址全部需要另维护。

---

---


## 2. 速查命令

> 样例：配本仓库 `scripts/` 用的常用命令。脚本参数说明见 `docs/04`。

```bash
# 查询 / 建对象走 MCP 工具通道；以下为工作区脚本
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/prep_object.js PROG ZFIR_0237   # ★改前一次性预取
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/adt.js query "<sql>" [rows]   # 亦可 table/run/dumps
SAP_CLIENT_OVERRIDE=300 SAP_LANGUAGE_OVERRIDE=zh node scripts/adt.js <cmd|run PROG>
CORR_NR=<父请求号> PKG=ZFICO SRC_FILE=/abs/x.abap node scripts/push_prog_source.js
SAP_CLIENT_OVERRIDE=300 SRC_FILE=/abs/x.abap PKG='$TMP' node scripts/push_prog_source.js  # $TMP 探针
SRC_FILE=/abs/x.abap TARGET_GROUP=ZFG_x TARGET_FM=Zx_y CORR_NR=<父请求号> node scripts/push_fm_source.js
TE_FILE=...json CORR_NR=... node scripts/push_textelements.js
node scripts/get_source.js <PROG|INCL|FM|CLAS|TABL|STRU|DTEL> <名> [GROUP] --out=/tmp/x
node scripts/call-adt-tool.js <Tool> @args.json   # 含中文参数一律 @文件
node scripts/check_activation.js             # 未激活对象清单
PROGS=A,B node scripts/delete_prog.js        # 删程序
OBJ=ZXXX OBJ_TYPE=PROG/P OBJ_URI=/sap/bc/adt/... node scripts/_act_dbg.js  # 完整激活报文
```

---

---


## 3. ADT 写入判定手法

> 六条通用铁律的完整版见 `docs/02`。这里是**该项目额外踩出来的判定手法**，属可复用部分。

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
- 推可传输对象前先定集团：`portable/env/dev.env` 的 `SAP_CLIENT=100` 就是请求所属集团，
  脚本默认值即正确 —— **不要习惯性加 `SAP_CLIENT_OVERRIDE=300`**，那个只给 300 的 `$TMP` 探针/查数据用。
- 源码、GUI 状态（`D010S/D010L/D010INC` 无 `MANDT`）、**文本池（`TEXTPOOL` 只有 `ID/KEY/ENTRY`，无 `MANDT`）**
  三者**都跨集团**，在请求所属集团（100）改一次，两个集团都生效。
  ⇒ 300 下推文本元素报「没有为此客户端指定在任务 xxx 中锁定的对象 LIMU REPT」，直接忽略，不是问题。
- 改多程序同一功能时，**先各自确认基线差异**再动手：`ty_alv` 有没有那个字段、field catalog
  有没有那一列、有没有可复用的 F4/弹窗辅助 FORM。别假设兄弟程序结构一致（实例：ZFID001C 有
  `FRM_F4_VAL_TAB`、ZFID001D 没有，得先补建才能复用）。

---

---


## 4. 项目硬性约定（15 条）

> ⚠️ **这一节最不能照抄。** 强制中文注释、瘦函数体 + `FORM`、CASE 分支写字面量、建表只走一条路…… 都是那个项目的团队约定。你的项目该问第 0 节第 5 条。

1. 语言强制 **ZH**（含 DDIC 主语言）。
2. 接口一律「**瘦函数体 + FORM**」。
3. S/4 新语法优先，**SELECT 列表逗号分隔**。
4. 写 SAP 前先查锁、先 backup；凭据不外传不回显。
5. 产出位置：报告 → `测试报告/`，测试源码 → `scripts/`，
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
    **绝不把 `scripts/*.js`、`ZTEST_*` 写进源码**。
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
    `SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/read_textelements.js <PROG> symbols`
    与 `... <PROG> selections` 各跑一次，取**激活版**全文存 `backup/<PROG>_textelements_<日期>.json`，
    与 `scripts/textelements/<PROG>.json` 逐行 diff 后**人工合并**，再 `push_textelements.js`。
    **严禁拿陈旧 JSON 直接推文本元素** —— 用户在 SE38「转到 → 文本元素」前台改的内容会被无痕冲掉，
    代码 diff 完全看不出来，事后只能靠他回忆。凡交付四步中的第 3 步（推文本元素）执行前，本条为强制前置。
15. ★★ **测试／探针对象测完即删（2026-11-05 用户定，取代 2026-09-14 旧口径「放 $TMP 不传输不删除」）**：
    客户不需要、也不应看到测试程序。**每轮联调／验证结束，本轮新建的 `$TMP` 测试程序、探针、
    临时类／表一律从系统删掉**，不留 `TADIR` 残留；不得把测试对象挂进 `ZFICO` 等交付包或写进传输请求。
    - 顺序：**先 `get_source` 回读源码留档到 `backup/`（删除不可逆）→ 再删 → 再回查 `TADIR`/`TRDIR` 确认清零**。
    - 删除命令：`PROGS=A,B node scripts/delete_prog.js`（`$TMP` 本地对象**不需要请求号**，
      绝不为此新建请求号；脚本自带 LOCK→DELETE，删除后不用 UNLOCK）。
    - **只删本轮自己建的**；他人创建的（`DEVUSER2`／`200001` 等）、已挂包／请求的对象、
      以及仍在用的 DEMO／工作台（如 `ZDEMO_WORKBENCH`）一律不动，需要清理先给清单等用户确认。
    - 生产源码里不得出现 `ZTEST_*` 引用（与 §3 第 11 条同源）。
    - 现存历史遗留清单与归属见 `.workbuddy/memory/2026-11-05.md`。

---

---


## 5. 接口范式

> 通用部分：命名方向、报文与网关、DDIC 与 FM、嵌套结果集。**命名前缀 `*ISP*` / `*ISC*` 是那个项目的规则**，判据可以参考。

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
  实施样例：`ZCBS_ISC001~006`（补丁脚本 `scripts/patch_cbs_isc_iflog_*.py`）。

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

---


## 6. 高频坑索引

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
- ★★ **SD 增强字段 / 数量 / 参考单据的坑不在本文件** —— 统一见 `sap-abap-bapi-usage`：增强字段见 `references/sd-extensionin.md`、数量双通道见 `references/sd-schedule-line-qty.md`、参考单据与退货单见 `references/sd-reference-doc-return.md`，通用规则见 `references/_通用调用规范.md`。本项目只记三条口径：
  ① 入参复用 `ZBPM_ISP014_HEAD_S`，底层 `SD_SALESDOCUMENT_CREATE` / `_CHANGE`，增强字段走 `EXTENSIONIN`（`ZSBAPE_*` → `VBAKKOZ`/`VBAPKOZ` append，四段缺一不可），**已无直写底表**；
  ② 行项目参考单据必须补 `REF_DOC_CA`（取被参考单据的 `VBAK-VBTYP`），退货单必需；
  ③ 计划行数量校验按 `TVEPZ` 判据豁免无计划行的项目类别（`Z014`/`Z015`）。

**其余坑位**（SQL/内表/字符串、SELECT 字段、ALV/弹框/探针、外部系统、SD 长文本 `BAPISDTEXT` 的
`MSGFN='003'` 删除开关、`DD03L` 嵌套展平、`DD03T` 描述写入、`CL_DEMO_OUTPUT`）
→ 工作区 `.workbuddy/memory/档案_系统对象.md` 的「通用坑位详解」。

---

---


## 7. 主要生产对象

> 样例：按类型分组的对象清单，交付时用来核对「改了哪些」。对象名保留作示例。

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

---


## 8. 交付脚本约定

- ★★ `prep_object.js`（2026-11-11）：**改任何既有对象前的第一步**。一轮并行取齐
  「现网源码 + 文本元素 symbols/selections 激活版 + TADIR + E071/E070 请求归属 + 档案命中段 + 归档 diff」，
  并直接给判据（现网 vs 归档是否一致、挂哪个请求号、有无业务 include）。
  用法 `node scripts/prep_object.js <PROG|FM|CLAS|INCL> <名> [函数组]`，产出落 `backup/prep_<名>_<时间戳>/`。
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

---


## 9. 增补硬事实

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

---


## 10. 相关技能

| 技能 | 覆盖内容 |
|---|---|
| `sap-abap-bapi-usage` | ★ **BAPI 索引**：一个 BAPI 一个文件，按名 / 按任务 / 按症状三路查 |
| `sap-abap-pitfalls` | ★ **踩坑与解法库（跨项目通用）**：约 120 条「现象→根因→解法」，含静默失效清单、假锁/假成功判定、ST22 排查手法。排障先查它 |
| `sap-abap-prog-push-run` | 报表推送/激活/运行/测试报告、集团切换、500 根因定位、嵌套结果集 |
| `sap-ddic-object-ops` | 域/数据元素/表/结构的建与改、MASTERLANG、代理与假锁 |
| `sap-json-interface-mapping` | `name_mappings`、大小写、压缩丢空值、三形态探针 |
| `sap-tcode-create` | `RPY_TRANSACTION_INSERT` 建事务码 |
| `sap-cua-gui-status-functions` | `gen_cua.js` 批量登记 GUI 状态 |
| `sap-dump-to-excel-cell` | 从 short dump 反查 Excel 出错单元格 |
| `sap-export-column-mapping` | 自建导出表头 ↔ 源码字段映射 |

---
