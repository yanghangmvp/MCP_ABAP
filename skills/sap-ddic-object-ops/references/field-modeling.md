# 域 / 数据元素 / 字段建模 / 结构字段文本

> 主册：[`../SKILL.md`](../SKILL.md)。三句话：
> ① 枚举/代码型字段才配域，文本日期金额走 `predefinedAbapType`；
> ② 表字段**一律挂数据元素**，匿名内置类型会让 `DD03T` 文本全空、ALV 列标题一片空白；
> ③ 结构字段描述只能靠 DDL 里的 `@EndUserText.label`，且**只有预定义类型字段会落 `DD03T`**。

## 域 / 数据元素：把「状态码 + 描述」交给域管（推荐范式）

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

## 结构字段文本（`DD03T`）补齐

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
- **一次性写法**：DDL 由「字段矩阵」生成 —— 矩阵每行 `[字段名, 元素名/类型, 中文描述]`，
  生成器在字段行上方按第三列写 `@EndUserText.label`；入参结构同理（即使字段是**表类型引用**，
  也照样逐字段写 label）。备份后缀用 `_labels`，别覆盖其他阶段的备份。见 §4 范式三。
- 实测（`ZBPM_ISP014`）：4 个结构一轮过，26 条 `DDTEXT` 由空变有值，
  **字段集与位置零变化**（`HEAD_S` 59 / `ITEM_S` 46 / `SCHED_S` 4 / `INPUT` 9）。
- 查现况：`SELECT * FROM dd03t WHERE tabname LIKE 'ZXXX%'`（列名会被 ADT 裁剪，必须 `SELECT *`）。

## 给已有透明表追加字段（`UpdateTable`，比 UpdateStructure 更顺手）

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
三个子命令（`ddl` 只出 DDL / `dd` 建元素 / `table` 改表）自己写十几行就能拼出来，见 §4 范式一。

**复用现成元素时"字段名 = 数据元素名"可以放开**：`ZTREST_LOG.MSGTY` 挂 `MSGTY`、`ZTFI0014.MSGTY` 挂 `ZCIS_MSGTY`，
字段名与元素名不一致是常态。这条口径只约束**新建**字段时别造同名不同义的乱象。
- 复核数据元素主语言：`SELECT obj_name, masterlang, devclass FROM tadir WHERE obj_name IN (...)`，应为 `1`(ZH)、`ZFICO`。
- 追加字段天生是「一份字段矩阵 + 三个子命令」，照 §4 范式二写，改 `FIELDS` 数组即可换表。
