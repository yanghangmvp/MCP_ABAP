---
name: sap-abap-pitfalls
description: ABAP 开发踩坑与解法库（跨项目通用）。沉淀自示例客户 DEV ERP 项目 100+ 份交付报告与逐日纠错记录，共约 120 条「现象 → 根因 → 解法」，另附新项目开工 checklist（摸底/动手前/编码自检/交付/收尾五阶段）。覆盖 ADT 激活假成功/假锁判定、ABAP 语法硬约束、「返回成功但数据没变」的静默失效清单、事务与 LUW、F4 与弹窗与 ALV、接口 JSON 与网关、DDIC 建对象、ST22 与探针排查手法、打补丁脚本陷阱。开新 ABAP 项目做开场阅读与开工检查，或遇到「编译通过但激活失败 / 激活成功但运行不对 / 返回 S 但值没变 / 报错文案与真实原因无关 / 按钮点了没反应 / 数据莫名错位」时加载本技能。
agent_created: true
---

# ABAP 开发踩坑与解法库

用途：**下个项目开工前通读一遍，排障时按症状查**。本技能只收「跨项目可复用」的经验，环境地址、请求号、对象清单属项目私有，不在此处（怎么写一份见仓库 `examples/project-ops-template.md`）。
完整 120 条（含代码片段与出处）见 `references/casebook.md`。
**BAPI / 标准函数调用**的坑不在此文件，统一见技能 `sap-abap-bapi-usage`。

**怎么用**：新项目开工 → 直接翻 **§11 开工 checklist**（按时间顺序执行）；已开工遇到问题 → **§10 症状速查** 定位到分节；想深挖某条的完整代码与出处 → `references/casebook.md`。

**三条元规则**（比任何单条坑都重要）：

1. **报错文案经常与真实原因无关** —— ABAP 编译器的报错点往往是「它解析到的位置」，不是「你写错的位置」。先假设是**段序/关键字顺序/类型不匹配**，而不是语法本身。
2. **SAP 最危险的不是报错，是静默失效** —— 「返回 S、激活 200、编译通过」三重假象下数据悄悄错。凡涉及 BAPI、`SELECT INTO TABLE`、`EXTENSIONIN`、文本元素、增强字段，一律做**落库对账**，不信返回值。
3. **失败必查 ST22，不猜** —— 短转储的 `Error analysis` 直接给出 `procedure "XXX" "(FORM)"` 与 `CX_SY_*` 异常类，比逐个 FORM 试快一个数量级。

---

## 0. 十条铁律（违反即返工）

1. **改任何已存在对象，第一步回读现网**。用户常在 SE80 直改生产对象且不回写归档，本地归档只作比对、不作基线。`get_source` → 与备份 diff 确认 0 差异 → 打补丁 → 回读再 diff → 反向覆盖归档。
2. **文本元素同属基线，`get_source` 不含 TEXTPOOL**。覆盖式推文本前必须 `read_textelements` 取激活版全文存档、与本地 JSON diff、人工合并再推。否则用户在 SE38 前台改的文案被无痕冲掉，源码 diff 完全看不出来。
3. **绝不直接 UPDATE / MODIFY 标准表**。改已过账 FI 凭证走 `FI_DOCUMENT_CHANGE`（组 `FACG`，`T_ACCHG` 只填 `FDNAME`+`NEWVAL`，抬头不传 `I_BUZEI`、行项目才传）。
4. **请求号不自己造**。推可传输对象缺 `CORR_NR` ⇒ 停手报告，等用户给号；新建 TADIR 对象前先报「类型+建议名+TADIR 查重结果+编号延续理由」，点头再建。已挂请求的既有对象后续改动复用原号，不再问。
5. **不用 `Update*` 类写接口做试探性调用**。它会真写——曾用 `UpdateFunctionModule` 只传函数体「试试」，把 inactive 源码覆盖成 620 字符残版。探针只走只读接口。
6. **交付四步**：生成 → 推源码 → 推文本元素（`PROG/PX` 须单独激活）→ 生成 GUI 状态（CUA）。文本元素不激活 = 运行时 `TEXT-xxx` 恒空。
7. **生产源码注释：留骨架、删叙述**。保留程序头（单位/作者/日期/摘要/变更记录）+ `*&---` 框线 + FORM 横幅 + `-->`/`<--` 形参文档 + 判据型短注释；删除设计依据、口径说明、联调实测、TODO 理由、`scripts/work`/ADT/`ZTEST_*` 引用。剥离后必须 diff 证明代码本体零改动。
8. **测试/探针对象测完即删**。先 `get_source` 留档 `backup/` → 删 → 回查 `TADIR` 清零。只删本轮自己建的；他人建的、已挂包挂请求的、在用的 DEMO 一律不动。
9. **先查锁、先备份再写 SAP**。凭据文件不外传、不回显、不写进交付物。
10. **用户说「数据没问题」时，更要认定程序有问题**。用「报错金额+张号」反推输入特征，写探针逐字复刻该报错；复刻成功即锁定根因。

---

## 1. 激活与写入通道（ADT / MCP）

- **HTTP 200 ≠ 激活成功** — 成败写在 body：必须显式检测 `activationExecuted="false"` 并抛错；验证激活唯一可靠方式是回读 include 或 `?version=active` 与 inactive 双版本比对。`TRDIR-RSTAT` 在 S/4 不写值。
- **假成功最难发现** — 旧脚本按 `<chklst:shortText>` / `<msg>text</msg>` 正则抓消息，真实结构是 `chkl:` 前缀 + `<shortText><txt>` + msg 带属性 ⇒ 一条消息都打不出来，连报三次「激活成功」实际是 131 字符空壳。**抓不到消息就必须当失败**。
- **文本元素是独立可激活对象 `PROG/PX`** — 激活父程序不连带；`push_textelements` 若只有 `GET→LOCK→PUT→UNLOCK` 没有 ACTIVATE，PUT 只写 inactive 版。传 `PROG/P` 时 SAP 认为无可激活内容，回 `activationExecuted="false"` 且**无任何 msg** ⇒ 静默无效。激活接口不接受 `corrNr`（带了 400）。
- **`push_textelements` 的 PUT 是整块覆盖，推序不能反** — 新增符号：先文本元素后源码；删除符号：先源码后文本元素。`TE_FILE` 必须连同既有 selections 一起给全。
- **文本元素只有 inactive 版时，程序须重新生成才生效** — 只推文本元素 + 再 PUT 内容相同的源码**不会刷新**。改动源码一行（哪怕注释）后重推，或重建程序。
- **三种「假锁」**：① 报「已在用户 xxx 的请求 yyy 中锁定」其实是**漏传 `transport_request`/`corrNr`**；② `UpdateDataElement` 报 `locked by another user` 其实是 400「已存在」——handler 的 `isAlreadyExistsError()` 只认英文，中文消息判不出，撞上 403 兜底被译成「被锁」（⇒ ZH 环境下 MCP 改不了已存在的数据元素，`UpdateDomain` 无此前置故不受影响）；③ `403 … not specified for this client` 是**集团不对**。
- **真锁只有 SM12 能删** — `ESDICT`/`ESRDIRE`/`SEOCLSENQ` 三类锁挂在 ADT 会话上，`DEQUEUE_ALL`、`_scope='3'`、`DEQUEUE_EESDICT` 全部无效。`ENQUEUE_READ` 确认后请用户在 SM12 手工删，立刻重跑；别等会话超时。
- **两句 403 含义完全不同** — `User XXX is currently editing ZFIDxxx` = 真人开着 SE80，等；`Object ... locked in task DEVK90011x not specified for this client` = 集团不对，换请求所属集团重推。混为一谈会白绕一圈。
- **ADT LOCK 的 `Accept` 头必须带 datatype** — 只发 `application/xml` 时 SAP **已加锁成功**但响应 406 拿不到 `LOCK_HANDLE` ⇒ 锁泄漏，之后所有请求报「使用者 X 当前编辑」，一直骗你以为是别人占着。正确值：`application/vnd.sap.as+xml;dataname=com.sap.ad.lock.result`。
- **脚本 `fail()` 里 `process.exit()` 跳过 `finally` ⇒ 入队锁残留** — 类推送脚本异常退出后 `SEOCLSENQ` 锁能留 40 分钟，之后所有 LOCK 报 403 像「用户开着 SE80」。写脚本一律先 UNLOCK 再退出，或改 `process.exitCode = 1`。
- **不要替用户强删编辑锁** — ADT 删锁会丢对方未保存的修改。
- **include 是独立 ADT 资源** — POST 打到 `/programs/programs` 一律建成可执行程序（`TRDIR-SUBC=1`），之后改不回来；include 打 `/sap/bc/adt/programs/includes`（根元素 `<include:abapInclude>`）。主程序与 include 必须同一条 activation 请求，否则互报未定义。
- **`INSERT REPORT ... STATE 'A'` 造出的 include 会把源码写成 active 版** — 之后改 inactive 版，主程序激活仍按旧 active 编译，报的错指向旧代码。改完须 `INSERT REPORT 'X' FROM lt_src STATE 'A' PROGRAM TYPE 'I'.`（`STATE` 必须在 `PROGRAM TYPE` 之前）刷新 active 版。
- **本机代理会把 ADT 请求打挂** — 表象与「连不上 SAP」一模一样（`socket hang up` / CSRF 失败）。spawn MCP 子进程前删 `*_proxy` 并设 `NO_PROXY=*`；写请求一律 `proxy: false`。
- **ADT 无 dynpro / GUI Status / Menu 资源** — 但 CUA 可代码化（`RS_CUA_INTERNAL_FETCH` + `_WRITE`，`state='A'`，写回即生效）。`D020S` 是 dynpro 屏幕头**不是** GUI 状态表；`RS_CUA_GET_STATUS` 不可用于判定，只认 `RS_CUA_INTERNAL_FETCH`（10 个必输 TABLES 全给，`ORDER BY pposition` 防 25 行截断）。

---

## 2. 语法硬约束（一次过编译）

- **FORM 形参四禁忌**：① 不能写 `TYPE c LENGTH n`（报 `Numeric literals cannot be used as field names`）⇒ 用 `TYPE char<n>` 或 DDIC 类型；② 定长形参收不同长度实参编译期报 incompatible，**文本符号例外但运行期仍 500 `Type conflict when calling a FORM`** ⇒ 跨长度用泛型 `TYPE c`；③ 不能内联 `TYPE STANDARD TABLE OF`（形参被算成 8 个，报 `Different number of parameters`）⇒ 先 `TYPES` 命名；④ `FIELD-SYMBOL` 在 FORM 里声明是局部，跨 FORM 必须改全局。
- **`FORM ... TABLES` 必须写在 `USING`/`CHANGING` 之前** — 写成 `USING ... CHANGING ... TABLES` 报 `Field "TABLES" is unknown.`（把关键字当形参名）。`PERFORM` 调用侧同理。
- **`CALL FUNCTION` 段序强制** — `EXPORTING → IMPORTING → CHANGING → TABLES → EXCEPTIONS`。把 `TABLES` 写在 `IMPORTING` 之前报 `Unable to interpret "EV_OBJNR"`，完全看不出是顺序问题。被调方 `EXPORTING` 形参要写在调用方 `IMPORTING` 段，写反报 `CALL_FUNCTION_PARM_UNKNOWN`——**极易误判成「FM 接口没生成」**。
- **多字段 SELECT 必须逗号分隔，`@` 宿主变量必须转义** — 报 `elements in the "SELECT LIST" list must be separated using commas`。`UPDATE ... SET` 多赋值同理；`WHERE` 里常量（含 `CONSTANTS`）同样要 `@`。
- **`INTO` 与 `UP TO n ROWS` 位置以激活器报错为准** — 带 JOIN/子查询/SQL 表达式的语句属严格模式，强制 `INTO` 在最后（`SELECT 563`）；`UP TO n ROWS` 必须在 `WHERE` 之前。两种写法在不同语句上表现不同，照抄记忆会翻车。
- **`ASSIGN ... CASTING TYPE c LENGTH <变量>` 不支持** — 长度必须是字面量；去掉 `LENGTH` 又在下标越界时 DUMP `Invalid subfield access`。正解用 `cl_abap_container_utilities=>fill_container_c( )`（与标准函数 `READ_CONTAINER_C` 互逆）。
- **`DESCRIBE FIELD` 的 `TYPE` 必须写在 `COMPONENTS` 之前** — 只想取组件数也得写：`DESCRIBE FIELD cs_data TYPE lv_type COMPONENTS lv_count.`
- **`CONSTANTS` 必须带 `VALUE`** — `CONSTANTS: c_x TYPE flag.` 报 `"VALUE ..." is not specified.`
- **`MESSAGE TEXT-xxx TYPE 'S' WITH n` 不合法** — 文本符号不能作带 `WITH` 的消息文本。走辅助 FORM：`lv_text = pv_text → REPLACE '&' IN lv_text WITH lv_num → MESSAGE lv_text TYPE 'S'.`
- **定长类型没有 `char<n>` 这个名字** — `TYPE char1000`/`char55`/`char220` 全部非法，报 `Type "X" is unknown`；一律 `TYPE c LENGTH n`。类型名猜错=浪费一轮激活，不确定就查 `DD04L` 或 `get_source`。
- **`class=>method` 只能用于静态方法** — 实例方法必须 `CREATE OBJECT lo. lo->method( )`，否则报 `can only be specified with static methods`。
- **字符串模板不能作 `PERFORM ... USING` 实参** — 报 `Field "|" is unknown`；先赋给变量再传。
- **`CALL TRANSACTION ... WITH f1 v1` 不是合法语法** — `WITH` 只接 `AUTHORITY-CHECK`。传参只能走 `USING bdcdata`；SM30 首屏只有表名一个字段（`VIMDYNFLDS` 无更新模式字段），进修改模式用 `VIEW_MAINTENANCE_CALL` + `action = 'U'`。
- **`REPLACE ALL OCCURRENCES OF ... WITH ''` 在本类型系统会 endless loop** — 删空格/删字符改逐字符 `DO strlen TIMES` + `lv_txt+lv_i(1)` 过滤。
- **`CONCATENATE` 不接受数值型** — `lv_cnt TYPE i` 报 must be character-like；内建函数（`strlen`/`lines`）不能直接进 `&&`（报 `The syntax for a method specification is objref->method`，一次报一批误导成箭头语法错）。数值一律用字符串模板 `|...{ lv_cnt }...|`。
- **`$TMP` 探针内不能定义 FORM；方法体外的注释不会被保存** — 探针激活报 `Statement is not accessible`（`CheckProgram` 反而不报）；类里 `ENDMETHOD` 与下一个 `METHOD` 之间的注释报 `unknown comments which can't be stored`。
- **`SELECT-OPTIONS` 名 ≤ 8 字符** — 9 字符首次激活被拒。改短名要**同步改文本元素 `selections` 条目名**（旧变式存旧名会被静默忽略，只提示不报错）。

---

## 3. 静默失效清单（最贵的一节）

**凡是「返回 S / 激活 200 / 编译通过」但结果不对，先来这里对号。**

### 3.1 数据错位与丢失

- **`SELECT 显式列清单 INTO TABLE <预声明整表类型>` 按位置赋值** — 类型恰好兼容时**不报错不告警**：`DD07T` 的 `DOMVAL` 落进 `DOMNAME`、`COEP` 的 `WKGBTR` 落进 `MEGBTR`（金额恒空）、`ZTEPIC3A` 报 `component "ZJK" not compatible with "ZJYRQ"`（靠 `_act_dbg` 拿坐标）。**一个坑在 5 份报告里复发。** 解法三选一：`SELECT *` / `INTO TABLE @DATA(...)` 内联（结构由列表定型）/ 自建列序一致的窄结构；或 `INTO CORRESPONDING FIELDS OF TABLE`。
- **`LEFT JOIN` 右表字段写在 `WHERE` 里 ⇒ 语义退化成 `INNER JOIN`** — 右表无匹配时为 NULL，条件不成立。过滤条件移进 `ON`。
- **`DELETE ADJACENT DUPLICATES ... COMPARING <非键字段>` 会吞数据** — 条件表 A017 主键含 `DATBI`、`KNUMH` 不是键，按 `COMPARING knumh` 去重把同 KNUMH 的后续有效期段全删了。先 `SORT BY` 全键再 `COMPARING` 全键。
- **`AT NEW` / `AT END OF` 按物理相邻判组，ALV 回写后必失效** — `REUSE_ALV_*` 会就地重排 `t_outtab`（用户按消息列排序即触发），同组不再相邻、`AT END OF` 多次触发。分组改「外层遍历去重键 × 内层按键收集」，组边界只认业务键。
- **`APPEND` 会改写 `sy-tabix`** — `APPEND INITIAL LINE ... ASSIGNING <fs>` 之后取 `sy-tabix` 得到的是**段序号**不是源行号 ⇒ 区间被放大，128 行输出成 558 行（同一记录重复 43 次）。循环首行先 `lv_tabix = sy-tabix.`。
- **`READ TABLE ... WITH KEY` 未命中把 `sy-tabix` 置 0** — 随后 `APPEND sy-tabix TO lt_del` 记进删除清单，`DELETE ... INDEX 0` 直接 DUMP `TABLE_INVALID_INDEX`。循环首行存行号 + 删除前 `IF idx >= 1 AND idx <= lines( )`。
- **内联 `DATA(...)` 声明在 `IF` 分支里，条件不成立时内表从未创建** ⇒ 后续 `LOOP` 短转储。声明提到方法头部，或取数前置空判断。

### 3.2 BAPI / 标准函数「返 S 但不报错、值没变」

**整节已迁到 `sap-abap-bapi-usage` → `references/_静默失效清单.md`**（含 x 结构成对、标识字段 `CHAR1`、`VALUEPART1` 240 分块、`TVEPZ` 数量双通道、`OBJ_KEY` 布局、`BSEG` 999 行、双币 `CURRENCYAMOUNT`、`UMSKZ` 无字段、`DELETE_TEXT` 抛 `NOT_FOUND`、`READ_TEXT` 类型冲突等 16 条）。调 BAPI 或标准函数时加载那个技能。

### 3.3 文本 / 描述 / 列标题变空

- **字段用匿名内置类型 ⇒ `DD03T` 文本为空 ⇒ ALV 列标题一片空白** — 字段必须挂数据元素（挂上后 `DD03T` 变 0 行是**正确状态**，文本上移）。结构字段文本只能靠 DDL 逐字段 `@EndUserText.label`；**嵌套的 `STRU`/`TTYP` 型字段永远没有 `DD03T` 文本**（SAP 标准结构同样如此）。`CreateStructure` 的 `fields[].description` 不入 `DD03T`。
- **文本元素未激活 / 只有 inactive 版 ⇒ 运行期 `TEXT-xxx` 恒空** — 表现为 ALV 列标题退回 DDIC 短文本、状态列为空。
- **域只定义类型没维护值集 ⇒ 选择屏幕 F4 弹不出候选** — 查 `DD07T` 必须带 `AS4LOCAL='A'`（否则取到非激活行）、`ORDER BY VALPOS`（否则得 `1,10,11,2,3…` 字典序）、语言回退域主语言 `DD01L-DOMMASTER`（字段名**不是** `MASTERLANG`）。
- **DDIC 组件名 30 字符静默截断** — JSON 键名映射时会莫名丢键。

### 3.4 权限与过滤

- **`AUTHORITY-CHECK` 传空值通常无授权 ⇒ 相关记录永久不可见** — 角色里不会授 `EKGRP = space`。组织层字段为空时**不做校验直接放行**：`IF lv_ekgrp IS NOT INITIAL. AUTHORITY-CHECK ... ENDIF.`。用行级过滤而非整屏拒绝，否则无权用户连事务码都进不去。
- **`MODIF ID` 只控显隐，隐藏字段已填的值仍参与过滤** — 隐藏场景用 RANGE 在取数侧显式拦住。

---

## 4. 事务与 LUW

- **`EXPORT ... TO DATABASE`（cluster 日志）受事务控制** — 「落底表 → 建凭证 → 失败回滚」使日志与底表同处一个 LUW，`ROLLBACK` 把 `indx=01` 入参快照一起吃掉（`indx=02` 还在）。且底层过账 FM 内部还会 `BAPI_TRANSACTION_ROLLBACK`，所以「删掉自己的 ROLLBACK」或「调顺序」都无效。
  ⇒ **解法：在唯一的写库动作之前、且在调 BAPI 之前插一句独立 `COMMIT WORK`**，`ROLLBACK` 原样保留。附带收益：调 BAPI 前先结算自身 LUW 本就是规范姿势。
- **要原子性就别各自提交；要独立提交就保留回读** — `SD_SALESDOCUMENT_CHANGE` 的 `CALL_FROM_BAPI='X'` 把更新挂进 update 队列，未提交查不到 ⇒ 删掉 `COMMIT WORK AND WAIT` 后保留的 `SELECT` 回读校验必然误判「标志未更新」。过账失败分支必须补 `ROLLBACK WORK`，否则挂起的 SD 更新会悬空到下一次提交被误落库。
- **平台快照只绑 FM 参数，函数内局部变量一律不绑** — 报文在 `lv_req`/`lv_resp` 里就平台上看不到；监控器 `serialize` 不带 `name_mappings`，输出 DDIC 大写名而非契约报文。业务侧自建报文日志表 + 一行 `save( )` 写在**报文唯一产生地**（`frm_send` 末尾），独立提交正好补上平台被回滚吃日志的短板。

---

## 5. 弹框 / F4 / ALV / 选择屏幕

- **`POPUP_GET_VALUES` 的 `RETURNCODE` 语义反直觉** — **`'A'` = 取消；空格 = 确认且 `FIELDS` 已回填**（`LSPO4U01`：`IF ok_code_save = 'CANC'. returncode = 'A'. ELSE. fill_values. returncode = space.`）。写成 `IF lv_rc <> 'A'` 把「确认」当「取消」⇒ 现象是**点弹窗确认后毫无反应**（无消息、无动作、无转储）。
- **`POPUP_GET_VALUES` 只在字段挂得住 DDIC 搜索帮助时才弹 F4** — 判据 `F4IF_DETERMINE_SEARCHHELP`（0=有 / 2=字段在但无帮助 / 1=字段不存在）。**不要**靠改成 `SKA1-SAKNR` 借帮助——会引入 ALPHA 补零，`'8000'` 变 `'000008000'`，校验误报且存库格式变。
  ⇒ 改用 `POPUP_GET_VALUES_USER_HELP` + `F4_FORMNAME` + `F4_PROGRAMNAME = sy-repid`，字段属性不变。出口 FORM 由 FM 以 **5 个 `USING`** 调用（`tabname/fieldname/display_flag/returncode/value`），**把选中值写回第 5 个形参并把 `returncode` 置 `'F'`** 弹框才刷新（拿不到 `sy-stepl`，不要走 dynprofield 回填）。
- **`POPUP_GET_VALUES` 不支持按条件隐藏字段** — `SVAL` 只能控 `FIELD_ATTR`（必输/只读）。按类型只装载对应字段集，用户改了类型就按新类型**重弹**（类型未变即退出，不会循环）。
- **`F4IF_INT_TABLE_VALUE_REQUEST` 传 `FIELD_TAB` 时每行必须能推出 `INTTYPE`** — 推导链 `TABNAME → INTTYPE → DATATYPE → DOMNAME → ROLLNAME`，全落空即 `message DH208 raising parameter_error` ⇒ **按 F4 弹不出、`sy-subrc=1`**，编译与激活都不报。最小填法：`FIELDNAME + DATATYPE='CHAR' + INTTYPE='C' + LENG + OUTPUTLEN + REPTEXT/SCRTEXT_S/M/L`。
- **`INTLEN`/`OFFSET` 必须一并填对** — `INTLEN` 是**字节**长度（Unicode 下 = 字符数 × 2），只填 `LENG`/`OUTPUTLEN` ⇒ **F4 弹得出来、但选中/关窗时 DUMP**（`LSDH4F02 583 CONVERT_RESULT` 的 `ASSIGN with length 0`）。一律用 `DESCRIBE FIELD ... LENGTH lv IN BYTE MODE` / `IN CHARACTER MODE` / `DESCRIBE DISTANCE BETWEEN ... IN BYTE MODE` 动态取，不硬编码。
- **更省心的一条路：传 `DDIC_STRUCTURE`** — FM 自己 `DDIF_FIELDINFO_GET` 填 `FIELD_TAB`（零猜测），代价是要建 DDIC 结构；**程序局部类型走不通**（依赖 `DESCRIBE FIELD ... HELP-ID`，查不到局部类型 ⇒ `FIELD_TAB` 空 ⇒ DH110）。
- **`IRC = 4` 的 `no_values_found`（DH801）在弹窗之后才判** ⇒ 「传空值表」验证不了参数合法性。
- **选择屏幕 `PUSHBUTTON` 的文本不能用「选择文本」** — `PUSHBUTTON pos(len) push` 里 `push` 只是**字段名**，选择文本只作用于 `PARAMETERS`/`SELECT-OPTIONS`。`INITIALIZATION. pb_jump = TEXT-005.` 或把文本符号直接当字段名。
- **`OBLIGATORY` 会在按钮事件前拦截** — 条件没填就点不了按钮。去掉 `OBLIGATORY`，改在 `AT SELECTION-SCREEN` 里自己校验。
- **选择屏幕功能键三件套** — `TABLES: sscrfields.` 是硬前提（不声明则 `FUNCTXT_01`/`UCOMM` 报 unknown、激活失败；用 `sy-ucomm` 能激活，恰好掩盖缺失）+ `SELECTION-SCREEN FUNCTION KEY 1` + `INITIALIZATION` 里给 `sscrfields-functxt_01` 赋 `smp_dyntxt`（`icon_id` + `icon_text`）。判断用 **`sscrfields-ucomm`**，不是 `sy-ucomm`。
- **「ALV 无头必然 500」是误判** — 真因是 **ALV 之前有一句 `WRITE`**（`Screen output without connection to user`）。ALV 本身在无头通道会自动降级成清单输出。诊断 `WRITE` 挪到 ALV 之后或塞进数据行。`SUBMIT` 带 ALV 同理会 dump。
- **`SLIS_FIELDCAT_ALV` 没有 `COLTEXT`** — 那是 `LVC_S_FCAT` 的。`REUSE_ALV_GRID_DISPLAY` 写 `SELTEXT_L/M/S`；LVC 才写 `COLTEXT`。复制别人 fieldcat 代码前先看清是哪个函数。另：fieldcat 的 `fieldname` 写错**激活不报错、运行期才炸** ⇒ 推前用正则抽全部 `fieldname = 'XXX'` 与 `ty_alv` 组件名比对。
- **`set_drop_down_table` 是整表替换且不阻挡手工输入** — 分两次调用会丢掉先注册的句柄，所有句柄必须同一次提交；要强制取值域在 `HANDLE_DATA_CHANGED` 里校验。勾选列（`box_fname`）前端值必须 `check_changed_data` 回写，否则读到全空。
- **CUA 功能码 `pfno` 49 以上不在功能键表内** — 落 49/50 报「无效脚本标识」；实测 13-48 已被基线标准功能键占满，**仅 04、09、10、11 空闲**（04 是 F4，需避让）。`RS_CUA_INTERNAL_WRITE` 参数名传错**不报语法错**、运行期 dump `Function parameter "xxx" is unknown`；从 CUA 删掉的功能码必须同步从生成配置里删，否则下次重跑加回来。

---

## 6. 接口报文 / JSON / HTTP / 日期金额字符

- **`/ui2/cl_json` 的键名靠 `name_mappings`，`pretty_name` 不够** — `pretty_name='X'` 只能处理 `APPLY_AMOUNT` 这类下划线名，`REQBOS` 仍会变 `reqbos`。**请求与返回各备一张表**（serialize 查 `abap` 键、deserialize 查 `json` 键）。① 每层独立推导 ⇒ 嵌套层**绝不能加层级前缀**；② 唯一键表，同键重复登记抛 *A row already exists with this key*；③ 只登记推导不出来的键。
- **金额用 `DEC` 不用 `STRING`** — 定义成 `STRING` 时 JSON 里变带引号的 `"12.35"`，与契约 decimal 不符；`DEC 23,2` 自动产出裸数字。CURR/QUAN 用 `DEC:l,d`。
- **`compress='X'` 会丢掉所有空值字段** — 契约对缺字段敏感时传空（全量显式送出）。
- **TTYP 作 `IMPORTING` 参数会被序列化成裸 JSON 数组** — 与 `{"reqBOS":[...]}` 契约不符。用只有单字段的结构包一层。
- **网关鉴权失败会回 HTTP 200 + `msg=token已失效` 且没有 `code` 键** — 不能只看 HTTP 状态，也不能只靠 `code` 是否存在判成败。**三重判定**：HTTP 状态、业务码存在性、业务码取值；报文没有业务码时把响应原文（截断）带进 `MSGTX`，不要留「无法解析」这种查不下去的结论。
- **成功判定别只看 `code`**（失败时也可能是 `'0'`）；`ES_RETURN-RVAR*` 语义每个接口都不同。网关（IPAAS）需 HTTP Basic：不加凭据回 200 + `msg=token已失效`。
- **「探针跑通了」不等于结构完整，必须做键级对账** — FS 样例逐键核；只靠探针跑通会漏掉**值恰为空**的字段（初版实测漏建 21 个字段，运行时全看不出来）。
- **13 位毫秒时间戳直接转 `TIMESTAMP` 会得到 `00000000`** — 毫秒除 1000 得 10 位秒数赋 `CHAR14` 后**右对齐左补空格**，`CONVERT TIME STAMP` 视为非法而失败且不报错。截前 10 位 + `cl_abap_tstmp=>add( tstmp = c_ts_base secs = lv_scnd )`。注意该 FM 的 `TSTMP` 形参要求 `TIMESTAMP` 类型，**直接传字面量 `'19700101000000'` 抛 `CX_PARAMETER_INVALID_TYPE`**（字面量是 C 类型）；时区选 UTC 还是 `sy-zonlo` 会差一天。
- **`CONCATENATE` 拼 `NUMC3` 保留前导零，截断后成非法日期** — `'009'` 拼成 9 位字符串赋 `DATS(8)` 被截，月末算成 `0001-01-31`。用 `p_perio+1(2)` 偏移跳过前导零。
- **客户/供应商/科目/成本中心/订单号一律 `ALPHA = IN` 补零，但 `MATNR` 是反例** — BDC 屏幕与 BAPI 都不做输入转换，`100004` 写成 `100004` 就找不到。而 `MATNR` 为 `CHAR40` 且主数据存不补零形态，补零反而取不到，要用 `CONVERSION_EXIT_MATN1_INPUT`。
- **探针入参为数值型（`DEC`）必须用数值字面量赋值** — 赋字符串报 `cannot be interpreted as a number` 并返 500。

---

## 7. DDIC 建对象

- **建表唯一路径**：`CreateTable`（建空壳，自带 DD09L）→ `UpdateTable`（完整 DDL + activate）。半途建的表壳激活报 *维护和保存 X 的技术设置* ⇒ **删表重建**。技术设置对齐同族（`APPL0 / size 0 / 不缓冲`）。
- **建表字段一律挂数据元素** — 能复用既有 DTEL 就复用；新建时「一律预定义 ABAP 类型、不建域」。
- **引用从未创建的数据元素 ⇒ 激活报「无法生成名称表」且不指名字段** — 曾误判成主键长度超限（实际那只是 WARNING）。**二分法**（保留主键 + 递增非主键字段）在 n=1 即失败即可锁定首个坏字段。编译器的字段判定比 DDIC 预读更权威。
- **`STRING` 数据元素走域不走预定义类型** — `type_kind='predefinedAbapType'` + `data_type='STRING'` 报「位置的数量 < 数据类型 256 的最小数量」，半成品被自动清掉；正解 `type_kind='domain'` + `type_name='STRING'`。
- **`ActivateFunctionGroup` 返回成功≠真激活** —— 并未激活 TOP include 与 FM，随后报 `XXX is invalid`。按 `FUGR/I`（include）→ `FUGR/FF`（FM）顺序直连 ADT 激活。
- **新建 FM 默认不远程使能** — 属性资源 PUT 把 `processingType` 改 `"rfc"`，媒体类型必须是 `application/vnd.sap.adt.functions.fmodules.v3+xml`（用 `application/xml` 返 406）；**URL 必须同时带 `corrNr`**，只带 `lockHandle` 会返 500 /「已在请求中锁定」——那是缺 `corrNr`，不是真锁。`CreateFunctionModule` 必须显式传 `transport_request`（不传报 `CTS_WBO_API 019` 误导性极强）。
- **`CheckStructure` 报「从数据库导入对象时出错」只说明 ADT 资源读不出** — 以「激活返回 + 上层结构检查 + 探针运行」三交叉为准。改结构行字段后引用它的 TTYP 会失效 ⇒ `ActivateObjects` 复活。`UpdateStructure` 对不存在的对象报 403 ⇒ 新对象必须 `CreateStructure`。`CreateTableType` 用 `row_type_name`。
- **DDIC 结构字段名允许前导下划线** — ADT 那句 *Names may consist only of A-Z "_" 0-9 (not leading)* 是**提示不是报错**。
- **建后核 `TADIR.MASTERLANG=1`**（中文环境）；判对象存活**别用** `TADIR-DELFLAG`（在用对象也是 X）或 `TLIBG`。
- **`E070-TRSTATUS='D'` 是「开发中」不是「已删除/已释放」** — 值域 `D`=Modifiable / `L`=Modifiable Protected / `O`=Release Started / `R`=Released。报 `CTS_WBO_API 038` 才是已释放。

---

## 8. 排查手法

- **500 先取 ST22** — `Error analysis` 段直接给 `procedure "XXX" "(FORM)"` + `CX_SY_*`，比逐个 FORM 猜快一个数量级。ADT dump 端点 404 时查 `SNAP` 表（`FLIST..FLIST08` 8×200 字符拼文本）；**`SNAP` 按集团分区**。
- **影子类打点一次看清执行路径** — 复制生产类、改类名、插 `lv_dbg = lv_dbg && 'A'` 累加，末尾一次输出；跑完删掉，零污染。**打点不要插进多行 `IF` 的条件续行里**（报 `Operator AND expected`）。
- **用「报错金额+张号」反推输入** — 先算「什么样的输入能产出这条消息」，再造探针逐字复刻该报错；复刻成功即证明根因，修完跑同一探针看全 PASS。
- **探针输出用字符串模板，不要裸字面量+字段** — `WRITE: / '标签=',字段` 位置对不齐、看上去值错位，会误导排查方向；`WRITE: / '字面量' 变量.` 还会激活报错。一律 `|KONTY=[{ gs_row-konty }]|`。SAP 列表宽约 80 列会截断长 JSON ⇒ 按 60 字符分段 WRITE。
- **探针内嵌长 JSON > 255 字符会被 ADT 拒** — 用**单引号字面量**切片拼接（双引号切片点易落在 `\"` 中间，拼出的 JSON 悄悄损坏、反序列化全空却不报错）。
- **`adt.js run` 输出不带 `[adt]` 前缀** — `grep '^\[adt\]'` 会吃掉全部，改用 `sed -n '/run status/,$p'`。
- **`adt.js query` 默认只回 100 行、不支持聚合函数** — 结果被字典序靠前的表挤掉，误判「表里没数据」；`MIN/MAX` 报 `Unknown column name`，只信 `COUNT(*)` 或改查全量再排序。
- **无头通道的硬边界** — dynpro / 弹窗 / F4 / 选择屏幕必输 / `SUBMIT` 带选择屏幕 全部测不了（`Screen output without connection to user`）。给选择屏幕字段加 `DEFAULT` 让后台可跑；把「GUI 目视项」列成清单交用户实点，**别声称已验证**。无头会话 `sy-langu` 常为 `EN`，只有中文的描述列为空属环境现象。
- **拿到外部归档/迁移包，先查它依赖的框架对象在不在** — 归档用了本系统没有的 `/thinkway/*` 或 `ZCL_XXX=>METHOD`，直接移植根本激活不了。先 `TADIR`/`DD02L` 核依赖，缺的换成本项目既有等价物。**同名表不是同一张表**，移植前核 `DD03L` 字段数。
- **编号别靠猜，去 FS 里反查** — 归档函数名在本集团常已被占用；FS 页签里通常有「原集团 ZCBS_ISCxxx」注记。查重时 `LIKE` 里 `_` 是通配符，必须 `ESCAPE '#'`。

---

## 9. 脚本与批量操作

- **沙箱 2 分钟超时会 SIGTERM 批量脚本** — 留半成品（`DD04L.AS4LOCAL='L'`、类型长度全空）+ `ESDICT` 残留锁，此后 `Create` 报 CSRF、`Update` 报 403 都解不掉。脚本必须支持 `ONLY=` 按名过滤、**每批 ≤5~10 个**；长任务后台跑；半成品先删再重建。
- **python 打补丁的锚点串会命中自己** — `s.index('FORM show_doc USING')` 命中了 `PERFORM show_doc USING` 里的子串（`PER`+`FORM`），把整个 FORM 吞掉。锚点加前缀限定（`'\nFORM '`、`'\n*&---'`）；改完立刻 `grep -c` 校验处数 + `wc -c` 校验字节数；能 `replace` 就别用正则。
- **批量补丁脚本必须带「生成后自检断言」** — 锚点命中数校验防不住「值错」（模板 `'%s'` 只喂流水号，四个文件的 `funcname` 全落成 `'003'`）。断言关键值（如 funcname 全名恰好 1 处、禁用词计数为 0），不过即非零退出、不写盘。
- **Edit/生成器会混入零宽字符，diff 看不出来** — `U+200B` 进标识符（`vgb?el`），编译期才炸。写含中文的 ABAP 后跑隐藏字符体检（`LC_ALL=C grep -n '[^ -~]'` 快筛，或 python 判 `ord>127` 且不在 CJK/全角区间），修法用 python `re.sub`。
- **行尾 CRLF/LF 变化会让 diff 变成全文替换** — 动手前确认源文件行尾，脚本锚点带 `\r\n`；diff 前 `diff --strip-trailing-cr`。
- **BSD grep 不支持 `\|`** — `grep -n "a\|b"` **静默无输出**，多次误判「改动没落地」。多关键字一律 `grep -E "a|b"`。本机最高频环境坑。
- **`TR_OBJECTS_INSERT` 在无头环境不可用** — 内部硬编码 `iv_with_dialog='X'`，弹 `TRINT_POPUP_EDIT_CANCEL_SHOW` ⇒ 短转储。改调 `TRINT_OBJECTS_CHECK_AND_INSERT` + `iv_with_dialog='D'`；`TTYP` 会被静默丢弃（`subrc=0`），需直接补写 `E071`。

---

## 10. 症状速查

| 症状 | 去这里 |
|---|---|
| 激活报错但文案与代码对不上 | §2（段序/关键字位置/类型名） |
| 激活 200、跑起来空/旧 | §1（`activationExecuted`、双版本比对、include active 版） |
| 返回 S，值没变 | 转 `sap-abap-bapi-usage` → `references/_静默失效清单.md`（x 结构、CHAR1 标识、VALUEPART 分块、TVEPZ） |
| 数据错位/金额恒空/列错乱 | §3.1（`INTO TABLE` 按位置、APPEND 改 sy-tabix、JOIN 退化） |
| ALV 列标题空白 / 标签文字为空 | §3.3（匿名类型无 DD03T、文本元素未激活） |
| 按钮点了没反应 | §5（`POPUP_GET_VALUES` RETURNCODE 写反） |
| F4 弹不出 / 弹出来一点就 dump | §5（`INTTYPE` 推导、`INTLEN` 字节长度） |
| 无头跑起来 500 | §8（ALV 前的 WRITE、选择屏幕必输、dynpro） |
| 接口返 200 但没成功 | §6（无 `code` 键、三重判定） |
| 日志/快照在失败时丢失 | §4（LUW 被 ROLLBACK 吃掉，写库前独立 COMMIT） |
| 一直报「被锁」 | §1（三种假锁 vs SM12 真锁） |
| 建表激活报「无法生成名称表」 | §7（引用不存在的 DTEL，二分法） |
| 跑起来 dump、看不出哪一句 | §8（ST22 的 `procedure` + `CX_SY_*`） |

---

## 11. 新项目开工 checklist

按时间顺序过，每项都是「执行点提醒」，不是原则复述。跳步的代价在后面某处等着。

### 阶段 0 · 进场摸底（写第一行代码前）

- [ ] **测集团**，不看文档看行数：哪个集团是空壳、哪个有数据（`SELECT COUNT(*)` 打 `BKPF`/`EKKO`/`BSEG`）。查真实数据与建对象的集团经常不是同一个。
- [ ] **测通道**：ADT 是否可用、MCP 是否已信任、代理是否放行（写请求必须 `proxy: false`）。先跑一个只读查询验证，别等推源码时才发现连不上。
- [ ] **定语言环境**：是否强制中文？影响面比想象大 —— DDIC 主语言 `TADIR.MASTERLANG`、域固定值 `DD07T`、科目描述落 `T004-DSPRA` 而非登录语言、无头会话 `sy-langu` 常是 `EN`。
- [ ] **问红线**：有没有「框架/接口平台代码一律不许改」的范围？有没有禁改的标准表？先问清，避免白干。
- [ ] **收模板**：有没有既有开发模板、命名规范、代码风格样例？有就照抄同类型**正在跑**的程序当范式，别自由发挥。

### 阶段 1 · 动手前（每个对象）

- [ ] **命名先报方案**：类型 + 建议名 + TADIR 查重（`LIKE 'ZXXX%'` 的 `_` 是通配符，必须 `ESCAPE '#'`）+ 编号延续理由，等点头再建。
- [ ] **请求号由用户给**，不自行创建、不臆测。已有请求号的既有对象，后续改动复用原号。
- [ ] **改既有对象：回读现网**。`get_source` + 文本元素回读（`get_source` 不含 TEXTPOOL）+ 与备份 diff 确认零差异。本地归档只作比对，不作基线。
- [ ] **查标准函数源码，别猜形参**：`SELECT parameter, paramtype, structure FROM fupararef WHERE funcname = '...'`。类型不匹配常在**运行期**才炸，编译期静默。
- [ ] **确认调用形态**：是静态方法还是实例方法？是不是远程使能（`processingType = 'rfc'`）？
- [ ] **先定「成功判据」**：不是返回值、不是 HTTP 状态，而是**落库对账口径**（哪张表哪几个字段、期望什么值）。写代码前定好，否则事后无法证明做对了。

### 阶段 2 · 编码自检（推源码前过一遍）

- [ ] 多字段 SELECT 逗号分隔；`@` 宿主变量与 `WHERE` 里常量都已转义。
- [ ] 没有「显式列清单 + 预声明整表类型」的 `INTO TABLE`（按位置赋值，静默错位）。
- [ ] FORM 形参：无 `TYPE c LENGTH n`、无内联表类型、`TABLES` 在 `USING` 之前。
- [ ] 循环体内 `lv_tabix = sy-tabix` 先存，之后不再取 `sy-tabix`（`APPEND` 会改写它）。
- [ ] `READ TABLE` 失败后的 `sy-tabix = 0` 有防御（`DELETE INDEX 0` 直接 dump）。
- [ ] 日期/金额/字符：`ALPHA = IN`（`MATNR` 用 `CONVERSION_EXIT_MATN1_INPUT`）、13 位时间戳走 `cl_abap_tstmp`、`NUMC` 拼接跳过前导零。
- [ ] 字段全挂数据元素（匿名类型无 `DD03T` ⇒ ALV 列标题全空）。
- [ ] 文本元素编号按模板；消息不用 `MESSAGE TEXT-xx WITH`（不合法）。
- [ ] fieldcat 的 `fieldname` 与内表结构逐项比对（写错激活不报、运行才炸）。
- [ ] 无零宽字符、行尾统一（`LC_ALL=C grep -n '[^ -~]'` 快筛）。

### 阶段 3 · 交付

- [ ] **四步顺序**：推源码 → 推文本元素（`PROG/PX` 须单独激活）→ 验证激活 → 生成 CUA。
- [ ] **激活验证看 body**：`activationExecuted` + `?version=active` 回读，不看 HTTP 200。
- [ ] **落库/报文对账**：逐字段或逐键核，重点核「值恰为空」的字段（探针跑通不代表结构完整）。
- [ ] **注释口径**：留骨架、删叙述；剥离后 diff 证明代码本体零改动。
- [ ] **归档三处**：报告进 `测试报告/`、交付源码进模块目录、改前备份进 `backup/<对象>_<日期>/`。
- [ ] **测试对象删干净**：留档 → 删 → 回查 `TADIR` 清零。只删本轮自己建的。

### 阶段 4 · 收尾

- [ ] **无头测不了的 GUI 项**（按钮、弹窗、F4、选择屏幕交互）列成清单交用户实点，**不要声称已验证**。
- [ ] 遗留项、待确认口径、被绕过的设计写进报告，别留在脑子里。
- [ ] **经验回流**：本轮新踩的坑，补进本技能 §3 或对应分节（现象+根因+解法，一句话即可）。

---

## 关联技能

| 技能 | 何时转过去 |
|---|---|
| `sap-abap-bapi-usage` | ★ **BAPI 索引**：一个 BAPI 一个文件，索引表按名 / 按任务 / 按症状三路查 |
| `sap-abap-prog-push-run` | 报表程序的推送、激活、运行、测试报告模板 |
| `sap-ddic-object-ops` | 域/数据元素/表/结构的建与改操作步骤 |
| `sap-json-interface-mapping` | `name_mappings` 细节、三形态探针 |
| `sap-cua-gui-status-functions` | GUI 状态批量登记 |
| `sap-tcode-create` | 建事务码 |
| `sap-dump-to-excel-cell` | 从短转储反查 Excel 出错单元格 |

> 项目侧约定（强制 ZH、瘦函数体+FORM、命名规范、交付四步）不在本技能，见你自己项目的作业总纲（写法参照仓库 `examples/project-ops-template.md`）。
