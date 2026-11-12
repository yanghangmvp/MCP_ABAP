# ABAP / SQL 语法陷阱与激活报错速查（§8 余下、§12）

> 主册：[`../SKILL.md`](../SKILL.md)。写代码前的自检清单：部分列 SELECT 按位置赋值、
> `FORM ... USING` 形参类型、`FOR ALL ENTRIES` 与 `@abap_true`、`SY-TABIX` 被 `READ TABLE` 改写、
> 以及一张「报错原文 → 根因」对照表。

## 8. 可靠性与 SQL 侧注意

- **激活报错只给一条消息时**，用 `SRC_NAME=ZXXX node scripts/act_dump_prog.js` 打原始 `chkl:messages`（带 `href="#start=行,列"`），修完再推，逐轮收敛。
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
- 复核取值逻辑时可写**无选择屏幕的** `$TMP` 诊断报表（`adt.js run` 能跑），一次验证多个假设：范围表语义 + 真实数据分布 + 状态字典。范式 `scripts/ZTEST_ZFIR005_DIAG.abap`。
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

- **`yyyy.mm` 期间 → 时间戳区间的换算走字符拼接，别做数值运算**：`ZSPTIM` 是 `DEC(15)` 存 `YYYYMMDDHHMMSS`，用 `CONCATENATE lv_gjahr lv_monat '00000000' INTO lv_low.` / `'99999999' INTO lv_high.` 构区间边界，避免 15 位大数的舍入/溢出。跨年回绕（如 11 月 ~ 次年 2 月）要**拆成多段 range 追加**，不能只给一个区间。换算正确性用 `$TMP` 探针验证（范式 `scripts/ZTEST_ZFID001A_CHK.abap`，覆盖单月 / 全年 / 跨年回绕三类用例）。

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

排错手法：只报一条消息时用 `SRC_NAME=ZXXX node scripts/act_dump_prog.js plain` 打原始
`chkl:messages`（带 `href="#start=行,列"`），**注意脚本读的是 `SRC_NAME` 环境变量，不是 `PROG`**，
传错会静默去激活默认的 ZFIR005。
