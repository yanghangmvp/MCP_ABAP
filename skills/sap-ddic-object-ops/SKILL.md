---
name: sap-ddic-object-ops
description: 通过 ADT/MCP 通道在 SAP 创建与维护 DDIC 对象（域 / 数据元素 / 表 / 结构 / 表类型），含必踩的坑：对象主语言被强制成 EN、写请求 socket hang up、MCP 把 403 误报成「locked by another user」或 CSRF 失败（多为假锁）、建表必须 CreateTable 建壳再用 UpdateTable 填字段、CURR 字段在无币种字段的表里建不出来、字段文本 DD03T 要逐字段 @EndUserText.label、结构内嵌表类型组件实现嵌套返回、新建对象的传输请求 E071 核验与补登（R3TR TTYP 会被静默丢弃）。当需要建表/建数据元素/改结构、补字段文本、发现对象 MASTERLANG=E、排查 MCP 报锁或 CSRF 或 ECONNRESET、或对象建不进传输时加载。
agent_created: true
---

# SAP DDIC 对象操作（ADT / MCP 通道）

适用项目：示例客户 SAP ERP（`~/ABAP-AI`，系统 DEV，客户端 100，用户 devuser）。

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
#   预定义类型字段要中文列标题才写 @EndUserText.label，见下文「结构字段文本」。
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

### 建表的正确起点：CreateTable 建壳 → UpdateTable 填字段（2026-09-29 定案）

**必须用 `CreateTable`（空壳）起头**，它落地时**顺手建好 DD09L 技术设置**；
`UpdateTable` 只负责写 DDL + 激活。步骤与验证：

```bash
node scripts/call-adt-tool.js CreateTable '{"table_name":"ZTEPIC07","description":"票据信息表","package_name":"ZFICO","transport_request":"DEVK900006"}'
node scripts/call-adt-tool.js UpdateTable "$(cat /tmp/xxx_update.json)"   # 完整 DDL + activate:true
# 验证：DD02L.AS4LOCAL='A' / DD09L 有行且与同族表一致 / TADIR.MASTERLANG=1
#   SELECT tabname, as4local, tabkat, tabart, pufferung, protokoll FROM dd09l WHERE tabname IN ('ZTEPIC01','ZTEPIC07')
```

**手工（或半途）建出来的表壳没有 DD09L 技术设置**，激活必报 `[E] 维护和保存 <表> 的技术设置`。
此时**不要去打补丁**：

- `GetTableTechnicalSettings` 报 *Table X has no technical settings object*
- `SetTableTechnicalSettings` 报 **404 + `从数据库导入对象 X 时出错`**（表没有激活版本，ADT 的设置资源根本读不出来，且 handler 先 GET 后 PUT，连写的机会都没有）
- `DDIF_TABT_PUT/DDIF_TABT_ACTIVATE`（$TMP 调 DDIC API 硬写 DD09L）能绕过，但要手填 `DD09V`、还和 DDL 源混用，**不推荐**

⇒ **正解：`DeleteTable` → `CreateTable` → `UpdateTable`**（表无数据、无引用时零风险；重建后 `TADIR`/`E071` 自动回到同一包与同一任务下）。

### S/4 建表的两个硬校验（激活直接取消，不是警告）

1. **`@AbapCatalog.deliveryClass` 必填** —— 缺了报
   `Mandatory annotation "AbapCatalog.deliveryClass" for structure X is missing`。
   原表 `DD02V-CONTFLAG` 是空白的，看 abapGit XML 也看不出该填什么；自建业务数据表取 **`#A`**。
2. **CURR 字段必须带币种引用**：`@Semantics.amount.currencyCode : '表名.币种字段'`，
   且被引用的 CUKY 字段必须在**同一张表内**，否则报
   `Annotation with reference to currency code for field X is missing`。
   **表里没有币种字段时 CURR 根本建不出来** —— 改用**同长度** `abap.dec( n, d )`
   （ABAP 层同为 P 类型、长度小数一致，程序读写零差别，只是 DDIC 少了币种语义）。
   ECC 老系统无此校验，从原系统照搬的旧表定义最容易撞上这一条。
   **引用标准 CURR 数据元素同样被拦**（`zpjje : awkgr;` → 同一条报错），不是只有 `abap.curr(...)` 会撞；
   反过来说，只要表内真有 CUKY 字段，引用 CURR 数据元素才是首选写法（见 `ZTEPIC01` 的 `zfkje : dbtrg;` 配 `waers`）。
   字典里写了 CURR 但表内无币种字段 ⇒ 直接降级 `abap.dec(n,d)` 并在交付里说明（ZTEPIC02、ZTEPIC07 先例）。
3. **激活报「无法生成表 X 的名称表」(D0 408) —— 头号原因是 DDL 引用了不存在的数据元素**
   （或域）。报错文案完全不提示是哪个字段，必须自己找：
   - 用 `adt_ddic.js probe dtel <名>` 逐个核（不存在返回 **404「从数据库导入对象 <名> 时出错」**）；
   - 批量：`grep -oE ': [a-z_][a-z0-9_]*( not null)?;' DDL.txt | sed -E 's/: //; s/( not null)?;//' | tr a-z A-Z | sort -u`
     与 `SELECT rollname FROM dd04l WHERE as4local='A'` 的结果 `comm -23` 对比；
   - **二分法最快**：保留主键 + 按顺序递增非主键字段，逐个 `UpdateTable`，第一个 FAIL 的 n 就指向坏字段
     （`/tmp/ztepicbcde/bisect.js` 是现成模板）。本次实测 n=1 即命中。
   - 参考：**主键长度 >120 只是 WARNING**（`activation_warnings` 里会出现「键值长度 > 120（受限功能）」），
     不是失败原因。真正的硬上限是 **255**（≤16 个主键字段、键长 ≤255、字段总长 ≤1962）。

### 从原系统 abapGit XML 还原表（DDIC 已被删时唯一的救法）

DDIC 表被删后 **没有任何系统内痕迹可挖**：`DD02L`/`DD03L`（含未激活版本）、`DDDDLSRC`(DDL 源)、
`VRSD`(版本管理)、`D010TAB`(程序引用) 全部为空，物理表也已 DROP（可用 ADBC 查 `SYS.TABLES` 复核），
`TADIR` 只剩 `DELFLAG='X'`。**唯一出路是从原/源系统导 abapGit XML**：

```bash
# 1) 解析 .tabl.xml（DD02V = 表属性；每个 DD03P = 一个字段：POSITION/KEYFLAG/ROLLNAME/DATATYPE/LENG/DECIMALS）
#    生成 DDL：字段顺序按 POSITION，主键字段前置并加 not null，类型统一用 ROLLNAME（数据元素）
# 2) 先核对所有 ROLLNAME 是否在本系统存在：
#    SELECT rollname, datatype, leng, decimals FROM dd04l WHERE rollname LIKE 'Z%'   # 一次拉全量再本地比对
#    注意 XML 里的 DATATYPE/LENG/DECIMALS 是**表字段**的实际值，
#    可能与该数据元素在本系统的定义不一致（本次就撞到 ZBCSQFKJE：原系统 CURR13,2 / 本系统错建成 CHAR13）
# 3) CreateTable → UpdateTable(activate=true)，见 scripts/recreate_ztepic_tables.js
# 4) 验证：逐字段比对 dd03l vs XML（位置/主键/ROLLNAME/类型/长度/小数），并 SELECT COUNT(*) 试读
```

- 表名在 `TADIR` 带删标记不影响新建 —— `CreateTable` 会把删标记清掉，`MASTERLANG` 正确落 1(ZH)。
- 若对象上一轮已建过一半（inactive），**`CreateTable` 会报 CSRF/已存在，但 `UpdateTable` 照样能落地激活** → 脚本里 create 失败要**继续**走 update。

### 域 / 数据元素：把「状态码 + 描述」交给域管（推荐范式）

状态码类字段**不要在程序里写死**，值的唯一来源是域的固定值，程序运行时从 `DD07T` 读：

```bash
# 1) 建域（含固定值）；CreateDomain 需要 package_name，activate:true 一步到位
node scripts/call-adt-tool.js CreateDomain "$(cat /tmp/doma.json)"
#   {"domain_name":"ZDFKZT","description":"付款状态","package_name":"ZFICO",
#    "transport_request":"DEVK900006","datatype":"CHAR","length":15,"decimals":0,
#    "activate":true,"fixed_values":[{"low":"a","text":"待提交直联"}, ...]}
#   注意：域值会被存成**大写**（A~Q），CHAR 域默认大小写不敏感
# 2) 补/改固定值：UpdateDomain 的 fixed_values 是**整块替换**，必须传全量；同样要 package_name
node scripts/call-adt-tool.js UpdateDomain "$(cat /tmp/doma_fv.json)"
# 3) 回读校验
node scripts/adt.js query "SELECT domname, valpos, domvalue_l, ddtext FROM dd07t \
  WHERE domname LIKE 'ZDDJZT' OR domname LIKE 'ZDFKZT'"
```

**长度怎么定**：域长度要与目标数据元素对齐（如 `ZSFKZT` 是 CHAR(15) → 域建 CHAR(15)），
这样挂域后**表字段长度不变、不用改表**。`UpdateDataElement` 完事后再核一次 `DD03L`。

**程序侧读法**（`ABAP`，放进 `INITIALIZATION`）：

```abap
" ★ 必须限 as4local='A'（否则取到非激活行） + ORDER BY valpos（否则 1,10,11,2… 字典序）
" ★ 必须用**自建结构**接，不能直接拿 dd07t 整行类型 —— 见下面第 3 节「部分列 SELECT」的坑
SELECT domvalue_l, ddtext
  FROM dd07t
  WHERE domname    = 'ZDDJZT'
    AND ddlanguage = @sy-langu
    AND as4local   = 'A'
  ORDER BY valpos
  INTO TABLE @lt_domval.
" 登录语言没维护文本时退回域主语言（DD01L-DOMMASTER，注意字段名叫 DOMMASTER 不是 MASTERLANG）
IF lt_domval IS INITIAL.
  SELECT SINGLE dommaster FROM dd01l WHERE domname='ZDDJZT' AND as4local='A' INTO @lv_masterlang.
  SELECT domvalue_l, ddtext FROM dd07t
    WHERE domname='ZDDJZT' AND ddlanguage=@lv_masterlang AND as4local='A'
    ORDER BY valpos INTO TABLE @lt_domval.
ENDIF.
```

业务规则里用到的码值抽成 `CONSTANTS`（如 `c_djzt_preparing VALUE '1'`），与域值保持一致；
规则本身属 FS 逻辑不动。**不要试图一眼不落地全参数化** —— 域是值域的真源，规则是真源的引用点。

### ADBC 取证：直接查 HANA 系统视图（绕过 DDIC）

```abap
" $TMP ZZTEST_TAB_META —— 只读，无选择屏幕，adt.js run 可直接跑
lo_con  = cl_sql_connection=>get_connection( ).
lo_stmt = lo_con->create_statement( ).            " cl_sql_statement=>create( ) 不存在
lo_res  = lo_stmt->execute_query( `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE_NAME, LENGTH, SCALE, POSITION FROM SYS.TABLE_COLUMNS WHERE ...` ).
lo_res->set_param_table( lr_tab ).  lo_res->next_package( ).
```
- `next_package( )` **不要传参数**（`package_size` / `row_count` 在这个系统上都不认，报 "formal parameter does not exist"）。
- **statement / connection 的 `close( )` 在这个系统上不存在**（报 `Method "CLOSE" is unknown`）—— 去掉才能激活；读完用 `lv_cnt = lines( lt )` 自己数行。
- 报错会**连锁**：只要一个方法签名不对，后面所有方法都跟着报 unknown，别被后面的假报错带偏。

### 改结构：删/加字段（`UpdateStructure`）

```bash
# 1) 取当前 DDL 备份（结构变更前必做）
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/call-adt-tool.js GetStructure '{"structure_name":"ZSFII003_H"}'
# 2) 用脚本删掉目标字段行，产出新 DDL，封装参数文件
# 3) 提交（activate=true 一步到位）
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/call-adt-tool.js UpdateStructure "$(cat /tmp/xxx_update.json)"
#    参数：{structure_name, ddl_code, transport_request, activate}
```

**`transport_request` 必须传「请求号」，不能传它下面的「任务号」。** 传错会被 SAP 拒成
「对象已被 <请求号> 锁住」，看着像死锁其实是参数问题。
父子关系查 `E070-STRKORR`：`SELECT trkorr, trfunction, strkorr FROM e070 WHERE trkorr IN (...)`，
`trfunction` 为 `K`/`S` 的是请求，`strkorr` 指向父请求的那个是任务。
先查 `E071`（对象挂哪个号）容易误导——`E071` 里出现的可能是**任务号**。

### 结构内嵌表类型组件（实现接口「行包含在抬头里」的嵌套返回）

对接方要求返回体像 `ZBPM_ISP005` 那样——**行项目挂在抬头结构里、计划行挂在行项目里**，
一个出参 `ET_DATA` 就是一棵树。DDIC 侧只需给结构**追加一个 TTYP 类型组件**：

```ddl
define structure zbpm_isp014_head_s {
  vbeln : vbeln_va;
  ...
  item  : zbpm_isp014_item_t;   // ← 组件类型写成「表类型名」，小写
}
define structure zbpm_isp014_item_s {
  vbeln : vbeln_va;
  posnr : posnr_va;
  ...
  sched : zbpm_isp014_sched_t;  // ← 行项目里再嵌一层
}
```

- **合法且无循环**：链式引用 `HEAD_S → ITEM_T → ITEM_S → SCHED_T → SCHED_S` 是单向的；
  ABAP 侧直接 `APPEND ls_item TO ls_head-item.` / `APPEND ls_sched TO ls_item-sched.`，
  `lines( ls_head-item )` 取值，无需手工定义嵌套类型。
- **通道与改字段完全相同**：`UpdateStructure` 传**完整 DDL**（保留原有全部字段，
  末尾追加该组件）→ `{structure_name, ddl_code, transport_request, activate}`，往返 `activated:true`。
  TTYP（`ZBPM_ISP014_ITEM_T`）必须**先用 `CreateTableType` 建好**，否则激活报找不到类型。
- **备份命名要换后缀**：同一结构做多轮改造时，若沿用 `${名称}_${日期}.ddl` 会**静默覆盖**改造前的
  基线 DDL（本次差点丢 `HEAD_S` 加组件前的版本）。范式：`backup/${n}_20260929${suffix}.ddl`，
  首次加组件传 `_nest`，见 `scripts/create_isp014_objects.js` 的 `stepFixOut(suffix = '')`。
- **验证组件确实落库**（`dd03l`）：
  ```sql
  SELECT tabname, fieldname, position, rollname, datatype
    FROM dd03l
   WHERE tabname IN ('ZBPM_ISP014_HEAD_S','ZBPM_ISP014_ITEM_S') AND datatype = 'TTYP'
  ```
  实测返回 `HEAD_S / ITEM / 0059 / ZBPM_ISP014_ITEM_T`、`ITEM_S / SCHED / 0047 / ZBPM_ISP014_SCHED_T`。
- ★ **子结构不冗余存放父键**（`ZBPM_ISP014` 2026-10-09 确立）：行项目结构不放 `VBELN`、计划行结构不放 `VBELN`/`POSNR`，归属由层级本身表达。**连带的实现约束**：子结构缺父键 ⇒ 扁平行项目表无法在 FORM 间归位，而自定义「带父键工作结构」又要放**函数组 TOP**（FORM 形参类型跨 FORM 不可见）⇒ 正解是**查询时就地嵌入**：`APPEND INITIAL LINE TO <fs_head>-item ASSIGNING <fs_item>` + `MOVE-CORRESPONDING`，父键直接读 `<fs_head>-vbeln`；跨结构落库（`vbep` → `SCHED_S`）必须 `MOVE-CORRESPONDING` 中转，**`APPEND <不同结构> TO <内表>` 类型不兼容**。副作用：整个「组装 FORM」可删，耗时反而下降。
- 出参用**表类型**（`VALUE(et_data) TYPE zbpm_isp014_head_t`），函数体内一次性组装好整棵树再返回。
- **中间件消化能力需确认**：结构内含内表，RFC 序列化后是嵌套 JSON；对接方中间件不一定能吃。
  交付时在报告里列为待确认项。

### 结构字段文本（`DD03T`）补齐

S/4 里结构的字段描述**不能**靠 `CreateStructure` / `UpdateStructure` 的 `description` 传入（被静默丢弃），唯一程序化路径是在 DDL 里**逐字段**写 `@EndUserText.label`，再 `UpdateStructure`：

```ddl
@EndUserText.label : '销售订单查询接口-抬头'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
define structure zbpm_isp014_head_s {
  @EndUserText.label : '销售凭证'
  vbeln : vbeln;
  @EndUserText.label : '项目名称'
  zprjmc : abap.string(0);
}
```

- ★ **哪些字段真会落 `DD03T`**：只有**预定义类型**字段（`abap.string` / `abap.dec(l,d)` 等）。
  **引用数据元素**的字段在 SE11 里自动显示数据元素短文本，**不落 `DD03T`**；
  **嵌套组件（`STRU`/`TTYP`）写了也是白写**（`dd03t` 根本不生成记录）—— 别去 SE11 手补。
  推论：`DD03T` 默认只有预定义类型字段的记录，且 `DDTEXT` **默认为空**，正是「缺文本」的真凶。
- **收口判据**：`DD03T` 中该结构每行的 `DDTEXT` 非空，且条数 = `DD03L` 里预定义类型字段的条数
  （数据元素引用字段与 TTYP 组件不计入）。
- **一次性写法**照 `scripts/create_isp014_objects.js` 的 **`labels` 模式**：
  `buildDdl` 在字段行上方按字段矩阵第三列（中文描述）生成 label；`stepFixInput` 同理处理入参结构
  （入参字段是表类型引用，同样逐字段写 label）。备份后缀用 `_labels`，别覆盖其他阶段的备份。
- 实测（`ZBPM_ISP014`）：4 个结构一轮过，26 条 `DDTEXT` 由空变有值，
  **字段集与位置零变化**（`HEAD_S` 59 / `ITEM_S` 46 / `SCHED_S` 4 / `INPUT` 9）。
- 查现况：`SELECT * FROM dd03t WHERE tabname LIKE 'ZXXX%'`（列名会被 ADT 裁剪，必须 `SELECT *`）。

### 给已有透明表追加字段（`UpdateTable`，比 UpdateStructure 更顺手）

实体表的字段增删直接改**全量 DDL** 后 `UpdateTable` 一把过（`activate=true`）：

```bash
# 1) 取当前 DDL 并备份
node scripts/call-adt-tool.js GetStructure '{"structure_name":"ZTEPIC01"}'   # 存 backup/<表>_<日期>.ddl
# 2) 在锚点 include zscomm_log; 「之前」插入新字段行（include 保持收尾，本项目惯例）
# 3) 提交
node scripts/call-adt-tool.js UpdateTable "$(cat /tmp/xxx_update.json)"   # {table_name, ddl_code, transport_request, activate}
#    成功标志：activated:true + steps_completed 六步
#    ["lock","check_new_code","update","unlock","check_inactive","activate"]
# 4) 复核（位置号连续；include 的 CRDAT…UPD_TMSTMP 顺延到表尾）
#    SELECT fieldname, position, rollname, datatype, leng, decimals FROM dd03l
#     WHERE tabname = 'ZTEPIC01' AND position >= '0055'
```

**字段建模口径（2026-09-17 实操确立）**：**字段名 = 数据元素名**，数据元素一律 `predefinedAbapType`（`data_type` + `length` + `decimals`），**不配 ZD 域**（无值集时不造域；本表 ZZCKP/ZPJH/ZPJZT 是既有先例）。
先批量建数据元素（`CreateDataElement`，带 `short_label`/`medium_label`… 中文标签），再改表 DDL。
- ★ **DDIC 里不写 FM 前缀**（用户 2026-10-16 明确）：结构/表字段名不带 `IV_` / `EV_` / `IS_` / `ES_` / `IT_` / `ET_`。
  这些前缀只在 ABAP 形参上表达方向，进字典就是噪声。例：`ZSFIAIAB_MOUNT_IN` 的字段是
  `BUKRS / ANLN1 / ANLN2 / GJAHR / LNRAN / APROF`，**不是** `IV_BUKRS / IV_ANLN1 …`。
  已建错的补救：`GetStructure` 取 DDL → 改字段名 → `UpdateStructure` 传全量 DDL 重命名（结构无数据，零风险，六步全过）；
  连带把引用方（FM 形参引用、调用程序）一起改，改完必须重推重跑。
- **`CHAR(1000)` 在 S/4 下可建、可激活**，不必退成 255（DD04L 复核 `LENG=001000`）。
- ★ **`STRING` 类型不能走 `predefinedAbapType`**：传 `data_type='STRING'` 会报
  `位置的数量 < 数据类型 256 的最小数量 (STRING)`（半成品被 SAP 自动清掉）。
  **项目口径是引用名为 `STRING` 的域**：`type_kind='domain'` + `type_name='STRING'`
  —— 与 `ZEREQUEST` / `ZERESPONSE` 完全同款（`DD04L` 里 `DOMNAME=STRING` / `DATATYPE=STRG` / `LENG=0`）。
  建 STRING 数据元素前先 `SELECT domname FROM dd04l WHERE rollname='ZEREQUEST'` 抄口径。

★ **建表时字段一律挂数据元素，不许写匿名内置类型**（`ZIFLOG` 2026-10-12 教训）：

| 用匿名内置类型（`abap.char(1)` / `abap.string(0)`）| 挂数据元素（`zeiftype` / `zerequest`）|
|---|---|
| `DD03T` 生成 **7 条文本全空的记录**，SE11 里只有技术名 | `DD03T` **0 行**（正常），SE11 自动显示数据元素短文本 |
| 任何按 DDIC 文本取列标题的报表（`REUSE_ALV_FIELDCATALOG_MERGE`）**列标题一片空白** | 列标题自动有中文 |
| 语义只写在字段名里，谁都不知道 `IFTYPE` 的 `O`/`I` 是什么意思 | 域 `ZDIFTYPE` 带固定值 `O`=出向 / `I`=入向，可直接查 `DD07T` |

**给已有表补挂数据元素的做法（零风险，不触发透明表转换）**：只换 `ROLLNAME`、**类型与长度保持逐字相同**，
`UpdateTable` 一把过（实测 `ZIFLOG` 六步全过、6 行数据无损）。步骤：
① 先摸清每个字段要挂哪个元素——**优先复用**，项目里现成的先例表往往已经齐了
（接口日志类可看 `ZTREST_LOG` / `ZTFI0014` / `ZTFI0015`；平台日志看 `ZGSP_1C010`）；
② 确实没有的才新建（枚举型配 ZD 域）；
③ 改前 `GetStructure` 备份 DDL，改后逐字段比对 `DD03L` 确认类型未变。
现成脚本 `scripts/create_ziflog_dtel.js`（`ddl` / `dd [名字...]` / `table` 三模式）。

**复用现成元素时"字段名 = 数据元素名"可以放开**：`ZTREST_LOG.MSGTY` 挂 `MSGTY`、`ZTFI0014.MSGTY` 挂 `ZCIS_MSGTY`，
字段名与元素名不一致是常态。这条口径只约束**新建**字段时别造同名不同义的乱象。
- 复核数据元素主语言：`SELECT obj_name, masterlang, devclass FROM tadir WHERE obj_name IN (...)`，应为 `1`(ZH)、`ZFICO`。
- 现成脚本 `scripts/add_ztepic01_fields.js`（`dtel` / `table` / `verify` 三模式）——改顶部 `FIELDS` 数组即可复用到别的表。

### 删字段的连带检查（血泪）

删完必须验三处，否则函数组激活会失败：

1. **接口源码**是否引用了被删字段（`grep` 本地 + `GetInclude` 拉远端对照）；
2. **底表 DDL** 是否有同名列；
3. **函数组 include 的残留 FORM** —— 这次的真凶：`LZFG_BPM002F01` 里有 4 处
   `is_head-partner` 活引用，来自两个从别的模块（SD `ZBPM_ISP007`）复制过来的 FORM，
   **在本函数组内没有任何调用方，却参与编译**。改法：注释停用（或删 include），
   推送工具 `scripts/push_include_source.js`（LOCK → PUT → UNLOCK → 激活）。
   函数组 include 是**跨集团**的仓库对象，一个集团改了两端都变。

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
| MCP `UpdateDataElement` 报「… is locked by another user or session」 | **ZH 环境下大概率是假锁**。`GetInactiveObjects` 里若没有该对象，说明连写都没写进去。真因：handler 先跑 `validate`（`POST /sap/bc/adt/ddic/dataelements/validation`），对**已存在**对象返 **400**，而 `isAlreadyExistsError()` **只认英文 `already exists`**，中文消息判不出就上抛，再撞上 handler「403 一律译成被锁」的兜底。**结论：ZH 环境 MCP 改不了已存在的数据元素**，改走 `adt_ddic.js` 直连或先删重建。`UpdateDomain` 无此前置不受影响。验证：`node scripts/probe_dtel_validate.js <DTEL> <PKG>` |
| 部分列 SELECT 取回来全空（行数对、字段空） | **`SELECT 列1,列2 … INTO TABLE @<结构表>` 是按「位置」赋值，不是按字段名**。拿 `dd07t` 整行类型接 `domvalue_l, ddtext`，值会落进前两个字段 `DOMNAME`/`DDLANGUAGE`。**不报错不告警**，只有事后取数才发现。修法：自建只含所需列、顺序与 SELECT 列表一致的结构（或 `INTO CORRESPONDING FIELDS OF`） |
| DDIC 对象激活失败，报 include 里的旧字段 | 见上「删字段的连带检查」，`push_include_source.js` |
| DELETE 报 `Parameter corrNr could not be found` | 补 `?corrNr=<请求号>`；能报这个说明锁已放开，是好事 |
| 需要直连诊断/强删 | `node scripts/adt_ddic.js probe\|unlock\|delete\|activate dtel\|doma\|tabl 名称` |
| 表/数据元素被删了，要恢复 | 系统内无残留可挖（见上），**找原系统 abapGit XML**；本系统只能靠 `DD03L` 逐字段重建 |
| 新建表激活报 Annotation / deliveryClass | 见上「S/4 建表的两个硬校验」 |
| 激活表报 `[E] 维护和保存 <表> 的技术设置` | 表壳没有 DD09L（手工/半途建的表）→ 见上「建表的正确起点」，**`DeleteTable` 后用 `CreateTable` 重建**，别去补 DD09L |
| 数据元素建了一半就断（`DD04L.AS4LOCAL='L'`、`DATATYPE`/`LENG` 全空） | 创建被中断留下的半成品。此后 `CreateDataElement` 报 `CSRF 令牌验证失败`、`UpdateDataElement` 报「locked by another user」**都解不掉**（`ENQUEUE_READ` 探针证明无真锁，是 403 被 MCP 翻译）→ **`DeleteDataElement` 删掉重建即通** |
| `CreateDataElement` 报「位置的数量 < 数据类型 256 的最小数量 (STRING)」 | `STRING` 不能用 `predefinedAbapType`。改 `type_kind='domain'` + `type_name='STRING'`（见 §1「字段建模口径」）。半成品 SAP 会自动删，直接重跑 |
| 报表（ALV）列标题一片空白，或 SE11 里字段没描述 | 表字段用了**匿名内置类型**（`DD03T` 文本全空）。治本 = 字段改挂数据元素；应急 = 报表里手写 `SELTEXT_L/M/S`。详见 §1 |
| 给已有表补挂数据元素，怕改坏数据 | 只换 `ROLLNAME`、**类型与长度保持逐字相同** ⇒ `UpdateTable` 不触发透明表转换，数据无损（`ZIFLOG` 实测）。改后务必逐字段比对 `DD03L` |
| 批量建对象跑到一半被 SIGTERM 掐断（约 2 分钟） | 沙箱超时。**建对象脚本必须支持按名过滤分批跑**，每批 ≤8 个（范式 `add_ztepic07_fields.js` 的 `dtel <名...>`）；断了先查有没有留半成品对象与 `ESDICT` 锁 |
| 想核字段的 `LOWERCASE` 标志 | `DD03L` 的 ADT 视图**不暴露**该列（报 *Unknown column name "LOWERCASE"*），且 **ADT DDL 没有字段级 lowercase 语法** ⇒ 从外部字典照搬的表，`lowercase='X'` 这一项复刻不了（票据号这类纯数字/编号字段无功能影响，交付里注明即可；真要加只能 SE11 手工勾） |

ADT 直连请求头（照抄 `@mcp-abap-adt/adt-clients/dist/constants/contentTypes.js`）：
- `LOCK` 的 Accept：`application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result;q=0.8, application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result2;q=0.9`
- DDIC 对象 `GET` 只认 `Accept: */*`（`application/xml` → 406）

## 4. 现成脚本

- `scripts/create_fee_tables.js` — 本次费用报销表的完整定义与流程，模式：
  `dd` 建域+数据元素 / `inline [DTEL]` 改成预定义类型（删+重建）/ `dropdom` 删域 / `reset` 全删 / `tables [表名]`
- `scripts/recreate_ztepic_tables.js` — **从 abapGit XML 还原的表重建脚本**（模式可直接套用到别的表）：
  `node scripts/recreate_ztepic_tables.js [ZTEPIC01|ZTEPIC02|all]`，
  DDL 放 `/tmp/DDL_<表名>.txt`，包 `ZFICO`、请求 `DEVK900006`
- `scripts/add_ztepic01_fields.js` — **给已有表追加字段 + 配套数据元素**（`dtel` / `table` / `verify`）
- `scripts/add_ztepic07_fields.js` — **按一份外部数据字典（HTML/清单）复刻整张表**（`ZTEPIC07`，22 字段）：
  `dtel [名字...]` 只建缺失数据元素（**支持按名过滤，用来绕沙箱 2 分钟超时**）/ `table` 改字段+激活（含 CURR 自动降级）/
  `recreate` 删表重建（表壳缺技术设置时用）/ `fix-cur` 只把 CURR 降级为 `abap.dec(n,d)` 后重激活 / `ddl` 只出 DDL / `verify` 逐字段与字典比对。
  改顶部 `FIELDS` 数组（`n/de/dt/l/k/new/desc`）即可复刻别的表。
- `scripts/create_ztepicbcde.js` — **从零批量建域 + 数据元素 + 多张表**（`dd` / `tables [表名]` / `ddl` 只出 DDL 不写系统 / `all`）；
  改顶部 `DOMAINS` / `DTELS` / `F_B`~`F_E` 字段矩阵即可复用到别的表集；`ddl` 模式先本地生成 DDL 核对再建表，能省掉一轮激活排错
- `scripts/adt_ddic.js` — 直连 ADT 诊断单个 DDIC 对象
- `scripts/create_isp014_objects.js` — **`ZBPM_ISP014` 全部 DDIC 对象 + 结构内嵌表组件**的生成脚本：
  `head`/`item`/`sched` 建结构 / `fixout` 只重建结构 / **`nest` 给 `HEAD_S`/`ITEM_S` 追加嵌套组件**
  （`stepFixOut('_nest')`，DDL 顶部字段矩阵的末项即组件行 `['ITEM','ZBPM_ISP014_ITEM_T','行项目']`）；
  改顶部 `HEAD_FIELDS`/`ITEM_FIELDS`/`SCHED_FIELDS` 可复用到别的接口结构
- `scripts/probe_dtel_validate.js` — **直探 ADT `dataelements/validation` 的真实响应**（MCP 假锁消息的定案工具）：
  `node scripts/probe_dtel_validate.js <DTEL> <PKG> [EN]`，末位可指定 `sap-language` 对比中英文消息
- **ADT 写链路的两个必备请求头**（缺一个就会 423 `invalid lock handle`）：
  `sap-adt-connectionid`（全程同一个 UUID）+ **`x-sap-adt-sessiontype: stateful`**。
  LOCK 的 handle 在**响应正文** `<LOCK_HANDLE>` 里，**不在响应头**（写成响应头会误判加锁失败）
- `scripts/push_include_source.js` — 推送函数组 include（LOCK → PUT → UNLOCK → 激活），
  环境变量 `SRC_FILE` / `GROUP_NAME` / `INCLUDE_NAME` / `SAP_CLIENT_OVERRIDE`
- `scripts/push_prog_source.js` — 推送可执行报表（见技能 `sap-abap-prog-push-run`）
- `scripts/adt.js` — `query|table|run|dumps|dump`
- `$TMP` 程序 `ZLOCK_LIST`（列锁）、`ZDEQ_LOCK`（DEQUEUE_ALL）、`ZTEST_ENQ_SHOW`（印锁明细）

---

## 删除 DDIC 对象（2026-10-10 实测）

**工具（MCP，经 `scripts/call-adt-tool.js` 调用）**：

```bash
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/call-adt-tool.js DeleteStructure '{"structure_name":"ZBPM_ISP016_HEAD_S","transport_request":"DEVK900006"}'
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/call-adt-tool.js DeleteTableType '{"table_type_name":"ZBPM_ISP016_ITEM_T","transport_request":"DEVK900006"}'
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/call-adt-tool.js DeleteTable      '{"table_name":"ZTEPIC07","transport_request":"DEVK900006"}'
```

- 参数名**各不相同**：结构 `structure_name` / 表类型 `table_type_name` / 表 `table_name` / 域 `domain_name`。
- **可传输对象必传 `transport_request`**（`$TMP` 对象可省），传**父请求号**（与写对象一致）。
- 成功返回 `{"success": true, "message": "... deleted successfully."}`；被引用时会带回 SAP 自己的拒绝原因（不许静默失败）。

**★ 删前必须查引用**：

```sql
-- 谁把它当「字段类型」（含 .INCLUDE 内嵌，此时 FIELDNAME = '.INCLUDE'）
SELECT TABNAME, FIELDNAME, ROLLNAME FROM DD03L WHERE ROLLNAME LIKE 'ZXXX%'
-- 谁把它当「表类型的行类型」
SELECT TYPENAME, ROWTYPE FROM DD40L WHERE ROWTYPE LIKE 'ZXXX%'
```

**★ 删除顺序 = 依赖逆序**：引用者先删（实例：`INPUT` 引用了 `ITEM_T`/`SCHED_T`/`HEAD_S` ⇒ 先删 `INPUT`，再删表类型，最后删被引用的结构）。

**★ 验证不能看 `TADIR`**：DDIC 对象删除后 **TADIR 条目仍然在**（置 `DELFLAG = 'X'`，随请求传输到后续系统后才清除），拿它判断会误以为没删掉。要看真实存在性：

```sql
SELECT TABNAME  FROM DD02L WHERE TABNAME  LIKE 'ZXXX%'   -- 表与结构
SELECT TYPENAME FROM DD40L WHERE TYPENAME LIKE 'ZXXX%'   -- 表类型
SELECT ROLLNAME FROM DD04L WHERE ROLLNAME LIKE 'ZXXX%'   -- 数据元素
```

**★ 沙箱 2 分钟超时会打断批量删除**（每次 `call-adt-tool.js` 都要冷启一个 MCP server，单次约 30~40 秒）⇒ **每批 ≤ 2 个对象**，删完核对已删清单再续下一批。

**留档**：删前把 `DD03L` / `DD40L` 全量导出到 `backup/<日期>_delold/`，并写明清单、引用核查结论、执行顺序与验证结果。

---

## ★ 传输请求登记（E071）——`TR_OBJECTS_INSERT` 不可用，TTYP 还会被静默丢弃（2026-10-12 实测）

**背景**：建完 DDIC 对象后**必须单独核 E071**，不能假定 ADT 一定登记上了。
实测 `TABL ZBPM_ISC002_ITEM` 与 `TTYP ZBPM_ISC002_ITEM_T` 建对象时**两个都没进请求**，
而同批的 FUGR / `_I` / `_O` 登记了。留下的是「传输过去缺对象、目标系统激活失败」。

```sql
-- 核：该请求/任务下到底有哪些条目
SELECT trkorr, as4pos, pgmid, object, obj_name, lockflag FROM e071
  WHERE trkorr = 'DEVK900007' ORDER BY as4pos
-- 注意 E071 主键是 TRKORR + AS4POS（NUMC6，非 0），字段只有 10 个、无 MANDT（跨集团）
```

**ADT 侧独立复核（推荐，比读表更权威）**：`GetTransport` 会带出 `wbtype` / `position` / 描述：

```bash
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/call-adt-tool.js GetTransport \
  '{"transport_number":"DEVK900006","include_objects":true,"include_tasks":true}'
```

### 坑 1：`TR_OBJECTS_INSERT` 在无头环境必炸

它把 **`iv_with_dialog` 硬编码为 `'X'`**（FM 源码里写死的），于是内部会弹
`TRINT_POPUP_EDIT_CANCEL_SHOW`，无头运行（`adt.js run` / RFC）直接短转储
**`DYNPRO_SEND_IN_BACKGROUND`，终止程序 `SAPLSTRD`**。传 `iv_no_standard_editor='X'`
和 `iv_no_show_option='X'` **都挡不住**。

### 正解：改调内部 FM，把 `iv_with_dialog` 置 `'D'`

`TR_OBJECTS_INSERT` 只是转调 `TRINT_OBJECTS_CHECK_AND_INSERT`。后者源码里：

```abap
IF iv_with_dialog CA ' D'.        " 'D' 或空 ⇒ 抑制对话
  ls_g-dialog = ' '.  ls_g-suppress_dialog = 'X'.
ELSE.                             " 'X' ⇒ 开对话
  ls_g-dialog = 'X'.  ls_g-suppress_dialog = ' '.
ENDIF.
```

所以**直调内部 FM + `iv_with_dialog = 'D'`** 即可无对话插入：

```abap
DATA: lt_ko TYPE tredt_objects, lt_e071k TYPE tredt_keys, ls_ko TYPE ko200.
ls_ko-pgmid = 'R3TR'. ls_ko-object = 'TABL'. ls_ko-obj_name = 'ZBPM_ISC002_ITEM'.
APPEND ls_ko TO lt_ko.

CALL FUNCTION 'TRINT_OBJECTS_CHECK_AND_INSERT'
  EXPORTING
    iv_order              = 'DEVK900007'   " 传任务号；回传 ev_order=父请求 ev_task=任务
    iv_with_dialog        = 'D'            " ★ 关键：'D' = 插入但不对话
    iv_send_message       = ''
    iv_no_show_option     = 'X'
    iv_no_standard_editor = 'X'
  IMPORTING
    ev_order              = lv_order
    ev_task               = lv_task
  CHANGING
    ct_ko200              = lt_ko            " KO200: PGMID/OBJECT/OBJ_NAME 三个就够
    ct_e071k              = lt_e071k
  EXCEPTIONS
    OTHERS                = 99.
```

`KO200` 其余字段（TRKORR/AS4POS/OBJFUNC/LOCKFLAG/…）**由 FM 自己填**，调用方不用给。
`ct_ko200` 是 CHANGING，返回后**行数不变不代表都插进去了**——必须回查 E071。

### 坑 2：`R3TR TTYP` 会被静默丢弃

同一个 FM 批量里，`TABL` 插进去了，**`TTYP` 悄无声息地没插**（`subrc = 0`、无异常、
单条重试也一样）。原因未在 SAP 侧查明。而系统里 `R3TR TTYP` 的既有条目有 **42 万条**，
证明类型本身合法（`SELECT ... FROM e071 WHERE object = 'TTYP'` 可自证）。

⇒ **兜底：按既有条目样式直接补写 E071 行**（与 SAP 自己写的内容等价，可验证、可回滚）：

```abap
SELECT MAX( as4pos ) FROM e071 INTO lv_pos WHERE trkorr = c_trkorr.
lv_pos = lv_pos + 1.                    " 续号，避免撞主键
CLEAR ls_e071.
ls_e071-trkorr = c_trkorr.  ls_e071-as4pos = lv_pos.
ls_e071-pgmid  = 'R3TR'.    ls_e071-object = 'TTYP'.
ls_e071-obj_name = 'ZBPM_ISC002_ITEM_T'.
ls_e071-lockflag = 'X'.                 " 与 ADT 写入的行一致；OBJFUNC/GENNUM/LANG/ACTIVITY 留空
INSERT e071 FROM ls_e071.  COMMIT WORK.
```

补完**必须**再用 `GetTransport` 复核一遍对象清单，别只看自己的 INSERT 返回值。

### 相关：短转储排查三板斧

`adt.js dump <id>` 常报 404；走 MCP：

```bash
node scripts/call-adt-tool.js RuntimeListFeeds '{"feed_type":"dumps","max_results":25}'
node scripts/call-adt-tool.js RuntimeGetDumpById '{"dump_id":"<最后一段>"}'
```

- `dump_id` **不能含 `/`**，只传 id 的最后一段（带 `%20` 也照传）。
- 看 `terminatedProgram` + 错误章节里的 `adt://.../fmodules/<弹窗FM>/source/main#start=<行>`，
  即可直接定位到是哪个弹窗函数在炸——本次就是这样揪出 `TRINT_POPUP_EDIT_CANCEL_SHOW` 的。
