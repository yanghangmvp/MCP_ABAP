# 生产订单 TECO / 状态操作（§10）

> 主册：[`../SKILL.md`](../SKILL.md)。BAPI 选型与签名在
> [`sap-abap-bapi-usage/references/bapi-prodord-complete-tech.md`](../../sap-abap-bapi-usage/references/bapi-prodord-complete-tech.md)；
> 本章只讲**报表里怎么组织状态判定与取数**（标志位结构、一次取全 JEST、BDC 兜底）。

## 10. 生产订单 TECO / 状态操作：ABAP 侧手法

> BAPI 选型（`BAPI_PRODORD_COMPLETE_TECH` / `SETUSERSTATUS` / 无 TECO Reset 只能用 BDC）见 `sap-abap-bapi-usage` → `references/bapi-prodord-complete-tech.md`。本节只讲报表里怎么组织状态判定与取数。

### 10.1 批量技术完成 → `BAPI_PRODORD_COMPLETE_TECH`

抬头级技术完成有专用 BAPI，不要用 `BAPI_ALM_ORDER_MAINTAIN` + `it_methods`。签名、判错与「没有技术完成日期入参」的绕法见 `sap-abap-bapi-usage` → `references/bapi-prodord-complete-tech.md`。

### 10.2 取消技术完成 → **没有标准 BAPI**，只能 BDC 调 CO02

实测 `SELECT funcname FROM enlfdir WHERE funcname LIKE 'BAPI_PRODORD%'`：34 个函数里有 `COMPLETE_TECH`/`CLOSE`/`SETUSERSTATUS`/`REVOKEUSERSTATUS`/`SET_DELETION_FLAG`，**无任何 TECO Reset**。`IBAPI_ALM_ORDER_TECO_RESET` 是 `IBAPI_*` 内部函数（未公开接口），不要当正式方案。

BDC 关键手法（屏幕 `SAPLCOKO1`）：

```abap
DATA(opt) = VALUE ctu_params( dismode = 'N' updmode = 'S' ).

" ★ 必须先取屏幕原值 —— 否则 CO02 的必输字段被 BDC 数据清空而报错
SELECT SINGLE aufnr, gamng, gmein, gltrp, gstrp, terkz, fhori, aprio
  FROM afko INTO @DATA(ls_afko) WHERE aufnr = @lv_aufnr.

PERFORM bdc_dynpro USING 'SAPLCOKO1' '0110'.       " 初始屏
PERFORM bdc_field  USING 'BDC_OKCODE' '=ENTK'.     " ★ 取消 TECO 功能码
PERFORM bdc_field  USING 'CAUFVD-AUFNR' lv_aufnr.
PERFORM bdc_field  USING 'R62CLORD-FLG_OVIEW' 'X'. " 展开视图

PERFORM bdc_dynpro USING 'SAPLCOKO1' '0115'.       " 切"数量/日期"页
PERFORM bdc_field  USING 'BDC_OKCODE' '=TABR'.

PERFORM bdc_dynpro USING 'SAPLCOKO1' '0115'.       " 保存
PERFORM bdc_field  USING 'BDC_OKCODE' '=BU'.
PERFORM bdc_field  USING 'CAUFVD-GAMNG' ls_afko-gamng.
WRITE ls_afko-gltrp TO lv_date.                    " 日期先转字符再传
PERFORM bdc_field  USING 'CAUFVD-GLTRP' lv_date.

CALL TRANSACTION 'CO02' USING gt_bdcdata
      OPTIONS FROM opt MESSAGES INTO gt_messtab.
```

**取 BDC 返回消息必须用表工作区字段**：`gt_messtab-msgid / -msgnr / -msgv1..4`，**不能写 `sy-msgid`/`sy-msgno`/`sy-msgv*`** —— 后者在 `LOOP AT gt_messtab` 里不随行变化，会导致错误信息取错或取空（标准模板里常见残留）。`BDCMSGCOLL` 的字段是 `MSGID/MSGNR/MSGTYP/MSGV1..4`（注意是 `MSGNR` 不是 `MSGNO`）。

### 10.3 用户状态（财务关闭标识等）用 `BAPI_PRODORD_SETUSERSTATUS`

`SETUSERSTATUS` / `REVOKEUSERSTATUS` 是 PP 官方接口，`STATUS_CHANGE_EXTERN` 亦可（`user_status` 传状态码、`set_chgkz = 'X'`）。细节见 `sap-abap-bapi-usage` → `references/bapi-prodord-user-status.md`。

### 10.4 状态判定的结构化写法（强烈推荐）

```abap
TYPES: BEGIN OF ty_statu_flag,
         i0001 TYPE flag,   "已创建
         i0045 TYPE flag,   "技术性完成
       END OF ty_statu_flag.

" 状态串 -> 标志位：组件名直接取 JEST-STAT 值
ASSIGN COMPONENT ls_jest-stat OF STRUCTURE gs_flag TO FIELD-SYMBOL(<fs_value>).
IF sy-subrc = 0.  <fs_value> = abap_true.  ENDIF.
```

之后所有业务条件都是可读布尔式，且集中一处：

```abap
IF ( ps_flag-i0001 = abap_true OR ps_flag-i0002 = abap_true )
   AND ps_flag-i0043 = abap_false AND ps_flag-i0076 = abap_false.
```

加新状态只加结构字段，不改判断逻辑。**比硬编码 `CASE lv_stat WHEN 'I0045' OR ...` 好维护得多。**

### 10.5 状态一次性取全，别逐单查

```abap
SELECT jest~objnr, jest~stat, tj02t~txt04, tj02t~txt30
  FROM jest
  JOIN tj02t ON jest~stat = tj02t~istat AND tj02t~spras = @sy-langu
  JOIN @lt_aufk AS a ON jest~objnr = a~objnr        "#EC CI_BUFFJOIN
 WHERE jest~inact = ''
  INTO TABLE @DATA(lt_jest).
SORT lt_jest BY objnr.
```

配合 `READ TABLE lt_jest TRANSPORTING NO FIELDS WITH KEY objnr = ... BINARY SEARCH`
+ `LOOP AT lt_jest INTO ... FROM sy-tabix` + `IF objnr <> ... EXIT.` 按订单切片遍历 —— 避免 N+1 查询。

### 10.6 其它配套手法

- `SET PARAMETER ID 'ANR' FIELD lv_aufnr.` + `CALL TRANSACTION 'CO03' AND SKIP FIRST SCREEN.` → 订单号跳 CO03（写在 `&IC1` 分支里）。
- `icon_led_green` / `icon_led_red` 放一个 `ID` 列，比文字标识更快看出执行结果。
- 执行/取消这类互斥动作，选择条件用 **`RADIOBUTTON GROUP`** 而非两个 `AS CHECKBOX`；配合
  `SET PF-STATUS 'X' EXCLUDING lt_extab`（用 `APPEND c_ucomm_xxx TO lt_extab`）**动态隐藏**另一个动作的功能码。
- `MESSAGE_TEXT_BUILD`（`msgid`/`msgnr`/`msgv1..4` → `message_text_output`）把 BAPI/BDC 消息统一转文本，比 `MESSAGE ID ... INTO` 稳。
