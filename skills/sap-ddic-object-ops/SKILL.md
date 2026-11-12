---
name: sap-ddic-object-ops
description: 通过 ADT/MCP 通道在 SAP 创建与维护 DDIC 对象（域 / 数据元素 / 表 / 结构 / 表类型）。主册给三条铁律、写对象的动作序列、验证 SQL、卡住速查与建对象脚本的四种范式；专题在 references/：建表（CreateTable 建壳 → UpdateTable 填全量 DDL、S/4 的 deliveryClass 与 CURR 币种两条硬校验、从 abapGit XML 还原、DD09L 缺失只能删了重建）、字段建模（表字段一律挂数据元素、CURR 降级 abap.dec、STRING 走域、DD03T 只认 @EndUserText.label）、结构改造（UpdateStructure 传全量 DDL、内嵌 TTYP 组件实现嵌套返回、删字段的连带检查）、删对象与 E071 补登（R3TR TTYP 会被静默丢弃）。含必踩的假锁：对象主语言被强制成 EN、本机代理导致写请求 socket hang up、MCP 把任何 403 译成 locked by another user / CSRF 失败。当需要建表建数据元素改结构、补字段文本、发现对象 MASTERLANG=E、或 MCP 报锁/CSRF/ECONNRESET 时加载。
agent_created: true
---

# SAP DDIC 对象操作（ADT / MCP 通道）

适用项目：示例客户 SAP ERP（`~/ABAP-AI`，系统 DEV，客户端 100，用户 devuser）。

**主册只放「每次都要看的」：三条铁律、写对象的动作与通用约定、验证 SQL、卡住速查、建对象脚本的四种范式。
专题在 `references/`：**

| 要做什么 | 去哪 |
|---|---|
| 建表（建壳两段式、S/4 硬校验、abapGit XML 还原、DD09L 缺失、ADBC 取证） | [`references/create-table.md`](references/create-table.md) |
| 建域 / 数据元素、字段建模口径（挂元素、CURR 降级、STRING 走域）、结构字段文本 `DD03T` | [`references/field-modeling.md`](references/field-modeling.md) |
| 改结构（`UpdateStructure`）、结构内嵌表类型组件（嵌套返回）、删字段的连带检查 | [`references/structure-ops.md`](references/structure-ops.md) |
| 删对象（依赖逆序、引用核查）、传输请求登记 `E071` 补登 | [`references/delete-and-transport.md`](references/delete-and-transport.md) |

> 分册章节号沿用拆分前的编号；主册 §1 只讲「动作序列」，每个动作的坑在对应分册。

## 0. 三条铁律

1. **语言必须是 ZH**。MCP 服务端在取不到 `SAP_LANGUAGE` 时会**主动补** `sap-language=EN`
   （`mcp-abap-adt/dist/lib/clients.js`），于是新建对象的 `MASTERLANG` 落成 `E`。
   `scripts/call-adt-tool.js` 已修（把 env 文件键值注入子进程）；全局 `~/.workbuddy/mcp.json`
   的 `adt-dev` 需带 `"env": {"SAP_LANGUAGE":"ZH","NO_PROXY":"*"}`。
   **DDIC 对象主语言创建后不可修改，错了只能删除重建。**
2. **必须绕开本机代理**。环境里 `HTTP(S)_PROXY=http://127.0.0.1:50014`，ADT 走它会
   `socket hang up`（DELETE 基本必现）/ `ECONNRESET` / CSRF 校验失败。
   脚本里要么删掉代理变量并设 `NO_PROXY=*`，要么 `axios({ proxy: false })`。
3. **不信任 "locked by another user"**。MCP 把 `message.includes('locked')` 和**任何 403**
   都翻译成这句话，实际多半是 CSRF/权限 403。真锁的报文是「使用者 <USER> 当前编辑 <OBJ>」。

## 1. 写对象的标准动作

```bash
# 域 → 数据元素 → 表，全部挂到同一个请求号，包名 ZFICO
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/call-adt-tool.js CreateDomain \
  '{"domain_name":"ZDXXX","description":"中文描述","package_name":"ZFICO","transport_request":"DEVK900006","datatype":"CHAR","length":10,"activate":true}'
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/call-adt-tool.js CreateDataElement "$(cat /tmp/dtel.json)"
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/call-adt-tool.js CreateTable ...
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/call-adt-tool.js UpdateTable "$(cat /tmp/tabl.json)"   # 带 ddl_code + activate
# 接口入参结构：CreateStructure 一步建好（fields 用 data_element 引用数据元素，优先于 data_type/data_length）
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/call-adt-tool.js CreateStructure "$(cat /tmp/stru.json)"
#   {"structure_name":"ZSXXX_HEAD","description":"接口-传入结构","package_name":"ZFICO",
#    "transport_request":"DEVK900006","activate":true,
#    "fields":[{"name":"ZBPMLCH","data_element":"ZEZLCBM","description":"BPM付款流程号"}, ...]}
#   描述含中文 ⇒ 必须走文件；建完核 TADIR.MASTERLANG=1（ZH）。实测 2026-09-24 一次通过。
#   结构外层字段描述不必给（引用数据元素的字段 SE11 自动显示数据元素短文本）；
#   预定义类型字段要中文列标题才写 @EndUserText.label，见 [`references/field-modeling.md`](references/field-modeling.md)。
```

- **含中文的参数一律走文件**：`node scripts/call-adt-tool.js <Tool> "$(cat /tmp/xxx.json)"`
  —— `call-adt-tool.js` **不解析 `@` 前缀**（`@/tmp/x.json` 只会被当字面量 JSON，解析失败）；
  用 shell 命令替换把文件内容灌进 argv。实测 2026-10-16 建 `ZSFIAIAB_MOUNT_IN` 一次通过。
- 数据元素参数名分两套：`CreateDataElement` 用 `short_label/medium_label/long_label/heading_label`；
  `UpdateDataElement` 用 `field_label_short/…`；`type_kind` 取值 `domain` | `predefinedAbapType` | …
- **枚举/代码型字段才配 ZD 域**，文本/日期/金额一律 `predefinedAbapType`（用户口径）。
- 表 DDL 形态照抄 `ZTFI0002`：`@EndUserText.label` + `@AbapCatalog.*` 注解、
  `key mandt : mandt not null;` 起头、**末尾 `include zscomm_log;`**（时间戳结构，包 ZGL）。
- **DDL 要求 key 字段连续**：FS 里主键字段若散落，必须把 key 提前到主键组。

## 2. 验证 SQL（`node scripts/adt.js query "<SQL>"`）

```sql
SELECT obj_name, masterlang, devclass FROM tadir WHERE obj_name IN (...)   -- 1=ZH，E=英文
SELECT fieldname, position, keyflag, rollname FROM dd03l WHERE tabname='ZTFI000x' AND as4local='A' ORDER BY position
SELECT rollname, domname, datatype, leng, decimals FROM dd04l WHERE rollname LIKE 'ZE%' AND as4local='A'
```
坑：`IN (...)` 列表过长会撞 255 字符文本上限，改用 `as4date` / `LIKE` 过滤。
SQL 不支持 JOIN（报「仅允许一个 SELECT 语句」）、字段名写错直接 400。

## 3. 卡住时怎么办

| 症状 | 处理 |
|---|---|
| `socket hang up` / `ECONNRESET` / `CSRF 令牌验证失败` | 剥代理重试；同一操作重试通常即通。**但连续多次 CSRF 失败要怀疑真锁**（MCP 把 LOCK 的 403 也翻成这句）—— 用 `ZTEST_ENQ_SHOW` 看 `ESDICT / TABL<表名>` |
| DDIC 对象被 ADT 锁住（`ESDICT` 锁对象，参数 `TABL<表名>`） | **首选：请用户在 SM12 手动删除该锁条目，删完立刻重跑原命令即可激活**（实测 ZTEPICD 一次通过）。锁挂在 ADT 会话上，ABAP 侧解不掉：`ZDEQ_LOCK`(DEQUEUE_ALL) / `ZDEQ3`(_scope='3') / 带旧 lockHandle 的 UNLOCK **都无效**；`DEQUEUE_ESDICT` 用对参数（`OBJTYPE='TABL'`/`OBJNAME=<表名>`，**不是 `TABNAME`**，传错报 "Function parameter TABNAME is unknown"）后能跑通并回 `done`，**但锁依然不释放**——只能删掉这条死路尝试，别再反复试。次选：等 ADT 会话超时（约 30 min）。期间先把没锁的对象做完 |
| 清完锁重跑建表脚本，`create` 仍报 `CSRF 令牌验证失败` | **正常现象**，不是又被锁了：inactive 对象已存在时 `CreateTable` 必然失败。**判定依据是紧随其后的 `update+activate` 返回的 `"activated":true`** |
| 「使用者 X 当前编辑 OBJ」（真锁） | 先 `ZLOCK_LIST` / `ZTEST_ENQ_SHOW`（$TMP 程序，读 `SEQG3`/`SEQG4`）确认锁对象技术名与建立时间。**锁对象技术名不等于 `E_xxx`**：程序 include 的锁是 **`ESRDIRE`**（不是 `E_TRDIR`）。**`DEQUEUE_*` 加 `_scope='3'` 也解不掉别人会话的锁** —— 别在这上面耗时间，找持有者或等超时 |
| MCP `UpdateDataElement` 报「… is locked by another user or session」 | **ZH 环境下大概率是假锁**。`GetInactiveObjects` 里若没有该对象，说明连写都没写进去。真因：handler 先跑 `validate`（`POST /sap/bc/adt/ddic/dataelements/validation`），对**已存在**对象返 **400**，而 `isAlreadyExistsError()` **只认英文 `already exists`**，中文消息判不出就上抛，再撞上 handler「403 一律译成被锁」的兜底。**结论：ZH 环境 MCP 改不了已存在的数据元素**，改走 `adt_ddic.js` 直连或先删重建。`UpdateDomain` 无此前置不受影响。验证：`adt_ddic.js probe dtel <名>`，或直接打 `POST /sap/bc/adt/ddic/dataelements/validation` 看真实响应（末位带 `sap-language: EN` 可对比中英文消息） |
| 部分列 SELECT 取回来全空（行数对、字段空） | **`SELECT 列1,列2 … INTO TABLE @<结构表>` 是按「位置」赋值，不是按字段名**。拿 `dd07t` 整行类型接 `domvalue_l, ddtext`，值会落进前两个字段 `DOMNAME`/`DDLANGUAGE`。**不报错不告警**，只有事后取数才发现。修法：自建只含所需列、顺序与 SELECT 列表一致的结构（或 `INTO CORRESPONDING FIELDS OF`） |
| DDIC 对象激活失败，报 include 里的旧字段 | 见 [`references/structure-ops.md`](references/structure-ops.md) 的「删字段的连带检查」，推送用 `scripts/push_include_source.js` |
| DELETE 报 `Parameter corrNr could not be found` | 补 `?corrNr=<请求号>`；能报这个说明锁已放开，是好事 |
| 需要直连诊断/强删 | `node scripts/adt_ddic.js probe\|unlock\|delete\|activate dtel\|doma\|tabl 名称` |
| 表/数据元素被删了，要恢复 | 系统内无残留可挖，**找原系统 abapGit XML**；只能靠 `DD03L` 逐字段重建，见 [`references/create-table.md`](references/create-table.md) |
| 新建表激活报 Annotation / deliveryClass | 见 [`references/create-table.md`](references/create-table.md) |
| 激活表报 `[E] 维护和保存 <表> 的技术设置` | 表壳没有 DD09L（手工/半途建的表）→ 见 [`references/create-table.md`](references/create-table.md)，**`DeleteTable` 后用 `CreateTable` 重建**，别去补 DD09L |
| 数据元素建了一半就断（`DD04L.AS4LOCAL='L'`、`DATATYPE`/`LENG` 全空） | 创建被中断留下的半成品。此后 `CreateDataElement` 报 `CSRF 令牌验证失败`、`UpdateDataElement` 报「locked by another user」**都解不掉**（`ENQUEUE_READ` 探针证明无真锁，是 403 被 MCP 翻译）→ **`DeleteDataElement` 删掉重建即通** |
| `CreateDataElement` 报「位置的数量 < 数据类型 256 的最小数量 (STRING)」 | `STRING` 不能用 `predefinedAbapType`。改 `type_kind='domain'` + `type_name='STRING'`（见 [`references/field-modeling.md`](references/field-modeling.md)）。半成品 SAP 会自动删，直接重跑 |
| 报表（ALV）列标题一片空白，或 SE11 里字段没描述 | 表字段用了**匿名内置类型**（`DD03T` 文本全空）。治本 = 字段改挂数据元素；应急 = 报表里手写 `SELTEXT_L/M/S`。详见 [`references/field-modeling.md`](references/field-modeling.md) |
| 给已有表补挂数据元素，怕改坏数据 | 只换 `ROLLNAME`、**类型与长度保持逐字相同** ⇒ `UpdateTable` 不触发透明表转换，数据无损（`ZIFLOG` 实测）。改后务必逐字段比对 `DD03L` |
| 批量建对象跑到一半被 SIGTERM 掐断（约 2 分钟） | 沙箱超时。**建对象脚本必须支持按名过滤分批跑**，每批 ≤8 个（范式见 §4 范式一，子命令 `dtel <名...>`）；断了先查有没有留半成品对象与 `ESDICT` 锁 |
| 想核字段的 `LOWERCASE` 标志 | `DD03L` 的 ADT 视图**不暴露**该列（报 *Unknown column name "LOWERCASE"*），且 **ADT DDL 没有字段级 lowercase 语法** ⇒ 从外部字典照搬的表，`lowercase='X'` 这一项复刻不了（票据号这类纯数字/编号字段无功能影响，交付里注明即可；真要加只能 SE11 手工勾） |

ADT 直连请求头（照抄 `@mcp-abap-adt/adt-clients/dist/constants/contentTypes.js`）：
- `LOCK` 的 Accept：`application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result;q=0.8, application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result2;q=0.9`
- DDIC 对象 `GET` 只认 `Accept: */*`（`application/xml` → 406）

## 4. 建对象脚本：给范式，缺哪个自己写

仓库 `scripts/` 只收**跨项目通用**的工具（`adt.js` / `adt_ddic.js` / `push_*.js` / `gen_cua.js` / `gen_e2e_harness.js`，清单见 `scripts/README.md`）。

DDIC 建对象脚本**天生是项目私有**的：字段矩阵、包名、请求号、对象名全是甲方的，收进仓库对别人没用。
所以这里不给现成脚本，只给四种范式的骨架 —— **改顶部常量即可复用**。

### 范式一：从零建一组对象（域 → 数据元素 → 表）

```js
// 1) 对象清单写成纯数据，脚本只留执行逻辑
const DOMAINS = [{ name:'ZDXXX', desc:'…', type:'CHAR', len:10,
                   values:[{ low:'A', text:'…' }] }];
const DTELS   = [{ name:'ZEXXX', desc:'…', dom:'ZDXXX' }];        // 或 { type:'CHAR', len:10 }
const TABLES  = [{ name:'ZTXXX', desc:'…', fields:[ /* [字段名, 元素名, 中文描述] */ ] }];

// 2) 子命令拆开，且支持按名过滤（沙箱 2 分钟会掐断，必须能分批）
//    node mk.js d / dt ZEXXX ZEYYY / tb / all

// 3) 每个对象：CreateXxx(activate:true) → 回读核 TADIR.MASTERLANG=1（ZH）
// 4) 表：CreateTable 建壳 → UpdateTable 全量 DDL + activate
```

自检三条（每条都踩过）：

- 字段**一律挂数据元素**，不写 `abap.char(1)` 这类匿名类型（见 §1 的对照表：否则 `DD03T` 文本全空、ALV 列标题一片空白）；
- `STRING` 走**域 `STRING`**（`type_kind='domain'`），不是 `predefinedAbapType`；
- 每批 **≤ 8 个对象**，跑完核 `E071`（见文末「传输请求登记」）。

### 范式二：按外部字典复刻表 / 给已有表追加字段

数据结构就是一张字段矩阵，四列够用：`[字段名, 数据元素或类型, 中文描述, 是否主键]`。
四个子命令分工固定，**别合成一个**：

| 子命令 | 做什么 | 为什么必须分开 |
|---|---|---|
| `ddl` | 只在本地生成 DDL 并打印，不写系统 | 先看 DDL 再建，能省一整轮激活排错 |
| `dtel` | 只建缺失的数据元素，支持按名过滤 | 超时必须能分批续跑 |
| `table` | 取现网 DDL → 锚点插入 → `UpdateTable` | 改字段必须基于现网 DDL，不能凭记忆重写 |
| `verify` | 逐字段比对 `DD03L` vs 矩阵 | 位置/类型/小数错位**不报错**，只能主动比 |

从 abapGit XML 还原表是同一范式的另一个入口：解析 `DD02V`（表属性）+ 每个 `DD03P`
（`POSITION/KEYFLAG/ROLLNAME/DATATYPE/LENG/DECIMALS`）→ 生成 DDL（字段序按 `POSITION`，
主键前置并 `not null`，类型统一用 `ROLLNAME`）→ 走 `table`。

### 范式三：结构改造（加组件 / 补字段文本 / 改字段名）

只有一条路，三步：

```
GetStructure 取现网 DDL
  → 备份 backup/<对象>_<阶段>.ddl
  → 锚点替换（插字段行 / 加 @EndUserText.label / 改字段名）
  → UpdateStructure { structure_name, ddl_code, transport_request, activate }
  → 回读 dd03l 逐字段比对（位置号连续、类型未变）
```

- 备份后缀**必须逐轮不同**（`_nest` / `_labels` / `_v11`）。同后缀会静默覆盖基线 —— 改造前的 DDL 丢了就没法回退。
- **`UpdateTable` 对结构无效**（`Resource controller does not support method PUT`），结构只能 `UpdateStructure`。
- 字段改名的连带：引用方（FM 形参、调用程序）一起改，改完重推重跑。

### 范式四：删对象

- 先查引用（`DD03L.ROLLNAME` / `DD40L.ROWTYPE`，含 `.INCLUDE` 行），再按**依赖逆序**删。
- 每批 **≤ 2 个**（`call-adt-tool.js` 每次冷启 MCP 约 30~40 秒）。
- 验证不能看 `TADIR`（删除后仍留 `DELFLAG='X'`），看 `DD02L` / `DD40L` / `DD04L`。

### 判据：什么时候该写脚本

| 情况 | 做法 |
|---|---|
| 一次性、≤3 个对象 | 直接用 `call-adt-tool.js` 单调用，别写脚本 |
| 同一套字段要做 3 遍以上（多环境 / 多轮改造） | 写脚本，字段矩阵进常量 |
| 要重跑、要幂等、要能分批 | 写脚本，子命令拆开 |
| 只改一个字段 | `GetStructure` → 手改 DDL → `UpdateStructure` |

### 仓库里已有的、这份技能会用到的

- `scripts/adt_ddic.js` — 直连诊断单个对象：`probe|unlock|delete|activate dtel|doma|tabl <名>`（绕开 MCP 的假锁提示）
- `scripts/adt.js` — `query|table|run|dumps|dump`，验证 SQL 全走它
- `scripts/push_table_ddl.js` — 推表 DDL
- `scripts/push_include_source.js` — 推函数组 include（`SRC_FILE` / `GROUP_NAME` / `INCLUDE_NAME` / `SAP_CLIENT_OVERRIDE`）
- `scripts/push_prog_source.js` — 推可执行报表（见技能 `sap-abap-prog-push-run`）
- `$TMP` 程序（自己建）：`ZLOCK_LIST`（列锁）、`ZDEQ_LOCK`（DEQUEUE_ALL）、`ZTEST_ENQ_SHOW`（印锁明细）

**ADT 写链路的两个必备请求头**（缺一个就会 423 `invalid lock handle`）：
`sap-adt-connectionid`（全程同一个 UUID）+ **`x-sap-adt-sessiontype: stateful`**。
LOCK 的 handle 在**响应正文** `<LOCK_HANDLE>` 里，**不在响应头**（写成响应头会误判加锁失败）。

---
