# ABAP 踩坑完整案卷（含出处与代码）

`SKILL.md` 是提炼版；本文件是**全量证据层**，用于回溯「这条是哪一次踩的」以及需要完整代码片段时查阅。
出处格式：`测试报告/<文件名>` 或 `.workbuddy/memory/<日期>.md`。

---

## A. 语法与编译

**A1. `SELECT ... INTO <结构> UP TO 1 ROWS` 被判为循环，缺 `ENDSELECT`**
改 `INTO TABLE @DATA(lt)` + `SORT` + `READ TABLE ... INDEX 1`。
出处：ZFIR_0224_付款凭证生成逻辑调整_20261020 §3.1

**A2. `ASSIGN ... CASTING TYPE c LENGTH <变量>` 本版不支持**
`LENGTH` 后必须字面量；去掉后运行期 `DUMP: Invalid subfield access`。正解：
```abap
cl_abap_container_utilities=>fill_container_c(
  EXPORTING im_value = iv_value
  IMPORTING ex_container = lv_msg ).   " lv_msg TYPE c LENGTH 960
```
与标准函数内部 `READ_CONTAINER_C` 互逆。**别手写 `ASSIGN ... CASTING`**。
出处：ZBPM_ISP016 §5.6；ZCL_EPIC_HKRL 相关报告

**A3. `DESCRIBE FIELD` 的 `TYPE` 必须写在 `COMPONENTS` 之前**
只取组件数也得写：`DESCRIBE FIELD cs_data TYPE lv_type COMPONENTS lv_count.` 再 `DO lv_count TIMES. ASSIGN COMPONENT sy-index OF STRUCTURE cs_data TO <fs>.`
出处：ZBPM_ISP016 §5.4

**A4. `FORM ... TABLES` 必须写在 `USING/CHANGING` 之前**
写成 `USING ... CHANGING ... TABLES` 报 `Field "TABLES" is unknown.`（把关键字当形参名）。`PERFORM` 调用侧同理。
出处：ZFID001C_认领弹窗字段F4搜索帮助 §六；2026-10-16.md

**A5. 含 `STRING` 字段的表不能用于 `TABLES` 声明**
报 `"ZIFLOG" must be a flat structure…` + `Field "ZIFLOG-FUNCNAME" is unknown.`。改 `DATA gv_x TYPE ziflog-x.` + `SELECT-OPTIONS s_x FOR gv_x`。
出处：ZIFLOG_接口报文日志 §十.1

**A6. `CONSTANTS` 必须带 `VALUE`**
`CONSTANTS: c_x TYPE flag.` 报 `"VALUE ..." is not specified.`
出处：2026-09-15.md

**A7. `MESSAGE TEXT-xxx TYPE 'S' WITH n` 不合法**
文本符号不能作带 `WITH` 的消息文本。走辅助 FORM（范式 `frm_msg_count`）：
```abap
lv_text = pv_text.
REPLACE '&' IN lv_text WITH lv_num.   " 两处占位就调两次
MESSAGE lv_text TYPE 'S'.
```
出处：2026-09-15.md、2026-09-17.md

**A8. 定长字符类型不存在 `char<n>` 这个名字**
`TYPE char1000` / `char55` / `char220` 全部非法（`Type "X" is unknown`）；`GUI_ICTXT` 应为 `GUI_ICTEXT`；`ZTEPIECE` 应为 `ZTEPICE`。**猜类型名=浪费一轮激活**，不确定就 `get_source` 看 DDL 或查 `DD04L`。
出处：2026-09-17.md、2026-09-29.md、2026-10-08.md

**A9. `class=>method` 只能用于静态方法**
`CREATE_F04` 是实例方法 ⇒ `CREATE OBJECT lo_hkrl. lo_hkrl->create_f04( it_epic03a = lt_3a ).`
出处：ZFID001C_过账改调ZCL_EPIC_HKRL §4

**A10. `$TMP` 探针内不能定义 FORM；方法体外的注释不保存**
探针报 `Statement is not accessible`（`CheckProgram` 反而不报）；类里 `ENDMETHOD` 与下一个 `METHOD` 之间的注释报 `The class contains unknown comments which can't be stored`。探针用 `DEFINE` 宏或内联代码；方法注释移到方法体第一行。
出处：ZFM_FII001_SPLIT §9.3；ZBPM_ISP016 §5.5；ZCL_EPIC_HKRL_流程号 §29

**A11. 表达式与字面量三类陷阱**
① `CONCATENATE ... INTO` 不接受数值型（`lv_cnt TYPE i` 报 must be character-like）；
② 内建函数（`strlen`/`lines`）不能直接进 `&&`（报 `The syntax for a method specification is objref->method`，一次报一批误导成箭头语法错）；
③ `0.5` 这种带小数点字面量在 SELECT/赋值里报 `statement "5" is invalid`；`DEC` 字段用字符串赋值报 `cannot be interpreted as a number`。
解法：数值一律字符串模板 `|...{ lv_cnt }...|`；内建函数先算到变量；小数写 `'0.5'` 并确保目标是数值类型。
出处：2026-09-22.md、2026-10-08.md、2026-11-02.md、2026-10-10.md

**A12. `REPLACE ALL OCCURRENCES OF ... WITH ''` 会 endless loop**
删空格/删字符改逐字符过滤：
```abap
lv_len = strlen( lv_txt ).
DO lv_len TIMES.
  lv_i = sy-index - 1.
  IF lv_txt+lv_i(1) <> ' '
     AND lv_txt+lv_i(1) <> cl_abap_char_utilities=>horizontal_tab.
    lv_out = lv_out && lv_txt+lv_i(1).
  ENDIF.
ENDDO.
```
出处：2026-09-23.md

**A13. `CALL TRANSACTION ... WITH f1 v1` 不是合法语法**
`WITH` 只接 `AUTHORITY-CHECK`（报 `"AUTHORITY-CHECK" was expected`）。传参只能 `USING bdcdata`；SM30 首屏只有表名一个字段（`VIMDYNFLDS` 无更新模式字段）。打开表维护标准写法：
```abap
CALL FUNCTION 'VIEW_MAINTENANCE_CALL'
  EXPORTING action = 'U' view_name = 'ZTFI0005'.   " U = 直接进修改模式
```
出处：2026-11-11.md

**A14. `SELECT-OPTIONS` 名 ≤ 8 字符；`MODIF ID` 不拦值**
`S_ZYHJYLS`/`S_ZBPMLCH` 9 字符首次激活被拒。改短名须**同步改文本元素 `selections` 条目名**（旧变式存旧名会被静默忽略，只提示不报错）。`MODIF ID` 只控显隐，隐藏字段已填的值仍参与过滤 ⇒ 用 RANGE 在取数侧拦住。
出处：2026-09-17.md、2026-11-10.md、2026-10-21.md

**A15. 多字段 SELECT 必须逗号分隔，`@` 必须转义**
`SELECT bschl shkzg koart xsonu` 报 `elements in the "SELECT LIST" list must be separated using commas`；`UPDATE ... SET` 多赋值同理；`WHERE` 里常量（含 `CONSTANTS`）同样要 `@`。反复踩的老约定。
出处：2026-09-14 / 09-24 / 09-29 / 10-09.md

**A16. `INTO` 与 `UP TO n ROWS` 位置以激活器报错为准**
带 JOIN/子查询/SQL 表达式（`upper( )`）属严格模式，强制 `INTO` 在最后（`SELECT 563`）；`UP TO n ROWS` 必须在 `WHERE` 之前、紧贴 `INTO TABLE`。默认写 `SELECT ... FROM ... UP TO n ROWS WHERE ... INTO TABLE @DATA(lt)`，改完必 `CheckProgram`。
出处：2026-10-22.md、2026-11-11.md、2026-10-12.md

**A17. FORM 形参三类禁忌**
① `TYPE c LENGTH n` 非法（`Numeric literals cannot be used as field names`）；
② 定长 `TYPE char15` 收不同长度实参报 incompatible；字面量与文本符号免编译检查，但文本符号传固定长度形参仍**运行期 500 `Type conflict when calling a FORM`**（ZFIR_0224 实测 TEXT-041 传 `TYPE char10`）；
③ 不能内联 `TYPE STANDARD TABLE OF x WITH DEFAULT KEY`（报 `Different number of parameters in FORM and PERFORM`，形参被算成 8 个）；
④ `FIELD-SYMBOL` 在 FORM 里声明是局部，跨 FORM 必须改全局。
解法：定长用 `TYPE char<n>` 或 DDIC 类型；跨长度用泛型 `TYPE c`；表类型先 `TYPES ty_x_tab TYPE STANDARD TABLE OF ... WITH DEFAULT KEY.`。
出处：2026-10-10.md、2026-09-17.md、2026-10-15.md、2026-10-30.md

**A18. `CALL FUNCTION` 段序与形参方向**
段序 `EXPORTING → IMPORTING → CHANGING → TABLES → EXCEPTIONS`；把 `TABLES` 写前面报 `Unable to interpret "EV_OBJNR"`。被调方 `EXPORTING` 形参写在调用方 `IMPORTING` 段，写反报 `CALL_FUNCTION_PARM_UNKNOWN`（`Function parameter "ES_RETURN" is unknown.`）——**极易误判成 FM 接口没生成**，为此白查 `FUPARAREF`/`GetFunctionModule` 一圈。
判据：拿一个肯定能用的接口 FM 同样调一次，也报错就是你调用方写错了。
出处：2026-09-22.md、2026-10-15.md

**A19. `DDIF_FIELDINFO_GET` 的 `FIXED_VALUES` 是 `DDFIXVALUES`（TABLES 参数）**
传自定义结构编译不报、运行期 500 `Type conflict in a function module call`。查 FM 形参类型别猜：
```sql
SELECT parameter, paramtype, structure FROM fupararef WHERE funcname = '...'
```
出处：2026-10-16 相关报告

**A20. 手写拼接「正文 + 驱动 FORM」必须补换行**
缺换行导致 `ENDFORM.*& 以下 FORM…`，激活报 `The statement "*&" is invalid` + `FORM FRM_E2E_SET does not exist`（真实原因：FORM 定义被吞）。用标准生成器 `gen_e2e_harness.js`；其 `replace` **只作用于生产源码、不作用于 `dumpForm`**。
出处：2026-09-23.md

---

## B. SELECT 与内表

**B1. 显式列清单 `SELECT ... INTO TABLE <预声明整表类型>` 是按位置赋值**
四种表现：`DD07T` 的 `DOMVALUE_L` 落进 `DOMNAME`（11 行全空）；`LT_FILE` 报 `component "ZJK" not compatible with "ZJYRQ"`；`COEP` 的 `WKGBTR` 落进 `MEGBTR`（金额恒空）；`ZTEPIC3A` 第 3 组件 `ZJK`(CHAR10) vs 第 3 列 `ZJYRQ`(CHAR8)。
解法三选一：`SELECT *` / `INTO TABLE @DATA(...)` 内联 / 自建列序一致的窄结构；或 `INTO CORRESPONDING FIELDS OF TABLE`。
**一个坑在 5 份报告里复发。** 现网 `ZFKLSH` 段没雷，正因它用 `@DATA(lt_3a)`。
出处：ZFID001A_单据状态改域驱动 §四坑1；ZIFLOG §十.2；ZFID001A_回单票据文件改取ZTEPIC3A §三；ZFID003 D-02；ZFID004_ZTFI0002扩展字段 §3.1

**B2. `APPEND INITIAL LINE ... ASSIGNING <fs>` 会把 `sy-tabix` 改写成新行索引**
段索引记成 1、2、3…（段序号），`idx_to` 却是真实行号 ⇒ 区间跨键放大、阶梯明细重复输出（128 行变 558 行，同一记录最多重复 43 次）。
解法：循环首行 `lv_tabix = sy-tabix.`，后续一律用 `lv_tabix`；段构建改局部结构 + `APPEND`，不用字段符号。
出处：ZMMR004_采购价格阶梯报表 §3.3

**B3. `READ TABLE ... WITH KEY` 未命中把 `sy-tabix` 置 0 → `DELETE INDEX 0` 转储**
500 + 短文本 `Error in ABAP statement while processing an internal table.`，运行期 `TABLE_INVALID_INDEX`。
解法：循环首行 `lv_rowidx = sy-tabix.`；删除段加防御 `IF lv_delidx >= 1 AND lv_delidx <= lines( ct_alv ).`
出处：ZFID001B_审批流转落库 §4.1

**B4. `AT NEW` / `AT END OF` 按物理相邻判组，ALV 回写后失效**
点「模拟导入」再点「正式导入」必失败，单点正常。1002 行被切成 500+2+500 三段，每段 ≤999 ⇒ 不触发拆分、不补轧差 ⇒ `Balance in Transaction Currency`。根因 `REUSE_ALV_*` 就地重排 `t_outtab`（用户按消息列排序即触发）。
解法：外层遍历去重键 × 内层按键收集明细，组边界只认业务键。
出处：ZFM_FII001_SPLIT §7.8

**B5. `DELETE ADJACENT DUPLICATES ... COMPARING <非键字段>` 会吞数据**
A017 后台 3 段、前台只出 2 段（同一 `KNUMH` 的后续有效期段被吞）。`A017` 主键含 `DATBI`，`KNUMH` 不是键。改 `SORT BY knumh datbi` + `COMPARING knumh datbi`；有效期列取段区间而非抬头全期间。
出处：ZMMR004 §九

**B6. `LEFT JOIN` 右表字段写在 `WHERE` 里语义退化成 `INNER JOIN`**
右表无匹配为 NULL，`WHERE eine~loekz = @space` 不成立。过滤条件移进 `ON`。
出处：ZMMR004 §9.6

**B7. 三层 `LOOP ... WHERE` 是 O(A×K×M)**
条件记录多工厂多供应商时耗时按乘积增长。改 `frm_build_seg` 一次扫描建「键 → 起止行号」段索引，`READ TABLE ... BINARY SEARCH` 定位 + `LOOP AT ... FROM idx_fr TO idx_to`。
出处：ZMMR004 §六

**B8. `FOR ALL ENTRIES` 键表规模线性放大成超长 OR 链**
含 `LRAW`（`STXL-CLUSTD`）列时有优化告警（仅 W）。键表分批（每 500 个键一轮）。
出处：ZBPM_ISP014 §六.2 / §4.3.6

**B9. 循环内逐条查库 → 整批一次**
10 个文本标识在「抬头 + 行项目」循环里逐条查 `STXL`：**13,650 次数据库往返（≈9.7 s）**；改一次 `FOR ALL ENTRIES` 取回 + 内存 `IMPORT` 解簇后整接口 **713 ms**。
另一例：`CREATE_F04` 每次进入都 `SELECT * FROM ZTEPIC3D` + `SELECT * FROM SKB1 WHERE SAKNR LIKE '1001%'`，逐行调用等于全表扫描 N 次。
出处：ZBPM_ISP014 §2.1；ZFIR_0224_改用ZCL_EPIC_HKRL §3.2

**B10. 内联 `DATA(...)` 在 `IF` 分支里，条件不成立时内表从未创建**
`LOOP AT lt_epic01` 短转储。改方法头部显式声明。
出处：ZCL_EPIC_HKRL_流程号关联修复 §3.3

---

## C. BAPI / 标准函数 / 接口

**C1. `BAPI_ACC_DOCUMENT_POST` 缺 `OBJ_TYPE` / `BUS_ACT` 必报错**
`ls_head-obj_type = 'BKPFF'`、`ls_head-bus_act = 'RFBU'`。常被当成"可选元数据"漏传。
出处：ZCL_EPIC_HKRL_流程号关联修复 §22

**C2. `BAPIACHE09` 没有 `EXCH_RATE` 字段**
模板填汇率 7，过账后 `BKPF-KURSF = 8.28000`（OB08）。单币 00 行带 `EXCH_RATE` 时抬头取 7；双币（00+10）只给 00 行带汇率时系统按 OB08 重定。⇒ `CURR_TYPE='10'` 行也必须 `ls_curramt-exch_rate = gs_head-kursf.`（明细行与轧差行各一处）。
出处：ZFM_FII001_SPLIT_双币抬头汇率 §二/§三

**C3. 双币凭证每个 `ITEMNO_ACC` 必须给两条 `CURRENCYAMOUNT`，且每种币种小计为 0**
只给部分行 `CURR_TYPE='10'` → `Inconsistent currency information`。`00`（凭证货币 `WRBTR`）与 `10`（公司代码货币 `DMBTR`）是并列两套金额。拆分产生的轧差行同样要补；有按汇率补足的行时，分位尾差吸收到最后一行。
出处：ZFM_FII001_SPLIT_本币金额按原值过账 §三

**C4. `BSEG-BUZEI` 是 `NUMC(3)`，单张 999 行物理上限；BAPI 实际只吸纳 990 行**
1080 行报 `Maximum number of items reached in FI`；分片 998+1 时落库 3 张而 `ET_DOC` 只回 2 条。分片上限 `989 明细 + 1 轧差`（`c_max_detail = 989`）；边界用例覆盖 999/1000/1997（1997 按 `>999` 判会切出 1000 行而溢出）。
出处：ZFM_FII001_SPLIT_凭证拆分创建 §三/§7.9

**C5. 二次拆张时 `OBJ_KEY` 只回一个凭证号**
1067 行报「已拆分为 2 张」实际落 3 张；片 1 的 991~998 行被错指为 `0100000168`（实为 `0169`）。`OBJ_KEY` 布局 `凭证号(10)+公司代码(4)+会计年度(4)`，年度在 **`+14(4)`**（常被误写 `+10(4)` 取到公司代码）。解法：程序分片与接口拆张不重叠（下调 `c_max_detail`）。
出处：ZFM_FII001_SPLIT §7.8/§7.9；本币金额 §三.4

**C6. 特别总账标识 `UMSKZ` 在三个 BAPI 结构里都没有字段**
`BAPIACGL09`/`BAPIACAR09`/`BAPIACAP09` 均无 ⇒ 票据类（W/S）走标准 BAPI 通道时被静默丢弃、科目记错。`UMSKZ ∈ (W,X,Y,S)` 时整张走 `POSTING_INTERFACE_START/DOCUMENT/END`（FB01 批输入），或确认 `ACC_DOCUMENT` 增强后经 `EXTENSION2` 传。
出处：ZCL_EPIC_HKRL_流程号关联修复 §8

**C7. 科目字段状态组的隐性必输项**
① `Account 8000000000 requires an account assignment relevant to cost accounting` ⇒ P&L 科目不能当轧差/中转科目；`I_TRANS_HKONT` 必须传公司代码下、字段状态组不要求成本对象的资产负债类科目（建议 `XBILK='X'`）。
② `Field Reason Cde is a required field` 但标准检查看不到原因代码 ⇒ `RSTGR` 只经 `ZSFI_BSEG`/`ZEXTEN` 扩展传给 BADI，须挂 `EXTENSION2` 且 `ITEMNO_ACC` 指对行号。
出处：ZFM_FII001_SPLIT §五；ZCL_EPIC_HKRL_流程号 §16

**C8. `BAPI_USER_EXISTENCE_CHECK` 对本系统任何账号都返 0**
`023476`（不存在）、`ZZZZZZ999` 全通过 ⇒ 单据转给无效账号后两个界面都看不到、程序内无入口收回。改直查 `USR02` + 长度防护：
```abap
IF lv_len = 0 OR lv_len > 12. RETURN. ENDIF.
SELECT SINGLE bname FROM usr02 INTO @lv_dummy WHERE bname = @lv_user.
```
出处：ZFID001C_财务转移后数据不可见 §三/§四

**C9. `READ_TEXT` 的 `NAME` 形参是 `TDOBNAME(70)`**
本系统数据元素 `TDNAME` 是 `CHAR16`（域 `TDCHAR16`）⇒ 实参 `TDNAME` 触发运行期 `500 Type conflict during a function module call`（空入参正常、一命中数据就崩）。形参改 `TYPE tdobname`，或直读 `STXL` 簇表 + `IMPORT`（注意不解析 `TDREFNAME` 文本引用）。
出处：ZBPM_ISP014 §4.1

**C10. `SD_SALESDOCUMENT_CHANGE` 入口对两表各自排序**
入口 `sort item_in by itm_number` + `sort item_inx by itm_number` ⇒ 删除行必须两表都填 `ITM_NUMBER`；只填 `ITEM_INX` 会错位，空行被当新行参与项目类别确定，报完全不相关的 `T184 没有可用的项目类别`。
出处：ZBPM_ISP016 §4.3 / §5.2

**C11. `BAPE_VBAK`/`BAPE_VBAP` 首字段是键位，修改模式必须随单号下发**
值 `move-corresponding` 进 `E_VBAKKOM`，`VBELN` 留空就把单号覆盖成空 → `V1 045 输入凭证编号` → `V4 219 销售凭证没有修改`（**根因看 `V4 219` 前面那条 E 消息**）。值结构与标识结构都塞 `vbeln = iv_vbeln`（行项目再加 `posnr`）；修改模式传 `lv_vbeln`，**创建模式传 `space`**（创建时单号尚未生成，留空对 `move-corresponding` 无害）。
出处：ZBPM_ISP016 §4.6

**C12. 修改模式更新标识字段的数据元素必须是 `CHAR1`**
`GET_CHANGEABLE_FIELDS` 用 `DDIF_NAMETAB_GET` 后只滚 `WHERE rollname = 'CHAR1' OR rollname = 'CHAR01'` 的字段；`BAPIUPDATE` 的全部被排除 ⇒ 返 S、值不变、零报错，而创建路径不走此清单 ⇒「创建能写、修改写不进」。改 `ZSVBAKKOZX` 14 个 / `ZSVBAPKOZX` 10 个，联动核 `VBAKKOMX/VBAPKOMX` 的 `ROLLNAME`。**不可改回 `BAPIUPDATE`。**
出处：ZBPM_ISP016 §4.7

**C13. `BAPIPAREX-VALUEPART1` 只有 240 字符**
`BAPE_VBAP` 实测 271 字符 ⇒ `YL3~5` 全空、无报错。
```abap
valuepart1 = lv_msg(240).  valuepart2 = lv_msg+240(240).
valuepart3 = lv_msg+480(240).  valuepart4 = lv_msg+720(240).
```
序列化只用 `cl_abap_container_utilities=>fill_container_c`（与 `READ_CONTAINER_C` 互逆）。
出处：ZBPM_ISP016 §4.8 / §2.4.2

**C14. 清空长文本功能码必须 `003`，且删除前先查 `STXH`**
传 `&&` 返 S 但 `STXH` 仍在、`TDTXTLINES=00001`（`WHEN OTHERS` 走 `CREATE_TEXT`）；`DELETE_TEXT` 在目标不存在时 `MESSAGE E600 RAISING NOT_FOUND` 并把 E 消息塞进返回表 ⇒ 幂等再清一次接口整体变 E。清空前先按 `TDOBJECT + TDNAME(+行号) + TDID + TDSPRAS` 查 `STXH`，不存在即跳过。
出处：ZBPM_ISP016 §4.4 / §4.5

**C15. 新增定价条件不能指定步骤号**
硬编码 `COND_ST_NO='001'`，而 `T683S` 中 `ZP01` 在 `STUNR=010` ⇒ `000010:在定价过程ZGSDC1中定价类型ZP01不在步骤编号001中`。用「条件是否已存在（`PRCD_ELEMENTS` 命中）」驱动：命中才回填 `COND_ST_NO`/`COND_COUNT` 并置 `UPDATEFLAG='U'`，否则只置 `'I'`；去掉 `LOGIC_SWITCH-COND_HANDL = 'X'`。
出处：ZBPM_ISP016 §4.2

**C16. 无计划行订单类型（借/贷项凭单）数量只能走 `TARGET_QTY`**
`Z014` 创建返 S 但 `KWMENG=0`、`ZMENG=0`、`NETWR=0`、`VBEP` 0 行。`BAPISDITM` 里没有任何字段参考 `KWMENG`；该类项目类别在 `TVEPZ` 无配置 ⇒ 不产生计划行，`BAPISCHDL` 被静默丢弃。
```abap
cs_itm-target_qty  = is_item-kwmeng.
cs_itmx-target_qty = 'X'.
```
判据用 `TVEPZ` 有无条目，**不能用 `TVAP-LFREL`**（`Z001` 与 `Z014` 的 `LFREL` 都为空）、也不能用 `VBTYP`（`Z002='I'`、`ZQT='B'` 实测都有计划行）。
读取侧同一坑：`ZBPM_ISP014` 直取 `VBAP-KWMENG` 时借贷项恒 0，数量在 `VBAP-ZMENG`（300 实测借贷项 31 行 `KWMENG=0`/`ZMENG` 有值，其余 13 类单据 `ZMENG` 全空）⇒ 回填「`KWMENG` 非空优先、为空回退 `ZMENG`」；借贷项在 `VBEP` 无计划行，`SCHED` 段为空是正常形态。
出处：ZBPM_ISP016 §4.11/§4.13；ZBPM_ISP014_借贷项单数量取ZMENG

**C17. 参考单据三件套，缺一即报错**
行项目 `REF_DOC` + `REF_DOC_IT` + **`REF_DOC_CA`**；抬头 `BAPISDHD1-REF_DOC` + `REFDOC_CAT`。
只传编号+行号 ⇒ `V2 068「凭证 &1 不含凭证类别 &2 但含 &3」`（`&2` 空）；行号填 0 或单据不存在是同一条消息但 `&3` 为空。三者指**被参考单据**的编号/行号/类别，不是本单行项目号。类别查被参考单据自身 `VBAK-VBTYP`，**不要无脑取抬头 `VGTYP`**；参考销售订单是 `'C'`。
出处：ZBPM_ISP016 §4.9/§4.12

**C18. 退货订单 `Z011`（`VBTYP='H'`）**
`PSTYV` 传 `Z011` 或留空（留空由 `T184` 自动定）；沿用 `Z001` 必报 `V1 321「没有为项目 &2 定义项目类别 &1」`（`T184` 里 `Z011+NORM→Z011`、`Z001+NORM→Z001` 两套独立配置）。数量传正数；编号走 `Z5` → `60000000xx`。
出处：sap-abap-bapi-usage → references/sd-reference-doc-return.md

**C19. `GL_ACCT_MASTER_SAVE` 三条隐性必输约束**
`FH 743 Description missing in maintenance language` ⇒ 描述必须落在**科目表维护语言**（`T004-DSPRA`，公司代码层 `T001-SPRAS`）而非登录语言；
损益类报 `Make an entry in field "P&L statmt acct type"` ⇒ `GVTYP='X'`；
成本要素报 `Required field VALID_FROM is empty` ⇒ `DATAB=19000101 / DATBI=99991231`。
另：`XSPEA`/`XLOEV` 不能在「新建」时置位（标准保护），须先建后改。
出处：ZFIB003_会计科目批导_BAPI改造 D-02~D-04；ZSAP_ISP001_V1.1 D-01/L-01

**C20. `SD_SALESDOCUMENT_CHANGE` 不内部提交**
`CALL_FROM_BAPI='X'` 时更新挂 update 队列。为做「锁单+过账同事务」删掉 `COMMIT WORK AND WAIT` 后，保留的 `SELECT vbak` 回读校验必然误判「冻结标志未更新」。要原子性就把锁单前置到过账之前、去掉各自提交、删除回读；要独立提交就保留提交并保留回读。过账失败分支必须补 `ROLLBACK WORK`，否则挂起的 SD 更新悬空到下一次提交被误落库。
出处：ZCL_EPIC_HKRL_锁单与过账同事务 §二/§三

---

## D. 弹框 / F4 / ALV / 选择屏幕 / CUA

**D1. `POPUP_GET_VALUES` 返回码语义写反 → 点确认静默 RETURN**
`LSPO4U01`：`IF ok_code_save = 'CANC'. returncode = 'A'. ELSE. fill_values. returncode = space.`
写成 `IF sy-subrc <> 0 OR lv_rc <> 'A'. RETURN.` 会把确认当取消 ⇒ **点「认领并过账」后无任何反应**（无消息、无动作、无转储）。正确 `IF sy-subrc <> 0 OR lv_rc = 'A'.`（A 才是取消）。
出处：ZFID001C_认领弹窗按类型显示字段与确认无反应修复 §二

**D2. `POPUP_GET_VALUES` 只在字段挂得住 DDIC 搜索帮助时才弹 F4**
判据 `F4IF_DETERMINE_SEARCHHELP`（0=有 / 2=字段在但无帮助 / 1=字段不存在），内部走 `svali-tabname`(可带 `*`) + `svali-fieldname` → `F4IF_FIELD_VALUE_REQUEST`。
两条路：① 借现成帮助（`SKA1-SAKNR`/`CSKS-KOSTL`/`AUFK-AUFNR`/`VBAK-VBELN`/`BSEG-UMSKZ`）——**代价是字段属性跟着变**（长度 + **ALPHA 输入转换**），`'8000'` 变 `'000008000'`，校验误报且存库格式变；② **自建出口（推荐）**：`POPUP_GET_VALUES_USER_HELP` + `f4_formname` + `f4_programname = sy-repid`，字段属性不变。出口 FORM 由 FM 以 **5 个 `USING`** 调用（`tabname/fieldname/display_flag/returncode/value`），**选中值写回第 5 个形参并把 `returncode` 置 `'F'`** 弹框才 `DYNP_VALUES_UPDATE` 刷屏（拿不到 `sy-stepl`，不要走 dynprofield 回填）。判定取消仍按 `returncode = 'A'`。
★ `POPUP_GET_VALUES_USER_HELP` 的 F4 出口里调 F4IF 系是合法的（`LSPO4I20` 第 65-67 行用户出口与标准 F4 分支互斥，第 89-94 行由屏幕 F4 事件直接 `PERFORM (f4_form_name) IN PROGRAM (f4_program_name)`）。
出处：ZFID001C_认领弹窗字段F4搜索帮助 §三/§7.4；ZFID001A_付款账号搜索帮助 §3.1

**D3. `F4IF_INT_TABLE_VALUE_REQUEST` 的 `FIELD_TAB` 必须能推出 `INTTYPE`**
推导链 `TABNAME → INTTYPE → DATATYPE → DOMNAME → ROLLNAME`，全落空即 `SAPLSDHI` 第 161 行 `message DH208 raising parameter_error` ⇒ 按 F4 弹不出、`sy-subrc=1`；编译与激活都不报，**只在一按 F4 时炸**。
最小填法：`FIELDNAME + DATATYPE='CHAR' + INTTYPE='C' + LENG + OUTPUTLEN + REPTEXT/SCRTEXT_S/M/L`（`REPTEXT` 等写列标题）。`OUTPUTLEN` 兼作列宽（为 0 会被挤没）；**`RETFIELD` 所在行的 `SCRTEXT_L` 会成为 F4 弹窗标题**（FM 第 252 行）。
另三个 `PARAMETER_ERROR` 触发点：`FIELD_TAB` 空且自动推导失败（第 83-87）；`DDIC_STRUCTURE` 取值失败（第 192-195）；`RETFIELD` 所在行累计 `OUTPUTLEN > 1000` 被截断 → DH198（第 280-284）。`IRC = 4` 的 `no_values_found`（DH801）在**弹窗之后**才判 ⇒ 「传空值表」验证不了参数合法性。
出处：ZFID001C_认领弹窗字段F4搜索帮助 §7.1~§7.3

**D4. `INTLEN` / `OFFSET` 必须一并填对**
`INTLEN` 是**字节**长度（Unicode 下 = 字符数 × 2：CHAR40 → 80、CHAR60 → 120）；`OFFSET` 是字节偏移。只填 `LENG`/`OUTPUTLEN` ⇒ **F4 弹得出来、但选中/关窗时转储**：`SAPLSDH4`/`LSDH4F02` 第 583 行 `FORM convert_result` 的 `assign <value_x>(len_neu) to <value_neu>`（`len_neu = DFIES-INTLEN`）⇒ `ASSIGN with length 0`。
正解用 `DESCRIBE` 从同类型实例动态取，别硬编码：
```abap
DESCRIBE FIELD ls-zzval LENGTH lv IN BYTE MODE.
DESCRIBE FIELD ls-zzval LENGTH lv IN CHARACTER MODE.
DESCRIBE DISTANCE BETWEEN ls AND ls-zzval INTO lv IN BYTE MODE.
```
黄金样本：真实 DDIC 结构 `TCURT` 的 DFIES（`LTEXT` CHAR40 = intlen 80 / off 18 / leng 40）。
出处：ZFID001C 同日第二轮（用户 GUI 报转储）

**D5. 更省心：传 `DDIC_STRUCTURE` 让 FM 自己填 `FIELD_TAB`**
FM 内部 `DDIF_FIELDINFO_GET`（零猜测），代价是要建 DDIC 结构。**程序局部类型走不通** —— `get_fields_of_value_tab`（`LSDHIF03`）依赖 `DDIF_FIELDINFO_GET` + `DESCRIBE FIELD ... HELP-ID`，查不到局部类型 ⇒ `FIELD_TAB` 空 ⇒ DH110。
出处：同上

**D6. `POPUP_GET_VALUES` 不支持按条件隐藏字段**
`SVAL` 只能控 `FIELD_ATTR`（必输/只读）。按类型只装载对应字段集；用户改类型就按新类型**重弹**（类型未变即退出，不会自动循环），切换前清空上一类型专属字段。
出处：ZFID001C_认领弹窗按类型显示字段与确认无反应修复 §3.2

**D7. 选择屏幕 `PUSHBUTTON` 的文本不能用「选择文本」**
`PUSHBUTTON pos(len) push` 里 `push` 只是**字段名**，选择文本只作用于 `PARAMETERS`/`SELECT-OPTIONS` ⇒ 按钮显示空白。`INITIALIZATION. pb_jump = TEXT-005.` 或把文本符号直接当字段名写。
出处：ZFIR005A_生产订单技术完成日期调整 §三

**D8. `OBLIGATORY` 在按钮事件前拦截**
条件没填就点不了跳转按钮（先弹「必须输入」）。去掉 `OBLIGATORY`，改在 `AT SELECTION-SCREEN` 里 `MESSAGE '请输入工厂' TYPE 'E'.`；点击用 `sscrfields-ucomm` 拦截（`sy-ucomm` 兜底）。
出处：ZFIR005A §三

**D9. 选择屏幕功能键三件套**
激活报 `Field "SSCRFIELDS-FUNCTXT_01" is unknown.` / `UCOMM is unknown` ⇒ `sscrfields` 是 SMOD 里的结构，必须显式 `TABLES` 声明（用 `sy-ucomm` 时不需要，所以缺口不暴露）。
```abap
TABLES: ztepic3a, sscrfields.
DATA gs_functxt TYPE smp_dyntxt.
SELECTION-SCREEN FUNCTION KEY 1.
INITIALIZATION.
  gs_functxt-icon_id   = icon_table_settings.
  gs_functxt-icon_text = TEXT-073.
  sscrfields-functxt_01 = gs_functxt.
AT SELECTION-SCREEN.
  IF sscrfields-ucomm = 'FC01'. ...
```
打开表维护用 `VIEW_MAINTENANCE_CALL` + `action = 'U'`（`VIMDYNFLDS` 里没有更新模式字段，BDC 只能进首屏）。
出处：ZFID001C_选择屏幕功能键打开ZTFI0005维护 §二/坑1/坑2；2026-11-11.md

**D10. ALV 无头可以跑，但「ALV 之前有一句 `WRITE`」必 500**
带 ALV 报表经 `adt.js run` 稳定 500 `Screen output without connection to user`，一度得出「带 ALV 无头必然 500」的错误结论。真因是 ALV 调用前的 `WRITE` 构成真实屏幕输出。`SUBMIT` 带 ALV 同理会 dump。
出处：ZIFLOG §7.7；ZFIR_0224_付款凭证按预付科目拆行 §四.2

**D11. `SLIS_FIELDCAT_ALV` 没有 `COLTEXT`**
激活报 `The data object "<FS_FCAT>" does not have a component called "COLTEXT"`（一次报 10 行，正好覆盖 10 个 `WHEN`）。`COLTEXT` 属 `LVC_S_FCAT`；SLIS 列标题写 `SELTEXT_L/M/S`。
另：fieldcat 的 `fieldname` 写错（`ZFKDJWJ`→`ZFDJWJ`）**激活不报错、运行期才炸** ⇒ 推前用正则抽全部 `fieldname = 'XXX'` 与 `ty_alv` 组件名比对。
出处：ZIFLOG §十.3；2026-09-17.md

**D12. `set_drop_down_table` 是整表替换，且下拉不阻挡手工输入**
分两次调用会丢掉先注册的句柄。所有句柄同一次 `CASE` 决定句柄号、`CALLER_EXIT` 里一次性注册；需强制取值域就在 `HANDLE_DATA_CHANGED` 加 `WHEN '<field>'` 校验。勾选列（`box_fname`）前端值必须 `check_changed_data` 回写，否则读到全空。
出处：ZFID004_付款方式ZFKFS下拉选择 §二/§四；ZPPR_0087 §三

**D13. CUA 功能码 `pfno` 49 以上不在功能键表内**
WebGui 点新按钮报「无效脚本标识」。实测 13-48 已被基线标准功能键占满（`&ELP/&IC1/&F03/...&XML`），**仅 04、09、10、11 空闲**（04 是 F4，需避让）。`pfnoPool` 定 `[13,14,16,17,20,36,38,9,10,11]`。
另：`RS_CUA_INTERNAL_WRITE` 参数名传错**不报语法错**，运行期 dump `Function parameter "xxx" is unknown`；从 CUA 删掉的功能码必须同步从 `gen_cua` 配置删，否则下次重跑加回来。
出处：ZFID001C_D_手工关联凭证与删除 §4；ZFIR005A 附

---

## E. 日期 / 金额 / 字符 / JSON / HTTP

**E1. 13 位毫秒时间戳直接转 `TIMESTAMP` 得到 `00000000`**
毫秒除 1000 得 10 位秒数，赋 `CHAR14` 后**右对齐左补空格**，`CONVERT TIME STAMP` 视为非法时间戳而失败，`pv_date` 保持 `CLEAR`、无报错。
解法：截前 10 位取秒 + `cl_abap_tstmp=>add( tstmp = c_ts_base secs = lv_scnd )`（`c_ts_base TYPE timestamp VALUE '19700101000000'`）再 `CONVERT TIME STAMP ... TIME ZONE c_tzone_utc`。
注意：该 FM 的 `TSTMP` 形参要求 `TIMESTAMP` 类型，**直接传字面量 `'19700101000000'` 抛 `CX_PARAMETER_INVALID_TYPE`**（字面量是 C 类型）；时区选 UTC 还是 `sy-zonlo` 会差一天。
出处：ZFIR_0237_票据日期时间戳转换 §二/§四/§五

**E2. `CONCATENATE` 拼 `NUMC3` 保留前导零，截断后成非法日期**
`CONCATENATE p_gjahr p_perio '01'` 中 `P_PERIO='009'` ⇒ 拼成 9 位，赋 `DATS(8)` 被截 ⇒ 月末算成 `0001-01-31`。改 `p_perio+1(2)` 偏移跳过前导零，并加注释防回退。
出处：ZFID003_在制品结转平台 D-01

**E3. `ALPHA = IN` 补零，但 `MATNR` 是反例**
批输入 `RF05A-NEWKO` 不做 ALPHA 转换，`100004` 写成 `100004` 找不到客户/供应商（BDC 屏幕与 BAPI 都不做输入转换）。用 `|{ lv_kunnr ALPHA = IN }|`。
**`MATNR` 例外**：本系统 `CHAR40` 且主数据存不补零形态（`57080000010200`），补零反而取不到，要用 `CONVERSION_EXIT_MATN1_INPUT`。
出处：ZCL_EPIC_HKRL_外部客户收款 §5.4；ZBPM_ISP016_新增三项校验 §四.2

**E4. `MESSAGE ... WITH` 对整条文本约 70 字符上限**
长 BAPI 错误被静默截断成 `Field Reas...`，误导排查方向。用短前缀 + 字符串模板接原文（≤220 字符，对齐 `BAPI_MSG`）。
出处：ZFM_FII001_SPLIT D-02

**E5. TTYP 作 `IMPORTING` 参数会被序列化成裸 JSON 数组**
与 `{"reqBOS":[...]}` 契约不符。用只有单字段的结构包一层（`ZCBS_ISC003_IN-REQBOS TYPE zcbs_isc003_in_t`）。
出处：ZCBS_ISC003_推送付款单据 §二

**E6. `/ui2/cl_json` 键名与数字类型**
`REQBOS` 被转成 `reqbos`；金额定义 `STRING` 时变带引号的 `"12.35"`。请求与返回**各备一张** `name_mappings`（serialize 按 `abap` 键查、deserialize 按 `json` 键查）；金额用 `DEC 23,2` 直接产出裸数字；`compress='X'` 丢所有空值字段。
① `pretty_name='X'` 按每层独立推导 ⇒ 嵌套层**绝不能加层级前缀**；② 唯一键表，同键重复登记抛 *A row already exists with this key*；③ 只登记推导不出来的键。**DDIC 组件名 30 字符静默截断。**
出处：ZCBS_ISC003 §4.1/§4.2/§六.3；ZHLY_ISC003_004 §五.3

**E7. 网关鉴权失败回 HTTP 200 + `msg=token已失效` 且没有 `code` 键**
不能只靠 `code` 判成败。三重判定：HTTP 状态、业务码存在性、业务码取值；无业务码时把响应原文（截断）带进 `MSGTX`，别留「无法解析」。网关（IPAAS）需 HTTP Basic：`ZGSP_PPS-USERNAME/PASSWORD` + `lo_client->authenticate( )`。
另：成功判定别只看 `code`（失败时也可能 `'0'`）；`ES_RETURN-RVAR*` 语义每个接口都不同；返回结构必做**键级对账**（只靠探针跑通会漏掉**值恰为空**的字段）。
出处：ZFID001E_收付款结算单查询平台 附3；ZCBS_ISC003 §5.2/§三

**E8. `adt.js query` 默认只回 100 行、不支持聚合函数**
结果被字典序靠前的表名挤掉，误判「表里没数据」；`SELECT MIN(belnr) AS minb` 报 `Unknown column name "MIN(BELNR)"`。显式传行数；聚合只信 `COUNT(*)`，`MIN/MAX` 改查全量再排序。`RSMPE_STAT`/`D021S` 这类表不放行，走 `$TMP` 探针。
出处：2026-09-20.md、2026-09-15.md、2026-10-22.md

---

## F. 事务与 LUW

**F1. `EXPORT ... TO DATABASE`（cluster 日志）受事务控制**
`create_snapshot` 只在 `iv_commit='X'` 时 `COMMIT WORK`；「落底表 → 建凭证 → 失败回滚」使日志与底表同处一个 LUW ⇒ `indx=01` 入参快照必丢（`indx=02` 还在）。底层 `ZFM_FII001` 内部也 `BAPI_TRANSACTION_ROLLBACK`（第 675 行），所以「删掉自己的 ROLLBACK」或「调顺序」都无效。
解法：在**唯一的写库动作之前、调 BAPI 之前**插一句独立 `COMMIT WORK`，`ROLLBACK` 原样保留。
出处：ZBPM_ISP002_接口日志回滚问题修复 §一/§二

**F2. 接口平台快照只绑 FM 参数，函数内局部变量一律不绑**
`zgsp_1c_create_logger` 靠 `SYSTEM_CALLSTACK` + `cl_fb_parameter_db=>read` 逐个 `ASSIGN (参数名)`，`it_include/it_exclude` 只能筛已绑定的参数；监控器 `serialize` 不带 `name_mappings`，输出 DDIC 大写名而非契约报文。
解法：业务侧自建报文日志表（`ZIFLOG`）+ 一行 `zcl_if_log=>save( is_log = ls_log iv_commit = 'X' )`，写在**报文唯一产生地**（`frm_send` 末尾），天然覆盖含 HTTP 层失败的全部出口。
出处：ZIFLOG_接口报文日志 §一/§二/§四

---

## G. DDIC / 激活 / 传输 / 文本

**G1. 引用从未创建的数据元素 → 激活报「无法生成名称表」且不指名字段**
`ZTEPICB/C/D` 激活失败（D0 408），先怀疑主键长度超限（那只是 WARNING，上限 255）走了弯路。真因：`zpjh : zepjh` 引用了从未创建的 `ZEPJH`（项目内已有同义 `ZPJH`）。**二分法**（保留主键 + 递增非主键字段）在 n=1 即失败即可锁定。编译器的字段判定比 DDIC 预读更权威。
出处：ZTEPICB-E_建表验收报告 §三.1

**G2. `STRING` 数据元素必须走域**
`CreateDataElement` 用 `type_kind='predefinedAbapType'` + `data_type='STRING'` 报 `位置的数量 < 数据类型 256 的最小数量 (STRING)`，半成品被自动清掉。正解 `type_kind='domain'` + `type_name='STRING'`（`DOMNAME=STRING / DATATYPE=STRG / LENG=0`）。
出处：ZIFLOG §7.1/§7.2

**G3. 字段文本与 DD03T 的四个高频缺口**
- 匿名内置类型（`abap.char(1)`/`abap.string(0)`）的字段在 `DD03T` 生成**文本为空的记录** ⇒ `REUSE_ALV_FIELDCATALOG_MERGE` 取到空 ⇒ ALV 列标题一片空白。字段必须挂数据元素（挂上后 `DD03T` 变 0 行是**正确状态**，文本上移）。
- 结构字段文本只能靠 DDL 逐字段 `@EndUserText.label`；`CreateStructure` 的 `fields[].description` **不入 `DD03T`**。
- 嵌套的 `STRU`/`TTYP` 型字段永远没有 `DD03T` 文本（SAP 标准结构同样如此）。
出处：ZIFLOG §十.4；2026-09-15.md、2026-10-08.md

**G4. 域固定值缺失 ⇒ 选择屏幕 F4 弹不出**
查 `DD07T` 必须带 `AS4LOCAL='A'`（否则取到非激活行）、`ORDER BY VALPOS`（否则得 `1,10,11,2,3…` 字典序）、登录语言无文本时回退域主语言 `DD01L-DOMMASTER`（字段名**不是** `MASTERLANG`）。
出处：ZFID001C_认领状态与类型域值补齐 §三/§四；ZFID001A_单据状态改域驱动 §四坑2

**G5. `ActivateFunctionGroup` 返回成功但并未真激活**
随后报 `ZGSP_1C_CREATE_LOGGER is invalid`。按 `FUGR/I`（include）→ `FUGR/FF`（FM）顺序直连 ADT 激活。
出处：ZIFLOG §7.6 / §5.1

**G6. 新建 FM 默认不远程使能**
`set_fm_rfc.js` 把 `processingType` 改 `"rfc"`，媒体类型 **`application/vnd.sap.adt.functions.fmodules.v3+xml`**（用 `application/xml` 返 406）；**URL 必须同时带 `corrNr`**，只带 `lockHandle` 返 500 /「已在请求中锁定」——那是缺 `corrNr`，不是真锁。`CreateFunctionModule` 必须显式传 `transport_request`（不传报 `CTS_WBO_API 019`，误导性极强）；`CreateFunctionGroup` 同带。
出处：2026-10-26.md、2026-10-12.md

**G7. FM 源码里 `*"` 是签名声明区**
写自由注释被 ADT 拒收（`FUNC_ADT 028 Parameter comment blocks are not allowed`）。接口用 ADT 内联签名语法（`FUNCTION xxx` 之后直接 `IMPORTING ... EXPORTING ... TABLES ... .`），普通注释一律用 `*`。`TABLES` 参数写 `it_rules TYPE cobrb`（写成 `STRUCTURE cobrb` 报 `Parameter IT_RULES declares no type`）。
新建 FM 后需 `ActivateFunctionGroup` + `ActivateFunctionModule` **双激活**，否则调用侧接口参数不可见。
出处：2026-10-16 实测（ZFM_AIAB_MOUNT）

**G8. DDIC 三交叉判定**
`CheckStructure` 报「从数据库导入对象 X 时出错」只说明 ADT 资源读不出 ⇒ 以「激活返回 + 上层结构检查 + 探针运行」交叉为准。改结构行字段后引用它的 TTYP 会失效 ⇒ `ActivateObjects` 复活。`UpdateStructure` 对不存在的对象报 403（被翻成 CSRF 失败）⇒ 新对象必须 `CreateStructure`。`CreateTableType` 用 `row_type_name`；`DeleteTableType` 带 `transport_request`。字段一律 `data_type:"STRING"`；嵌套用 `structure_ref`、明细用 `table_ref`；建后核 `TADIR.MASTERLANG=1`。
出处：sap-ddic-object-ops

**G9. DDIC 结构字段名允许前导下划线**
`_T00011` 建成并激活（`DD03L.FIELDNAME='_T00011'`、`DATATYPE=STRG`）。ADT 那句 *Names may consist only of A-Z "_" 0-9 (not leading)* 是**提示不是报错**。
出处：2026-10-10.md

**G10. `TR_OBJECTS_INSERT` 在无头环境不可用**
内部硬编码 `iv_with_dialog='X'`，无头运行弹 `TRINT_POPUP_EDIT_CANCEL_SHOW` → `DYNPRO_SEND_IN_BACKGROUND` 短转储（终止程序 `SAPLSTRD`）。改调 `TRINT_OBJECTS_CHECK_AND_INSERT` + `iv_with_dialog='D'`；`TTYP` 会被静默丢弃（`subrc=0`），需直接补写 `E071` 行（`R3TR`/`TTYP`/`LOCKFLAG='X'`/`AS4POS`）再 `GetTransport` 复核。
出处：2026-10-12.md

**G11. 判对象存活别用 `TADIR-DELFLAG` / `TLIBG`**
在用接口 `ZBPM_ISP002` 的 `TADIR` 也是 `DELFLAG='X'`；在用函数组查不到 `TLIBG`。只认 ADT `SearchObject` / `GetFunctionGroup` / SE80；FM 目录判据是 `ENLFDIR` 按 `AREA` 查。本系统未开版本管理（`VRSD` 0 行），删除无法版本回滚，只能靠 `E071→E070` 属主+时间间接定位。
出处：2026-10-26.md

---

## H. 权限

**H1. `AUTHORITY-CHECK` 传空值通常无授权 ⇒ 记录永久不可见**
按 `M_BEST_EKG` 逐条校验采购组时，`EKGRP` 为空的组织层记录被过滤且用户永远看不到（角色不会授 `EKGRP = space`）。
```abap
IF lv_ekgrp IS NOT INITIAL.
  AUTHORITY-CHECK OBJECT 'M_BEST_EKG' ...
ENDIF.
```
权限对象字段先用 `TOBJ`（`OBJCT` + `FIEL1~FIEL0`）核实，别凭记忆写；采用**行级过滤**而非整屏拒绝，否则无权用户连事务码都进不去。
出处：ZMMR004_采购价格阶梯报表_权限对象M_BEST_EKG §二/§三

---

## I. 排查手法

**I1. 500 先取 ST22**
短转储 `CALL_FUNCTION_PARM_MISSING` 直接指向 `SAPLZFG_BPM001` 的 `FRM_ASSET_CREATE`。`adt.js dumps` 拿 id → `adt.js dump "<id>"` 读全文 → 看 `Error analysis` 段的 `procedure "XXX" "(FORM)"` + `CX_SY_*`；`dump_id` 不能含 `/`。ADT dump 端点 404 时查 `SNAP` 表（`FLIST..FLIST08` 8×200 字符拼文本），**`SNAP` 按集团分区**，查 300 要带 override。
出处：2026-09-14.md、2026-10-12.md、2026-11-06.md

**I2. `$TMP` 影子类打点**
复制生产类、改类名、插 `lv_dbg = lv_dbg && 'A'` 累加，末尾 `DBG2 path={lv_dbg}` 一次输出；跑完 `DeleteClass` 零污染。**打点不要插进多行 `IF` 的条件续行里**（报 `Operator AND expected`）。
出处：2026-10-29.md、2026-10-30.md

**I3. 用「报错金额 + 张号」反推输入**
`880.00-` + 「第 001 张」唯一对应「≤999 行且净额 −880」的一批 ⇒ 锁定是文件尾段 82 行被单独成组。先算「什么输入能产出这条消息」，再造探针逐字复刻；复刻成功即证明根因，修完跑同一探针看 T1~T5 全 PASS。
出处：2026-09-23.md

**I4. 探针输出用字符串模板**
`WRITE: / '标签=',字段` 在列表输出里位置对不齐，看上去值错位，一度误导排查方向；`WRITE: / '字面量' 变量.` 还会激活报 `Unable to interpret "LS_XXX"`。
一律 `|KONTY=[{ gs_row-konty }]|`；变量先 `lv_str = ls_x-字段.` 转 string。SAP 列表宽约 80 列会截断长 JSON ⇒ 按 60 字符分段 WRITE。
出处：2026-10-16.md、2026-10-08.md、2026-10-10.md

**I5. 探针内嵌长 JSON > 255 字符被 ADT 拒**
`The line N exceeds 255 characters`。用**单引号字面量**切片拼接（双引号切片点易落在 `\"` 中间，拼出的 JSON 悄悄损坏、反序列化全空却不报错）。核对报文一律程序逐字符比对，不靠终端折行肉眼拼。
出处：2026-10-08.md

**I6. 「探针跑通了」≠ 结构完整，必须键级对账**
初版漏建 21 个字段（值恰为空看不出来）；`FUNCTION` 首行带句点导致激活被取消、远端读回源码却看着正常。报文每个非空键 → 映射名 → 是否在结构里逐层对账（本次 5 层 162 键零漏）。
出处：2026-10-08.md

**I7. 拿到外部归档先查框架依赖**
归档用了 `/thinkway/*`（`/thinkway/1c_create_logger`、`/thinkway/cl_abap_properties`），本系统 `TADIR` 检索 `/THINKWAY%` 得 0 行 ⇒ 直接移植激活不了；另一例 `ZCL_AMDP_VIEWS=>GET_ORDER_STATUS` 不存在。先 `TADIR`/`DD02L` 逐个核依赖，缺的换成本项目既有等价物。**同名表不是同一张表**：集团 `ZTEPIC05`=资金平台收付状态表，客户 `ZTEPIC05`=CBS 货币转换表 3 字段，移植前先核 `DD03L` 字段数。
出处：2026-10-08.md、2026-10-12.md、2026-11-09.md

**I8. 编号别猜，去 FS 反查**
归档函数名 `zcbs_isc003`，但客户 003 已被占用，靠试编号试不出来。FS 页签有「接口编号：根据客户编号规则编号（**原集团 ZCBS_ISC003**）」注记。查重时 `LIKE` 里 `_` 要 `ESCAPE '#'`。
另：`RPY_TRANSACTION_INSERT` 的 `transaction_type` 是 CHAR1 且 `CASE` 无 `WHEN OTHERS`，传错值**静默成功、什么都不建还污染 TADIR**——常量来自类型池 `STSTC`。
出处：2026-10-10.md、2026-09-17.md、2026-10-22.md

**I9. 无头通道的硬边界**
`SUBMIT <带选择屏幕的报表>` 必 500；ALV 无 fieldcat 时报 `NO_FIELDCATALOG_AVAILABLE`；F4/按钮/弹窗完全测不了。给选择屏幕字段加 `DEFAULT`；把「GUI 目视项」列成清单交用户实点，**别声称已验证**。无头会话 `sy-langu` 常为 `EN`，`MAKT/T001W` 只有中文时描述为空属环境现象。
出处：2026-10-22.md、2026-09-17.md、2026-10-19.md

---

## J. 脚本与批量

**J1. 沙箱 2 分钟超时 SIGTERM 批量脚本**
13 个 DTEL 连建被打断，留半成品（`DD04L.AS4LOCAL='L'`、类型长度全空），此后 `CreateDataElement` 报 CSRF、`UpdateDataElement` 报 403「locked by another user」都解不掉（`ENQUEUE_READ` 证明并无真锁）。脚本支持 `ONLY=`、分批 ≤10、长任务后台跑；半成品先 `DeleteDataElement` 再重建。
出处：2026-09-29.md、2026-10-08.md、2026-10-12.md

**J2. python 打补丁的锚点串会命中自己**
`s.index('FORM show_doc USING')` 命中了 `PERFORM show_doc USING` 里的子串（`PER`+`FORM`），把整个 FORM 吞掉。锚点加前缀限定（`'\nFORM '`、`'\n*&---'`）；改完立刻 `grep -c` 校验处数 + `wc -c` 校验字节数；能 `replace` 就别用正则。
出处：2026-10-10.md

**J3. 批量补丁必须带生成后自检断言**
锚点命中数校验防不住「值错」：模板 `'%s'` 只喂流水号，四个文件的 `funcname` 全落成 `'003'`。断言关键值（funcname 全名恰好 1 处、禁用词计数为 0），不过即非零退出、不写盘。
出处：项目侧交付脚本约定（见仓库 `examples/project-ops-template.md` §8）

**J4. Edit/生成器混入零宽字符**
`ls_vbap_db-vgb` + U+200B + `el` 被写进源码，`grep`/`diff` 都正常，编译期才炸。写含中文的 ABAP 后跑隐藏字符体检（`LC_ALL=C grep -n '[^ -~]'` 快筛，或 python 判 `ord>127` 且不在 CJK/全角区间）；修法用 python `re.sub` 精确替换。
出处：2026-10-10.md

**J5. 行尾 CRLF/LF 变化让 diff 变全文替换**
本工作区 `FICO/` 多为 CRLF。脚本改文件时锚点带 `\r\n`；diff 前 `diff --strip-trailing-cr` 或统一 `unix2dos`。
出处：2026-11-04.md、2026-10-09.md

**J6. BSD grep 不支持 `\|`**
`grep -n "a\|b"` **静默无输出**，多次误判「改动没落地/文件内容有问题/常量没改上」。多关键字一律 `grep -E "a|b"`。09-15、09-28、10-08、10-13 反复踩到，属最高频环境坑。
出处：2026-09-15.md、2026-10-08.md、2026-10-13.md

---

## K. 方法论（可迁移的协作原则）

这些不是技术坑，但违反同样返工。

1. **「按原代码封装」= 只加一层 FORM 壳，不要重排流程**。函数体只做 `INCLUDE + logger + PERFORM + set_message`，业务段整段照搬（含 DATA 声明、逐出口 EXIT），只把调用点换成 `PERFORM`。风格封装 ≠ 结构重构。（2026-09-14）
2. **不要自作主张再封装一层通用方法**。给 `ZCL_EPIC_HKRL` 写 `frm_post_bapi` 偏离原集团写法被否；移植类逻辑**逐段照搬原源码**，需要新增判断就在原位置加一行，不抽公共层。（2026-10-29）
3. **缺能力时先想「提成类方法」**，不要动新建函数组/FM。另：某 Z 对象源码丢了先回原始 zip 找（`~/Downloads/*/xxx.html` 是 pretty printer 导出，去标签 + `html.unescape` 即可还原）。（2026-10-30）
4. **绝不直接 UPDATE / MODIFY 标准表**。改已过账 FI 凭证走 `FI_DOCUMENT_CHANGE`（组 `FACG`）；字段白名单见 `LFACGF02/LFACGF04` 的 `WHEN '<字段名>'` 分支（note 1587217）。（2026-10-23）
5. **不要用硬编码常量代替配置表区间判定**。审批金额判定须与配置表区间比：取最小覆盖档，超最高档取最大档，低于最低档不需审批；档位不够时**补兜底档**而不是加常量。（2026-10-21、2026-10-20）
6. **取数主表要跟业务主体走，不要跟条件表走**。以条件表 `A017` 为驱动反查采购组织被否；主表应是 `EINA`/`EINE`。S/4 的 `EINA/EINE` 没有 `KNUMH`，条件记录号必须走 `A017`。（2026-10-20、2026-10-19）
7. **生产源码注释不是「全删」**。先写过叙述被要求剥离，一刀切全清又被否。判据：保留骨架与判据型注释，删叙述段。剥离后 diff 证明代码本体零改动：
```bash
diff <(grep -vE '^[[:space:]]*(\*&|\*|")|^[[:space:]]*$' 改前) <(... 改后)   # 需 rc=0
```
（2026-10-09、2026-11-10）
8. **用户说「文件没问题」时更要查程序**。结论是排序号 `' 1'` 带前导空格。不要接受「数据没问题」就停手。（2026-09-23）
