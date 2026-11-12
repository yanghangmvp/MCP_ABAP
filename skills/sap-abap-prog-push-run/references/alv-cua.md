# ALV 自定义按钮 / GUI 状态 / 标准弹框（§7）

> 主册：[`../SKILL.md`](../SKILL.md)。结论先行：S/4HANA 下 **function ALV 的 `TOOLBAR` 事件已失效**，
> 「顶部真按钮」只有 GUI 状态一条路，功能码可用 `gen_cua.js` 自动登记（不必人工 SE41）。

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

正确做法：写个 `$TMP` 诊断程序调官方接口，ADT 跑一次即可（范式 `scripts/ZZTEST_CUA.abap`）：

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

**标准入口（推荐）：`node scripts/gen_cua.js`** —— 配置驱动，一条命令跑完
「读配置 → 注入模板 → 推送 → 运行 → 回读 + `RS_CUA_GET_FUNCTIONS` 双复核」。
每个程序一份 `scripts/cua/config/<PROG>.json` 定义按钮（功能码/文字/图标/信息文本），
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
- 改 OO ALV 前先读源码：**声明用 `CLASD`、实现用 `CLASI`**（`node scripts/get_source.js CLASD|CLASI CL_GUI_ALV_GRID --out=/tmp/x`）。**核查"某方法/事件是否被调用"必须读 `CLASI`** —— `CLASD` 只有 METHOD 声明，在定义文件里 grep 调用点必然得到「0 处」的**假结论**。本项目据此复核 `_raise_evt_toolbar`：实现文件 16608 行里只有第 16529 行的 `method _raise_evt_toolbar.` 定义、全文无调用点（结论成立，但方法要用对）。**别凭记忆写 OO ALV API。**
- **想在 ADT 里"跑一次看 GUI 效果"做不到**：`REUSE_ALV_GRID_DISPLAY_LVC` 必然 `CALL SCREEN 500`，ADT 驱动不了 dynpro。**功能码是否登记成功**可以自动验证（`RS_CUA_GET_FUNCTIONS`，见 7.5）；但**按钮实际长什么样、排在哪**只能请用户在 GUI 里目视确认。

### 7.6 ★ 标准弹框 / 弹窗表格：实测可用的 FM 与「反直觉」返回语义

2026-09-17 做 ZFID001A 的 8 个按钮逻辑时实测。**先读 FM 源码再写调用**（`node scripts/get_source.js FM <名> <函数池> --out=/tmp/x`，
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

### 7.7 ★★ 多按钮批导程序：待处理行必须用「独立内部标记」，不能用 ICON / MSG 当状态机

**这是批导程序加了「测试导入」按钮之后最容易踩的逻辑坑，且单次测试测不出来。** 来源：`ZFIB003`（FS00 建科目）改造。

错误写法：

```abap
LOOP AT gt_tab ASSIGNING <fs_tab> WHERE icon IS INITIAL.   " ← 用输出列当状态机
  PERFORM frm_glaccount_single ...
ENDLOOP.
```

单次运行没问题（`icon` 空 = 待处理）。一旦有「测试导入」按钮：

1. 点测试导入 → 每行 `icon` 被写上（`@5D@` 通过 / `@5C@` 失败）；
2. 点正式导入 → `WHERE icon IS INITIAL` **命中 0 行** → 一条都导不进去，只回一句「没有需要导入的数据行」。

用户视角就是「校验通过了、图标也有了、导入是空的」。

**正确做法**：行结构加一个**不进字段目录**的内部标记，单独表达「该行不可导入」这一业务事实：

```abap
" ty_alv 末尾（保持 icon/msg 位置不变，避免影响 ASSIGN COMPONENT 的列序号）
        icon(5),
        msg(255),
        exist(1),      " 已存在（不可导入）；不列入字段目录
      END OF ty_alv.

" 校验 FORM：每次全量重判，先清后置，保证幂等
LOOP AT gt_tab ASSIGNING <fs_tab>.
  CLEAR <fs_tab>-exist.                 " ← 必须先清
  ...命中目标表则：<fs_tab>-exist = 'X'. <fs_tab>-icon = c_icon_err. <fs_tab>-msg = TEXT-m01.
ENDLOOP.

" 按钮入口：重算链路 → 重判 → 复位非「不可导入」行的结果列
PERFORM frm_get_coa_from_bukrs.     "用户可能改过公司代码
PERFORM frm_check_account_exist.    "用户可能改过科目号
LOOP AT gt_tab ASSIGNING <fs_tab> WHERE exist IS INITIAL.
  CLEAR: <fs_tab>-icon, <fs_tab>-msg.
ENDLOOP.

" 三处循环条件一律改成 exist
LOOP AT gt_tab ASSIGNING <fs_tab> WHERE exist IS INITIAL.
```

三个附带收益：重复点击幂等（测试→正式→再点一次正式，第三段自动把已落库行判为「已存在」跳过）；ALV 改数后能重判；汇总口径能分开统计「成功 / 失败 / 跳过已存在」。

**汇总消息的边界也要跟着改**：原来 `IF lv_ok = 0 AND lv_er = 0` 就报「没有需要导入的数据行」，加了 `exist` 之后要把 `lv_skip` 纳入判断，否则「全部行都已存在」时会丢掉跳过条数这条信息。

> **通用教训**：`ICON` / `MSG` / 任何 ALV 显示列都是**输出**，不是状态。跨按钮需要保持的状态必须有独立的内部字段。同理，测试脚本里为了让流程跑通用手工复位这些输出列，就是在替程序掩盖缺陷（见 8.0.1）。
