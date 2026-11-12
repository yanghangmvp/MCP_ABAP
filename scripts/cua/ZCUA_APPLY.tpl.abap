REPORT zcua_apply.

*&---------------------------------------------------------------------*
*& $TMP 工具：批量为程序 GUI 状态 STANDARD 登记自定义功能码
*&
*& ⚠ 本文件是模板，由 scripts/gen_cua.js 注入配置后生成
*&   scripts/cua/_build/ZCUA_APPLY.abap 再推送运行。
*&   不要直接改生成物 —— 改本模板或 scripts/cua/config/<PROG>.json。
*&
*& 登记一个功能码 = 往 4 张表各加 1 行：
*&   set (rsmpe_staf) : status='STANDARD' + function=<FCODE>
*&   fun (rsmpe_funt) : code + textno='001' + fun_text + text_type='S'
*&                      + icon_id(@XX@) + text_name(图标技术名，须与 icon_id 配对)
*&                      + icon_text(≤40 / GUI_ICTEXT) + info_text(≤60 / GUI_INFO)
*&   but (rsmpe_but)  : pfk_code='000001' + code='0001' + no=<按钮序号> + pfno=<功能键号>
*&   pfk (rsmpe_pfk)  : code='000001' + pfno=<功能键号> + funcode=<FCODE> + funno='001'
*&
*& pfno / but_no 由程序自动分配：
*&   ① 优先用 C_PFNO_POOL 里按顺序挑第一个未被占用的槽位号；
*&   ② 池子用尽才退到 C_PFNO_START 起顺序找空号（个位数自动补零）；
*&   按钮序号接 lt_but 现有最大值递增；重跑时按 code 沿用旧号 → 幂等。
*&
*& **槽位号必须 ≤ 48**（+ 标准自带的 71 / 80-86 这几个特殊号）。
*&   49 以上不在生成的 CUA 功能键表里：按钮画得出来、点了必报
*&   「无效脚本标识」（WebGui RAL 报错）。2026-09-18 定位并修正：
*&   原起点 49 导致 ZMY_PROGA~D 四个程序全部报错，改到 13/14/16/17/20/36/38/09后正常。
*&   参照物：手工在 SE41 建的 ZMY_PROG，其自定义按钮 SAP 自己就放在 13/14。
*&
*& 注意：
*&   ① EXPORT TO DATABASE 走 update task，写完必须 COMMIT WORK AND WAIT，
*&      否则后续读取（GENERATE / 回读）看不到刚写的数据。
*&   ② RS_CUA_INTERNAL_GENERATE 会回 rc=3 / EC/801 —— **环境固有现象**
*&      （对照实验：手工在 SE41 建的、一直正常的 ZMY_PROG 同样如此），
*&      运行时不缺功能；判定成功只看回读校验。
*&   ③ 传输：CUA 是 PROG 的子对象 CUAD，随 R3TR PROG 一起走，无需额外挂请求。
*&   ④ 程序自身无 CUA 记录时（从未在 GUI 打开过）用基线程序整份写入。
*&   ⑤ 图标 ID 与技术名必须与 ICON 表配对，配错 SAP 不报错、只是按钮没图标，
*&      所以本程序写入前逐个校验，配不上就跳过并打印。
*&---------------------------------------------------------------------*

TYPES: BEGIN OF ty_target,
         prog      TYPE trdir-name,
         code      TYPE gui_func,
         ftext     TYPE gui_text,      " 按钮文字（≤40）
         icon_id   TYPE icon_d,        " @XX@
         icon_name TYPE iconname,      " ICON 表技术名
         icon_text TYPE gui_ictext,    " 图标文本（≤40）
         info_text TYPE gui_info,      " 信息文本（≤60）
         pfno      TYPE cua_pfno,      " 自动分配
         but_no    TYPE cua_butno,     " 自动分配
         flg_skip  TYPE flag,          " 内部：跳过标记
       END OF ty_target.

TYPES: ty_pfno_t TYPE TABLE OF cua_pfno,
       ty_code_t TYPE TABLE OF gui_func.

CONSTANTS: c_do_write   TYPE flag        VALUE '{{DO_WRITE}}',
           c_baseline   TYPE trdir-name VALUE '{{BASELINE}}',
           c_pfno_start TYPE cua_pfno    VALUE '{{PFNO_START}}',
           c_pfno_pool  TYPE string      VALUE '{{PFNO_POOL}}',
           c_no_pfk     TYPE flag        VALUE '{{NO_PFK}}',
           c_state      TYPE gui_status  VALUE 'STANDARD',
           c_but_code   TYPE gui_bcode   VALUE '0001',
           c_tcode_cd   TYPE gui_code    VALUE '000001'.

DATA: lt_sta TYPE TABLE OF rsmpe_stat,
      lt_fun TYPE TABLE OF rsmpe_funt,
      lt_men TYPE TABLE OF rsmpe_men,
      lt_mtx TYPE TABLE OF rsmpe_mnlt,
      lt_act TYPE TABLE OF rsmpe_act,
      lt_but TYPE TABLE OF rsmpe_but,
      lt_pfk TYPE TABLE OF rsmpe_pfk,
      lt_set TYPE TABLE OF rsmpe_staf,
      lt_doc TYPE TABLE OF rsmpe_atrt,
      lt_tit TYPE TABLE OF rsmpe_titt,
      lt_biv TYPE TABLE OF rsmpe_buts.

DATA: ls_adm   TYPE rsmpe_adm,
      ls_trkey TYPE trkey,
      lv_lang  TYPE eudb-langu.

DATA: lv_rc    TYPE i,
      lv_rcc   TYPE char3,
      lv_n     TYPE i,
      lv_msg   TYPE string,
      lv_txt   TYPE string,
      lv_iname TYPE iconname,
      lv_own   TYPE flag.

DATA: lt_target TYPE TABLE OF ty_target,
      lt_progs  TYPE TABLE OF trdir-name,
      lt_flist  TYPE TABLE OF rsmpe_funl,
      lv_prog   TYPE trdir-name.

* 字段符号必须声明在全局（FORM 局部声明在别的 FORM 里看不到）
FIELD-SYMBOLS <t> TYPE ty_target.

DATA: ls_staf TYPE rsmpe_staf,
      ls_funt TYPE rsmpe_funt,
      ls_but  TYPE rsmpe_but,
      ls_pfk  TYPE rsmpe_pfk.

START-OF-SELECTION.

  lt_target = VALUE #(
*{{TARGET}}
  ).

  IF lt_target IS INITIAL.
    WRITE: / '无待登记配置，退出。'.
    RETURN.
  ENDIF.

* 去重出程序清单（保持配置顺序）
  LOOP AT lt_target INTO DATA(ls_t0).
    READ TABLE lt_progs TRANSPORTING NO FIELDS WITH KEY table_line = ls_t0-prog.
    IF sy-subrc <> 0.
      APPEND ls_t0-prog TO lt_progs.
    ENDIF.
  ENDLOOP.

  IF c_do_write IS INITIAL.
    WRITE: / '*** DRY RUN（仅预演，不写 SAP）***'.
  ENDIF.
  DESCRIBE TABLE lt_progs LINES lv_n.
  WRITE: / '待处理程序数 =', lv_n.

  LOOP AT lt_progs INTO lv_prog.
    PERFORM process_prog USING lv_prog.
  ENDLOOP.

  ULINE.
  WRITE: / 'DONE'.

*&---------------------------------------------------------------------*
FORM process_prog USING pv_prog TYPE trdir-name.

  ULINE.
  WRITE: / '### 程序', pv_prog.

* --- 1) 定基线 -------------------------------------------------------
* 优先用目标程序自身现有的 CUA —— 这样追加不会丢掉它已有的自定义功能码；
* 程序从未在 GUI 打开过时 FETCH 回 rc=1，退而用全局基线整份写入。
  CLEAR lv_own.
  PERFORM fetch_cua USING pv_prog CHANGING lv_rc.
  IF lv_rc = 0.
    lv_own = 'X'.
    WRITE: / '  基线来源 = 程序自身现有 CUA'.
  ELSE.
    PERFORM fetch_cua USING c_baseline CHANGING lv_rc.
    IF lv_rc <> 0.
      WRITE: / '  SKIP: 目标无 CUA 记录，全局基线', c_baseline, '也读不到'.
      EXIT.
    ENDIF.
    WRITE: / '  基线来源 = 全局基线', c_baseline.
  ENDIF.

* ★ 无论基线来自目标程序自身还是全局基线，都**先剔除全部 Z 开头的自定义
*   功能码**、再按配置重加。否则程序改造后**废弃的旧功能码会残留**：
*   例：ZMY_PROGB 由框架版（ZEXEC/ZBACK）改为审批版
*   （ZAPPROVE/ZREJECT/ZCONFIRM）后，旧码仍在 CUA 里 —— 既污染
*   RS_CUA_GET_FUNCTIONS 复核结果，也让 ALV 工具条多出点不动的死按钮。
*   本项目的自定义功能码一律由 GEN_CUA.JS 管理，故剔除是安全的。
  PERFORM strip_zcodes.

  DESCRIBE TABLE lt_set LINES lv_n.  WRITE: / '  基线 set =', lv_n.
  DESCRIBE TABLE lt_fun LINES lv_n.  WRITE: / '  基线 fun =', lv_n.
  DESCRIBE TABLE lt_but LINES lv_n.  WRITE: / '  基线 but =', lv_n.
  DESCRIBE TABLE lt_pfk LINES lv_n.  WRITE: / '  基线 pfk =', lv_n.

* --- 2) 自动分配 pfno / but_no（重跑幂等）---------------------------
  PERFORM assign_numbers USING pv_prog.

* --- 3) 追加 4 张表 --------------------------------------------------
  PERFORM append_targets USING pv_prog.

  IF c_do_write IS INITIAL.
    RETURN.
  ENDIF.

* --- 4) 写回激活版本 -------------------------------------------------
  CLEAR ls_trkey.
  ls_trkey-obj_type = 'PROG'.
  ls_trkey-obj_name = pv_prog.
  ls_trkey-sub_type = 'CUAD'.
  ls_trkey-sub_name = pv_prog.
  SELECT SINGLE devclass FROM tadir INTO ls_trkey-devclass
         WHERE pgmid = 'R3TR' AND object = 'PROG' AND obj_name = pv_prog.

  CALL FUNCTION 'RS_CUA_INTERNAL_WRITE'
    EXPORTING
      program  = pv_prog
      language = lv_lang
      tr_key   = ls_trkey
      adm      = ls_adm
      state    = 'A'
    TABLES
      sta      = lt_sta
      fun      = lt_fun
      men      = lt_men
      mtx      = lt_mtx
      act      = lt_act
      but      = lt_but
      pfk      = lt_pfk
      set      = lt_set
      doc      = lt_doc
      tit      = lt_tit
      biv      = lt_biv
    EXCEPTIONS
      not_found    = 1
      invalid_data = 2
      OTHERS       = 3.
  lv_rc = sy-subrc.
  CLEAR lv_rcc.
  lv_rcc = lv_rc.
  CONCATENATE '  write rc =' lv_rcc INTO lv_msg.
  WRITE: / lv_msg.
  IF lv_rc <> 0.
    WRITE: / '  WRITE 失败，跳过本程序。'.
    EXIT.
  ENDIF.

* EXPORT TO DATABASE 走 update task，必须 COMMIT
  COMMIT WORK AND WAIT.

* --- 5) 生成 load（环境固有 rc=3，见文件头 ②）------------------------
  CLEAR: sy-msgid, sy-msgno, sy-msgv1, sy-msgv2, sy-msgv3, sy-msgv4.
  CALL FUNCTION 'RS_CUA_INTERNAL_GENERATE'
    EXPORTING
      program = pv_prog
    EXCEPTIONS
      not_found         = 1
      syntax_error      = 2
      generation_failed = 3
      OTHERS            = 4.
  lv_rc = sy-subrc.
  CLEAR lv_rcc.
  lv_rcc = lv_rc.
  CONCATENATE '  generate rc =' lv_rcc ' (3/EC801 为环境固有，不影响功能)'
         INTO lv_msg.
  WRITE: / lv_msg.

* --- 6) 回读校验 -----------------------------------------------------
  CLEAR lv_rc.
  PERFORM fetch_cua USING pv_prog CHANGING lv_rc.

  WRITE: / '  --- 回读校验 ---'.
  LOOP AT lt_target ASSIGNING <t> WHERE prog = pv_prog
                                       AND flg_skip IS INITIAL.
    CLEAR lv_msg.
    CONCATENATE '   ' <t>-code ' pfno=' <t>-pfno INTO lv_msg.

    READ TABLE lt_set TRANSPORTING NO FIELDS
         WITH KEY status = c_state function = <t>-code.
    IF sy-subrc = 0. lv_txt = 'Y'. ELSE. lv_txt = 'N'. ENDIF.
    CONCATENATE lv_msg ' set=' lv_txt INTO lv_msg.

    READ TABLE lt_fun TRANSPORTING NO FIELDS WITH KEY code = <t>-code.
    IF sy-subrc = 0. lv_txt = 'Y'. ELSE. lv_txt = 'N'. ENDIF.
    CONCATENATE lv_msg ' fun=' lv_txt INTO lv_msg.

*   but：不绑功能键模式用 'S' 占位去匹配
    IF c_no_pfk = 'X'.
      READ TABLE lt_but TRANSPORTING NO FIELDS
           WITH KEY pfk_code = c_tcode_cd pfno = 'S' no = <t>-but_no.
    ELSE.
      READ TABLE lt_but TRANSPORTING NO FIELDS
           WITH KEY pfk_code = c_tcode_cd pfno = <t>-pfno.
    ENDIF.
    IF sy-subrc = 0. lv_txt = 'Y'. ELSE. lv_txt = 'N'. ENDIF.
    CONCATENATE lv_msg ' but=' lv_txt INTO lv_msg.

*   pfk：不绑功能键模式下，PFK 表里本就不该有该功能码
    IF c_no_pfk = 'X'.
      READ TABLE lt_pfk TRANSPORTING NO FIELDS
           WITH KEY funcode = <t>-code.
      IF sy-subrc <> 0. lv_txt = 'Y'. ELSE. lv_txt = 'N'. ENDIF.
    ELSE.
      READ TABLE lt_pfk TRANSPORTING NO FIELDS
           WITH KEY code = c_tcode_cd pfno = <t>-pfno funcode = <t>-code.
      IF sy-subrc = 0. lv_txt = 'Y'. ELSE. lv_txt = 'N'. ENDIF.
    ENDIF.
    CONCATENATE lv_msg ' pfk=' lv_txt INTO lv_msg.

    WRITE: / lv_msg.
  ENDLOOP.

* --- 7) 运行时接口复核 -------------------------------------------------
* RS_CUA_GET_FUNCTIONS 是运行时真正读 CUA 的入口，用它做最终判定
  CLEAR: lt_flist, lv_rc.
  CALL FUNCTION 'RS_CUA_GET_FUNCTIONS'
    EXPORTING
      program           = pv_prog
    TABLES
      function_list     = lt_flist
    EXCEPTIONS
      menu_not_found    = 1
      program_not_found = 2
      OTHERS            = 3.
  lv_rc = sy-subrc.
  CLEAR lv_rcc.
  lv_rcc = lv_rc.
  CONCATENATE '  --- 运行时复核 RS_CUA_GET_FUNCTIONS rc =' lv_rcc
         INTO lv_msg.
  WRITE: / lv_msg.

  LOOP AT lt_flist INTO DATA(ls_fl).
    IF ls_fl-fcode IS INITIAL.
      CONTINUE.
    ENDIF.
    " 自定义码 = Z 开头，或本次配置注入的码（&SEND / S1 这类非 Z 码也要复核）
    READ TABLE lt_target WITH KEY prog = pv_prog code = ls_fl-fcode TRANSPORTING NO FIELDS.
    IF sy-subrc <> 0 AND ls_fl-fcode(1) <> 'Z'.
      CONTINUE.
    ENDIF.
    CONCATENATE '   [RT] ' ls_fl-fcode ' 文本=' ls_fl-text
                ' 图标=' ls_fl-icon_id INTO lv_msg.
    WRITE: / lv_msg.
  ENDLOOP.

ENDFORM.

*&---------------------------------------------------------------------*
*& 读某程序的激活版 CUA（11 张表全是必输参数，少一个就 dump）
*&---------------------------------------------------------------------*
FORM fetch_cua USING pv_prog TYPE trdir-name CHANGING cv_rc TYPE i.

  CLEAR: lt_sta, lt_fun, lt_men, lt_mtx, lt_act, lt_but,
         lt_pfk, lt_set, lt_doc, lt_tit, lt_biv, ls_adm, lv_lang.
  CALL FUNCTION 'RS_CUA_INTERNAL_FETCH'
    EXPORTING
      program = pv_prog
      state   = 'A'
    IMPORTING
      adm     = ls_adm
      langu   = lv_lang
    TABLES
      sta     = lt_sta
      fun     = lt_fun
      men     = lt_men
      mtx     = lt_mtx
      act     = lt_act
      but     = lt_but
      pfk     = lt_pfk
      set     = lt_set
      doc     = lt_doc
      tit     = lt_tit
      biv     = lt_biv
    EXCEPTIONS
      not_found       = 1
      unknown_version = 2
      OTHERS          = 3.

  cv_rc = sy-subrc.

ENDFORM.

*&---------------------------------------------------------------------*
*& 剔除基线程序自带的自定义功能码（code 以 Z 开头），只留系统标准部分
*&---------------------------------------------------------------------*
FORM strip_zcodes.

  DATA: lt_del_code TYPE ty_code_t,
        lt_del_pfno TYPE ty_pfno_t,
        lv_code     TYPE gui_func,
        lv_pfno     TYPE cua_pfno,
        lv_cnt      TYPE i.

  LOOP AT lt_fun INTO ls_funt.
    lv_code = ls_funt-code.
    IF lv_code IS NOT INITIAL AND lv_code(1) = 'Z'.
      APPEND lv_code TO lt_del_code.
    ENDIF.
  ENDLOOP.

* ★ 只从 lt_fun 收码会漏掉一种脏数据：fun 表里已无定义、但 set 表里仍挂着
*   的「僵尸功能码」（实例：ZMY_PROG1 的 ZSUM）。它既不出现在 fun 里，
*   也没有 pfk/but 行，于是永远清不掉，持续污染 RS_CUA_GET_FUNCTIONS 复核。
*   这里补一遍 set 表，收齐后统一去重。
  LOOP AT lt_set INTO ls_staf.
    lv_code = ls_staf-function.
    IF lv_code IS NOT INITIAL AND lv_code(1) = 'Z'.
      APPEND lv_code TO lt_del_code.
    ENDIF.
  ENDLOOP.

  SORT lt_del_code.
  DELETE ADJACENT DUPLICATES FROM lt_del_code.

  LOOP AT lt_pfk INTO ls_pfk.
    lv_code = ls_pfk-funcode.
    IF lv_code IS NOT INITIAL AND lv_code(1) = 'Z'.
      APPEND ls_pfk-pfno TO lt_del_pfno.
    ENDIF.
  ENDLOOP.

  LOOP AT lt_del_code INTO lv_code.
    DELETE lt_set WHERE function = lv_code.
    DELETE lt_fun WHERE code     = lv_code.
  ENDLOOP.

  LOOP AT lt_del_pfno INTO lv_pfno.
    DELETE lt_but WHERE pfk_code = c_tcode_cd AND pfno = lv_pfno.
    DELETE lt_pfk WHERE code     = c_tcode_cd AND pfno = lv_pfno.
  ENDLOOP.

  DESCRIBE TABLE lt_del_code LINES lv_cnt.
  WRITE: / '  剔除基线自有自定义码 =', lv_cnt.

ENDFORM.

*&---------------------------------------------------------------------*
*& 分配 pfno / but_no
*&   ① 先按 code 沿用现有号 → 重跑幂等，不会越漂越远
*&   ② 无号者从 C_PFNO_START 起挑空闲；按钮序号接 lt_but 最大值递增
*&---------------------------------------------------------------------*
FORM assign_numbers USING pv_prog TYPE trdir-name.

  DATA: lt_used  TYPE ty_pfno_t,
        lv_maxno TYPE i,
        lv_cur   TYPE i,
        lv_cc    TYPE cua_butno.

* lt_but 现有按钮序号最大值（用未删改前的表）
  LOOP AT lt_but INTO ls_but.
    lv_cur = ls_but-no.
    IF lv_cur > lv_maxno.
      lv_maxno = lv_cur.
    ENDIF.
  ENDLOOP.

* ① 沿用现有 pfno
  LOOP AT lt_target ASSIGNING <t> WHERE prog = pv_prog.
    READ TABLE lt_pfk INTO ls_pfk WITH KEY funcode = <t>-code.
    IF sy-subrc = 0.
      <t>-pfno = ls_pfk-pfno.
    ENDIF.
  ENDLOOP.

* 收集已占用 pfno（'S' 是工具栏分隔符，不算占用）
  LOOP AT lt_pfk INTO ls_pfk WHERE pfno <> 'S'.
    APPEND ls_pfk-pfno TO lt_used.
  ENDLOOP.
  SORT lt_used.
  DELETE ADJACENT DUPLICATES FROM lt_used.

* ② 挑空闲 pfno
  LOOP AT lt_target ASSIGNING <t> WHERE prog = pv_prog.
    IF <t>-pfno IS INITIAL.
      PERFORM pick_pfno USING lt_used CHANGING <t>-pfno.
      IF <t>-pfno IS INITIAL.
        <t>-flg_skip = 'X'.
        CONCATENATE '    !! 无空闲功能键号，跳过' <t>-code INTO lv_msg.
        WRITE: / lv_msg.
        CONTINUE.
      ENDIF.
      APPEND <t>-pfno TO lt_used.
      SORT lt_used.
      DELETE ADJACENT DUPLICATES FROM lt_used.
    ENDIF.
  ENDLOOP.

* ③ 沿用现有 but_no
  LOOP AT lt_target ASSIGNING <t> WHERE prog = pv_prog
                                       AND flg_skip IS INITIAL.
    IF <t>-pfno IS NOT INITIAL.
      READ TABLE lt_but INTO ls_but WITH KEY pfk_code = c_tcode_cd
                                             pfno     = <t>-pfno.
      IF sy-subrc = 0.
        <t>-but_no = ls_but-no.
      ENDIF.
    ENDIF.
  ENDLOOP.

* ④ 补 but_no
  LOOP AT lt_target ASSIGNING <t> WHERE prog = pv_prog
                                       AND flg_skip IS INITIAL.
    IF <t>-but_no IS INITIAL.
      lv_maxno = lv_maxno + 1.
      CLEAR lv_cc.
      lv_cc = lv_maxno.
      <t>-but_no = lv_cc.
    ENDIF.

    CONCATENATE '   -' <t>-code ' pfno=' <t>-pfno ' but_no=' <t>-but_no
           INTO lv_msg.
    WRITE: / lv_msg.
  ENDLOOP.

ENDFORM.

*&---------------------------------------------------------------------*
*& 从 C_PFNO_START 起找第一个未被占用的功能键号（49~99 全是两位，无需补零）
*&---------------------------------------------------------------------*
FORM pick_pfno USING pt_used TYPE ty_pfno_t CHANGING cv_pfno TYPE cua_pfno.

  DATA: lv_i    TYPE i,
        lv_c    TYPE cua_pfno,
        lv_n(2) TYPE n,
        lv_p    TYPE cua_pfno,
        lt_pool TYPE ty_pfno_t.

  CLEAR cv_pfno.

* ① 优先用配置指定的槽位。
*    背景：RSMPE_BUT 的按钮没有自己的功能码字段，全靠 pfno 去 PFK 表里取，
*    所以槽位必须真实存在。49 以上的号不在生成的 CUA 功能键表里，
*    按钮能画出来，但一点就报「无效脚本标识」（WebGui）。
*    手工在 SE41 建的按钮 SAP 自己就放在 13/14 这一带，同理。
  SPLIT c_pfno_pool AT ',' INTO TABLE lt_pool.
  LOOP AT lt_pool INTO lv_p.
    IF lv_p IS INITIAL.
      CONTINUE.
    ENDIF.
    READ TABLE pt_used TRANSPORTING NO FIELDS WITH KEY table_line = lv_p.
    IF sy-subrc <> 0.
      cv_pfno = lv_p.
      RETURN.
    ENDIF.
  ENDLOOP.

* ② 兜底：从起始号顺序找空位（个位数要补零，否则 '9 ' 匹配不上 '09'）
  lv_i = c_pfno_start.
  DO 51 TIMES.
    IF lv_i > 99.
      EXIT.
    ENDIF.
    CLEAR: lv_c, lv_n.
    lv_n = lv_i.
    lv_c = lv_n.
    READ TABLE pt_used TRANSPORTING NO FIELDS WITH KEY table_line = lv_c.
    IF sy-subrc <> 0.
      cv_pfno = lv_c.
      EXIT.
    ENDIF.
    lv_i = lv_i + 1.
  ENDDO.

ENDFORM.

*&---------------------------------------------------------------------*
*& 追加目标功能码（幂等：同 code / 同 pfno 的旧行先剔除）
*&---------------------------------------------------------------------*
FORM append_targets USING pv_prog TYPE trdir-name.

  LOOP AT lt_target ASSIGNING <t> WHERE prog = pv_prog
                                       AND flg_skip IS INITIAL.

*   图标 ID 与技术名必须与 ICON 表配对 —— 配错 SAP 不报错，只是按钮没图标
    CLEAR lv_iname.
    SELECT SINGLE name FROM icon INTO lv_iname WHERE id = <t>-icon_id.
    IF sy-subrc <> 0 OR lv_iname <> <t>-icon_name.
      <t>-flg_skip = 'X'.
      CONCATENATE '    !! 图标校验失败，跳过:' <t>-code
                  ' id=[' <t>-icon_id '] 配置名=' <t>-icon_name
                  ' ICON表名=' lv_iname INTO lv_msg.
      WRITE: / lv_msg.
      CONTINUE.
    ENDIF.

    DELETE lt_set WHERE status   = c_state    AND function = <t>-code.
    DELETE lt_fun WHERE code     = <t>-code.
    DELETE lt_but WHERE pfk_code = c_tcode_cd AND pfno     = <t>-pfno.
    DELETE lt_pfk WHERE code     = c_tcode_cd AND pfno     = <t>-pfno.

    CLEAR ls_staf.
    ls_staf-status   = c_state.
    ls_staf-function = <t>-code.
    APPEND ls_staf TO lt_set.

    CLEAR ls_funt.
    ls_funt-code      = <t>-code.
    ls_funt-textno    = '001'.
    ls_funt-fun_text  = <t>-ftext.
    ls_funt-icon_id   = <t>-icon_id.
    ls_funt-text_type = 'S'.
    ls_funt-text_name = <t>-icon_name.
    ls_funt-icon_text = <t>-icon_text.
    ls_funt-info_text = <t>-info_text.
    APPEND ls_funt TO lt_fun.

    CLEAR ls_but.
    ls_but-pfk_code = c_tcode_cd.
    ls_but-code     = c_but_code.
    ls_but-no       = <t>-but_no.
    IF c_no_pfk = 'X'.
*      ⚠️ 死路，别启用：RSMPE_BUT 没有自己的功能码字段，按钮完全靠 pfno 去
*      PFK 表里取功能码。pfno='S' 在 CUA 里是**工具栏分隔符**，不是「无快捷键
*      的按钮」—— 实测（2026-09-18）开启后 ZMY_PROGA 状态里的按钮全部消失。
*      「按钮可点、无键盘快捷键」在 CUA 模型里做不到；要避开快捷键只在槽位号上
*      做文章（见 pick_pfno 的 c_pfno_pool 注释）。
      ls_but-pfno = 'S'.
    ELSE.
      ls_but-pfno = <t>-pfno.
    ENDIF.
    APPEND ls_but TO lt_but.

    IF c_no_pfk <> 'X'.
      CLEAR ls_pfk.
      ls_pfk-code    = c_tcode_cd.
      ls_pfk-pfno    = <t>-pfno.
      ls_pfk-funcode = <t>-code.
      ls_pfk-funno   = '001'.
      APPEND ls_pfk TO lt_pfk.
    ENDIF.

    CONCATENATE '    + ' <t>-code ' ' <t>-ftext INTO lv_msg.
    WRITE: / lv_msg.
    CONCATENATE '      图标=' <t>-icon_id '/' <t>-icon_name
                ' 图标文本=' <t>-icon_text
                ' 信息文本=' <t>-info_text INTO lv_msg.
    WRITE: / lv_msg.
  ENDLOOP.

ENDFORM.
