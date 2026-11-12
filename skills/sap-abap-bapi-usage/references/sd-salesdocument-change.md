# SD 销售订单变更 · `SD_SALESDOCUMENT_CHANGE`

**用途**：行项目增 / 改 / 删判定、全量比对范式、清空标识 `&&`、E2E 测试要点、常见报错速查。
**模拟**：`simulation = 'X'`。**判错**：两表必须都填 `ITM_NUMBER`。
**同域**：创建 `sd-salesdocument-create.md` · 增强字段 `sd-extensionin.md` · 计划行 `sd-schedule-line-qty.md`

> 章号沿用原 SD 分册编号，便于与其它册互引。

---

## 6. 修改模式的行项目增 / 改 / 删判定

先取现有行项目号：`SELECT posnr FROM vbap INTO TABLE @lt_posnr WHERE vbeln = @lv_vbeln.`

| 条件 | `BAPISDITMX-UPDATEFLAG` | X 结构 |
|---|---|---|
| `ZITEM_DL = 'X'` | `'D'` | 无需逐字段置 X |
| 行项目号**不在** `lt_posnr` | `'I'` | 所有下传字段一并置 `'X'` |
| 行项目号**在** `lt_posnr` | `'U'` | 只对本行传了值的字段置 `'X'` |

### 6.1 ★ 更省事的做法：去掉删除标识，改「全量比对」

若调用方本就每次都传**全量行项目**，可不设删除标识：把入参各 `POSNR` 收集排序，反向遍历 `vbap` 现有 `POSNR`，**在入参中查不到的即置 `'D'`**。接口契约更简单（少一个字段、少一类校验），语义从「增量 + 显式删除」变为「全量覆盖」。

```abap
SELECT posnr FROM vbap INTO TABLE @lt_vbap WHERE vbeln = @lv_vbeln.
SORT lt_vbap BY table_line.

CLEAR lt_in_pos.
LOOP AT is_input-item INTO ls_fs_item.
  APPEND ls_fs_item-posnr TO lt_in_pos.
ENDLOOP.
SORT lt_in_pos BY table_line.

LOOP AT lt_vbap INTO lv_del.
  READ TABLE lt_in_pos TRANSPORTING NO FIELDS
       WITH KEY table_line = lv_del BINARY SEARCH.
  CHECK sy-subrc <> 0.

  CLEAR: ls_itm, ls_itmx.
  ls_itm-itm_number  = lv_del.      " ★ 两表都要填，见 §9.2
  ls_itmx-itm_number = lv_del.
  ls_itmx-updateflag = 'D'.
  APPEND ls_itm  TO lt_item.
  APPEND ls_itmx TO lt_itemx.
ENDLOOP.
```

配套：走 `EXTENSIONIN`（`sd-extensionin.md` §4）后**没有提交后回写底表这一步**，被删行自然不会误报「增强字段写入失败」——初版那种 `CONTINUE` 补丁（旧的 `frm_update_ext`）应随改造一并删除。

**注意接口的入参校验通常要求修改模式也必须传行项目的 `MATNR` / `KWMENG` / `VRKME`**（与 FS「行项目必输」一致）
⇒ 调用方**不能只传要改的那个字段**（如只传新短文本），必须带上物料、数量、销售单位。这是设计约束，要在接口文档里写明。

---

### 6.3 ★ 「清空标识」范式：字符字段传 `&&` 即置空

当调用方每次都传全量数据、需要某种手段表达"把这个字段清掉"时（`BAPISDHD1`/`BAPISDITM1` 里空串只能表达"不传"，无法区分"不改"与"改空"），**用保留值 `&&` 作为清空标记**是个干净的做法。

**字符字段 —— 动态遍历，不硬编码字段名**：

```abap
FORM frm_clear_mark CHANGING cs_data TYPE any.
  DATA: lv_count TYPE i, lv_type TYPE c LENGTH 1.
  FIELD-SYMBOLS: <lv_comp> TYPE any.

  DESCRIBE FIELD cs_data TYPE lv_type COMPONENTS lv_count.   " ★ TYPE 必须在 COMPONENTS 之前
  IF lv_count = 0. RETURN. ENDIF.

  DO lv_count TIMES.
    ASSIGN COMPONENT sy-index OF STRUCTURE cs_data TO <lv_comp>.
    IF sy-subrc <> 0. EXIT. ENDIF.
    DESCRIBE FIELD <lv_comp> TYPE lv_type.
    IF lv_type = 'C' OR lv_type = 'g'.                        " 只处理字符型
      IF <lv_comp> = '&&'. CLEAR <lv_comp>. ENDIF.
    ENDIF.
  ENDDO.
ENDFORM.
```

- 挂载点：**结构填充完成之后、交给标准函数之前**，对 `BAPISDHD1`（抬头）/ `BAPISDITM1`（行项目）/ `BAPISCHDL`（计划行）各调一次。
- `lv_type = 'C' OR 'g'`（`g` = 字符串）天然跳过数字、日期与**内嵌结构/内表**（那些类型是 `u`/`v`/`h`），不会误清。
- **不要逐字段 `IF ls_hd-bstnk = '&&'. CLEAR ls_hd-bstnk. ENDIF.`** —— 字段一多就漏，且结构新增字段要改代码。

**长文本 —— 必须走功能码 `'003'`，且先查存在性**（详见 `sd-long-text.md` §9.3）：

```abap
IF iv_text = '&&'.
  IF iv_function IS INITIAL OR iv_vbeln IS INITIAL. RETURN. ENDIF.   " 创建模式不处理
  IF iv_posnr IS INITIAL.                                             " 抬头
    lv_object = 'VBBK'.   lv_tdname = iv_vbeln.
  ELSE.                                                               " 行项目
    lv_object = 'VBBP'.   CONCATENATE iv_vbeln iv_posnr INTO lv_tdname.
  ENDIF.

  SELECT SINGLE tdname FROM stxh INTO @lv_dummy                       " ★ 不存在就跳过
    WHERE tdobject = @lv_object AND tdname = @lv_tdname
      AND tdid = @iv_tdid AND tdspras = @sy-langu.
  IF sy-subrc <> 0. RETURN. ENDIF.

  CLEAR ls_text.
  ls_text-function   = '003'.                                         " ★ 003 = 删除
  ls_text-itm_number = iv_posnr.
  ls_text-text_id    = iv_tdid.
  ls_text-langu      = sy-langu.
  APPEND ls_text TO ct_text.
  RETURN.
ENDIF.
```

**语义分工（要写进接口文档）**：长文本传**空串 = 本次不处理**（保持原值），传 `&&` = **删除**；与"行项目传全量"相反，调用方**只下发需要改动的文本**即可。
**风险提示**：`&&` 成了保留值，须与对接方确认业务取值不会恰好是 `&&`；有疑虑就换更特殊的标记（如 `~CLEAR~`）。

---

## 7. E2E 测试要点

- **环境**：集团 300 才有销售订单主数据（客户销售视图、物料销售视图、定价过程）。集团 100 无 `VBAK` 数据。
- **运行命令**：
  ```bash
  SAP_ENV_FILE=$PWD/env/dev.env SAP_CLIENT_OVERRIDE=300 SAP_LANGUAGE_OVERRIDE=zh \
    node scripts/work/adt.js run ZTEST_ISP016_E2E2
  ```
- **落库断言用唯一标记**：把 `'E16C' + sy-datum + sy-uzeit`（≤20 字符）写进 `VBAK-ZBPMNO`，
  然后 `SELECT vbeln FROM vbak WHERE zbpmno = @lv_mark` 精确取回本次生成的订单号，**避免误命中历史数据**。
  测试运行（`TESTRUN='X'`）用另一个前缀的标记，断言其行数 = 0。
- **断言清单**（创建路径）：抬头（`AUART/VKORG/VTWEG/SPART/KVGR5/BSTNK/WAERK/KNUMV` + 增强字段）→
  行项目（`MATNR/KWMENG/VRKME/WERKS/PSTYV` + 增强）→ 计划行（`VBEP`）→ 伙伴（`VBPA` 按 `KUNNR` 判，见 `sd-salesdocument-create.md` §2.3）→
  条件（`PRCD_ELEMENTS WHERE knumv = vbak-knumv AND kschl = 'ZP01'`）→ 文本（`STXH WHERE tdobject='VBBK' AND tdname=vbeln`）。
- ★★ **增强字段必须做「全量字段对账」**：把 `VBAK` / `VBAP` 的**每一个** Z 字段逐一读回比对（`ZBPM_ISP016` 实测为抬头 22 字段 + 行项目 17 字段），**不能只断言"接口返回 S"**——尾部字段被截断、修改模式整批未更新，两种失败都**零报错**。数值型入参字段（如 `DEC`）断言要用数值字面量。
- ★ **修改模式要有「选择性更新」用例**：只下发部分增强字段 + 其中一个传 `&&` 清空，断言**未下发的字段保持原值**（证明标识结构逐字段置 `X` 生效）。
- ★ **要有一个「标准字段 + 增强字段同时传」的用例**：否则容易把「报错型」与「静默型」两类失败混成一个问题（见 `sd-extensionin.md` §9.4）。
- ★ **退货订单（`Z011`）要单列用例**：`㉓-1` TESTRUN 参考原销售订单（回归点：行项目 `REF_DOC_CA` 是否下发）→ `㉓-2` 正式创建并核对 `VBAP-PSTYV = Z011`、`VGBEL / VGPOS / VGTYP` 全部落库（见 `sd-reference-doc-return.md` §10）。**这是普通订单用例覆盖不到的路径**——参考单据三件套、项目类别随订单类型变化都只在退货场景暴露。
- **`$TMP` 探针不可定义 `FORM`**（激活报 `Statement is not accessible`）⇒ 复用逻辑用 `DEFINE` 宏。
- 探针会真实创建订单，多次运行会累积。**在报告里记录订单号**；300 集团属测试环境可接受。

---

## 8. 常见报错 → 根因速查

| 报错 | 根因 |
|---|---|
| `V2 157 Missing text for division xx language EN` | 会话语言为 EN 而 `TSPAT` 无英文文本 → `sd-salesdocument-create.md` §1 |
| 订单创建返回 `S` 但 `VBAP-KWMENG = 0` | 新增行未传计划行（**与交货相关**的类型）→ `sd-schedule-line-qty.md` §5 |
| 借项 / 贷项凭单请求（`Z014` / `Z015`）返回 `S` 但 `VBAP-ZMENG = 0` 且 `NETWR = 0` | 该类项目类别不产生计划行，只给计划行必丢数量；须补下 `BAPISDITM-TARGET_QTY` → `sd-schedule-line-qty.md` §5.1 |
| 维护借项 / 贷项凭单请求（`Z014` / `Z015`）报 `E`「请检查计划交货数量！」（`ZSD01 s005`） | 该类项目类别**不产生计划行**（`TVEPZ` 无条目）⇒ `VBAP-KWMENG` 恒为 0，调用方无从下发计划行，计划行数量校验**恒不通过**。校验前先按 `TVEPZ` 判据免除该行 → `sd-schedule-line-qty.md` §5.1 / `sd-schedule-line-qty.md` §6.2 |
| `V2 068 凭证 &1 不含凭证类别 &2 但含 &3`（&2 为空） | 行项目参考单据少了 **`REF_DOC_CA`（参考凭证类别）** → `sd-reference-doc-return.md` §10.1 |
| `V2 068 凭证 &1 不含凭证类别 &2 但含 &3`（**&3 为空**、&1 看着像行项目号） | 行项目 `VGBEL` 填了**不存在**的单据号，或 `VGPOS` 填 0 —— 三件套指的是**被参考单据**的编号/行号，不是本单行项目号 → `sd-reference-doc-return.md` §10.1 |
| `V1 321 没有为项目 &2 定义项目类别 &1` | 行项目 `PSTYV` 与订单类型不匹配 → `sd-reference-doc-return.md` §10.2 |
| 修改订单报 `V1 045 输入凭证编号` / `V4 219 销售凭证 &1 没有修改`（用了 `EXTENSIONIN`） | `BAPE_*` 的键位字段 `VBELN` 没下发，`move-corresponding` 清空了单号 → `sd-extensionin.md` §4.2（`V4 219` 是兜底消息，**根因看它前面那条**） |
| 增强字段**尾部几个字段**不落库（前几个正常） | 值结构 > 240 字符而只填了 `VALUEPART1`，被静默截断 → `sd-extensionin.md` §4.3（`BAPE_VBAP` = 271 会踩，`BAPE_VBAK` = 204 不会） |
| 创建时增强字段能落库、**修改时返回 `S` 但值不变且零报错** | `*KOZX` 标识字段数据元素是 `BAPIUPDATE`（须为 `CHAR1`），被 `GET_CHANGEABLE_FIELDS` 整批排除 → `sd-extensionin.md` §4.5 |
| 激活报 `".", "RANGE ...", "DECIMALS ...", or "ELSE UNASSIGN" expected after "C".` | 用了 `ASSIGN ... CASTING TYPE c LENGTH <变量>` → `sd-extensionin.md` §4.4 |
| 运行 DUMP `Invalid subfield access: Offset plus length too long`（在序列化 FORM 里） | `ASSIGN ... CASTING TYPE c`（不带 `LENGTH`）后字段符号长度不跟随源结构 → `sd-extensionin.md` §4.4 |
| `销售订单 xxx 行项目 yyy 增强字段写入失败`（数据其实已改对） | 旧方案（提交后 `UPDATE` 底表）未跳过已删除行；**改用 `EXTENSIONIN`（`sd-extensionin.md` §4）后此问题消失** |
| 激活报 `Unknown column name "ABGRU"` / `"XLOEK"` | 本系统 S/4 无该列 → `sd-salesdocument-create.md` §3 |
| 激活报 `The elements in the "SELECT LIST" list must be separated using commas` | 多字段 `SELECT` 漏逗号（S/4 语法）→ 一律逗号分隔 |
| 修改订单只改一个字段就报「物料不能为空」 | 修改模式同样强制行项目必输字段 → §6 |
| `000010:在定价过程XXX中定价类型YYY不在步骤编号001中` | 新条件硬编码了 `COND_ST_NO` → §9.1 |
| `没有可用的项目类别 (表 T184 xxx yyy) / ITEM_IN 000000中出现错误` | `ITEM_IN` / `ITEM_INX` 排序后错位（报错文本与真因完全不相干）→ §9.2 |
| 修改订单报 `header_inx-updateflag` 非法 | `ORDER_HEADER_INX-UPDATEFLAG` 只能是 `'U'` 或 `'D'`（函数入口硬校验，见 `SD_SALESDOCUMENT_CHANGE` 源码） |
| 传 `FUNCTION='005'` 清长文本：返回 `S` 但 `STXH` 里文本还在 | `'005'` 只走 `CREATE_TEXT` 覆盖写入 → `sd-long-text.md` §9.3，改用 `'003'` |
| 清空长文本反而把接口打成 `E`（消息 `E600`） | `DELETE_TEXT` 对不存在的文本 `MESSAGE E600 ... RAISING NOT_FOUND` → `sd-long-text.md` §9.3，删前先查 `STXH` |
| 激活报 `"TYPE ..." is missing between "X" and "COMPONENTS".` | `DESCRIBE FIELD` 取组件数漏了 `TYPE` 子句 → `DESCRIBE FIELD x TYPE t COMPONENTS n.` |

---

## 9. ★ 「报错文本与真因不相干」的坑（2026-10-09 / 10-10 实测）

### 9.1 新定价条件不能指定步骤号

- **现象**：创建订单报 `000010:在定价过程ZGSDC1中定价类型ZP01不在步骤编号001中 / 销售凭证 没有修改`。
- **根因**：把新条件的 `BAPICOND-COND_ST_NO` 硬编码成 `'001'`。标准函数按「定价过程 + 步骤号」校验条件类型是否存在；本系统 `T683S` 中 `ZGSDC1` 的 `ZP01` 实际位于 **`STUNR = '010'`**。
- **正解**：**只有条件已存在时才回填步骤号**——`PRCD_ELEMENTS` 按 `KNUMV + KPOSN + KSCHL + KINAK = ''` 命中，才把 `STUNR`/`ZAEHK` 写进 `COND_ST_NO`/`COND_COUNT` 并把 `BAPICONDX-UPDATEFLAG` 置 `'U'`；**新条件留空**（`'I'`），由定价过程按条件类型自动定位步骤。
- **查证手段**：`SELECT * FROM T683S WHERE KALSM = '<定价过程>'` 看各条件类型落在哪个 `STUNR`。
- 同时**不要设** `LOGIC_SWITCH-COND_HANDL = 'X'`（生产参照接口 `ZFM_SDI001` 不设，`logic_switch` 整个留空）。

### 9.2 SD 标准函数入口会排序成对表 ⇒ 删除行两表都必须带行项目号

- **现象**：修改订单删行报 `没有可用的项目类别 (表 T184 Z001  TEXT ) / ITEM_IN 000000中出现错误 / 销售凭证 xxx 没有修改`——**指向项目类别确定，与删除毫无关系**。
- **根因**：`SD_SALESDOCUMENT_CHANGE`（函数组 `VBAK`，包含程序 **`LVBAKF0C`**）入口处执行
  `sort item_in by itm_number ascending.` / `sort item_inx by itm_number ascending.`
  ——两张表**各自独立排序**。若删除行只填 `ITEM_INX` 而让 `ITEM_IN` 那一行整体留空（`ITM_NUMBER = '000000'`），排序后空行排到最前，**两表索引错位**，空行被当成新行参与项目类别确定 → 报 `T184` 查不到。
- **正解**：删除行**两张表都填 `ITM_NUMBER`**：

  ```abap
  CLEAR: ls_itm, ls_itmx.
  ls_itm-itm_number  = lv_del.     " ★ 关键
  ls_itmx-itm_number = lv_del.
  ls_itmx-updateflag = 'D'.
  APPEND ls_itm  TO lt_item.
  APPEND ls_itmx TO lt_itemx.
  ```

- **推论（通用）**：凡传给 `SD_SALESDOCUMENT_*` 的**成对表**（`ITEM_IN`/`ITEM_INX`、`SCHEDULE_IN`/`SCHEDULE_INX`、`CONDITIONS_IN`/`CONDITIONS_INX`），**行数必须一致、`ITM_NUMBER` 必须逐行相同**，不能靠「只填 X 表」偷懒。
- **排查手段**：`get_source.js FM SD_SALESDOCUMENT_CHANGE VBAK` 读标准源码；`D010INC WHERE MASTER = 'SAPLVBAK'` 找包含程序；`grep -n "form ms_move_item_inx"` 定位实现。
