# 挂传输请求 / 推函数模块 / 接口结构（§5）

> 主册：[`../SKILL.md`](../SKILL.md)。本章覆盖：请求号与集团的一致性、`DESC` 程序标题、
> FM 与 include 推送后的两步核验、FG 内 FORM 形参类型必须与标准 FM 逐字一致、嵌套结果集结构。

## 5. 挂传输请求（对象落到可传输包时）

创建/LOCK/PUT 都要带 **父请求号**（不是任务号，传任务号会报对象已被锁）：

```bash
SAP_ENV_FILE=$PWD/portable/env/dev.env CORR_NR=DEVK900006 PKG=ZFICO SRC_FILE=/abs/x.abap node scripts/push_prog_source.js
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
- **处置**：把 `SAP_CLIENT_OVERRIDE` **去掉**，用 `portable/env/dev.env` 里的默认 `SAP_CLIENT` 推送（本项目 DEV 的请求都建在 client 100）。

```bash
# ✅ 正确：模块池/函数模块改源码，用请求所属的 client
SAP_ENV_FILE=$PWD/portable/env/dev.env CORR_NR=DEVK900006 \
  TARGET_GROUP=ZFG_BPM002 TARGET_FM=ZBPM_ISP002 \
  SRC_FILE=$PWD/scripts/ZBPM_ISP002_new.abap node scripts/push_fm_source.js
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
SAP_ENV_FILE=$PWD/portable/env/dev.env CORR_NR=DEVK900006 PKG=ZGL DESC="接口报文日志查询" \
  SRC_FILE=/abs/x.abap node scripts/push_prog_source.js
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
SAP_ENV_FILE=$PWD/portable/env/dev.env CORR_NR=DEVK900006 TARGET_GROUP=ZFG_BPM002 TARGET_FM=ZBPM_ISP002 \
  SRC_FILE=/abs/x.abap node scripts/push_fm_source.js
```

流程：GET 预热会话 → LOCK（带 corrNr）→ PUT `source/main` → UNLOCK → ACTIVATE。**顺序不可颠倒。**

**改完必须两步核验**（HTTP 200 ≠ 激活成功）：

```bash
# ① 拉回源码与推送源逐字 diff
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/get_source.js FM ZBPM_ISP002 ZFG_BPM002 --out=/tmp/after.abap
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
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/adt.js query \
  "SELECT master, include FROM d010inc WHERE master = 'SAPLZFG_BPM002'"
#   → LZFG_BPM002$01（TOP）/ LZFG_BPM002U01（PBO…）/ LZFG_BPM002F01（FORM）/ ZGSP_1C_RFC_LOGGER …
# ② 拉 FORM include（名字规律：L<函数组>F01）
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/get_source.js INCL LZFG_BPM002F01 --out=/tmp/x.abap
grep -nE "^FORM|^ENDFORM" /tmp/x.abap        # ★ 用 -E，BSD grep 不认 \|
```
**判据**：主源码里 `PERFORM frm_xxx` 有调用点、但全文搜不到 `FORM frm_xxx`，就是它躺在 include 里（别误判成"这段逻辑没实现"）。

**新语法在接口函数里两处必踩**（都会被编译器顶回来，激活直接取消）：
- `UPDATE … SET f1 = @a, f2 = @b` —— **多个赋值之间必须逗号分隔**（空格分隔报 *The elements in the "SET" list must be separated using commas*）。
- `DELETE FROM … WHERE f = var` / `SELECT … WHERE f = var` —— **变量与 `CONSTANTS` 常量都要 `@` 转义**（报 *The variable "X" must be escaped using "@"*）。

**接口是否可被外围（RFC/HTTP）调用：查 `ENLFDIR`**（注意是 `ENLFDIR`，`ENLFD` 报「找不到」）：

```bash
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/adt.js query \
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
