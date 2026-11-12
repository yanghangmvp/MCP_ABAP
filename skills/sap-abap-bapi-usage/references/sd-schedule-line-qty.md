# SD 计划行与数量 · `BAPISCHDL` / `TVEPZ`

**用途**：计划行下发、数量为什么落成 0、改已存在计划行的类别与交货冻结、计划行数量业务校验。
**判据**：项目类别是否「与交货相关」看 `TVEPZ` 有无条目，**不是** `TVAP-LFREL` 也不是 `VBTYP`。
**同域**：创建 `sd-salesdocument-create.md` · 变更 `sd-salesdocument-change.md`

> 章号沿用原 SD 分册编号，便于与其它册互引。

---

## 5. ★ 计划行与数量：`CHANGE` 新增行的数量取自计划行

`BAPI_SALESORDER_CHANGE` **新增**行项目的数量取自 `SCHEDULE_LINES`（计划行），**不是** `ORDER_ITEM_IN-KWMENG`。
若只传 `order_item_in` 而漏了计划行 ⇒ BAPI 返回 `S`，但 `VBAP-KWMENG` 落库为 **`0.000`**（**静默丢数量**）。

**范式：行项目未配计划行时按 `KWMENG` 补一条**

```abap
" 创建模式：对全部行项目
LOOP AT is_input-it_item INTO ls_initm WHERE zitem_dl <> 'X'.
  READ TABLE lt_sched TRANSPORTING NO FIELDS WITH KEY itm_number = ls_initm-posnr.
  CHECK sy-subrc <> 0.
  CLEAR ls_sch.  ls_sch-itm_number = ls_initm-posnr.
  ls_sch-req_date = is_input-head-audat.  ls_sch-req_qty = ls_initm-kwmeng.
  APPEND ls_sch TO lt_sched.

  " 修改模式还要给出对应的 X 结构与 updateflag
  CLEAR ls_schx.  ls_schx-itm_number = ls_initm-posnr.
  ls_schx-req_date = 'X'.  ls_schx-req_qty = 'X'.  ls_schx-updateflag = 'I'.
  APPEND ls_schx TO lt_schex.
ENDLOOP.
```

**修改模式只对「本次新增（`VBAP` 中不存在）且入参未给计划行」的行补** —— 已存在行（`updateflag='U'`）不补，
避免覆盖原有计划行：

```abap
READ TABLE lt_posnr TRANSPORTING NO FIELDS WITH KEY table_line = ls_initm-posnr.
CHECK sy-subrc <> 0.          " 仅新增行
```

计划行字段映射：`ETENR → SCHED_LINE`、`EDATU → REQ_DATE`、`WMENG → REQ_QTY`、`LIFSP → REQ_DLV_BL`。

### 5.1 ★★ 数量有两条通道，取决于项目类别是否「与交货相关」（2026-10-10 实测）

上面的「补计划行」只对**会产生计划行**的订单类型（如 `Z001`）有效。**借项 / 贷项凭单请求（`Z014` / `Z015`）完全不适用** ——
它们的项目类别在 **`TVEPZ`（项目类别 → 计划行类别确定表）中没有配置** ⇒ SD **不生成计划行**，下发的 `BAPISCHDL` 被标准函数
**静默丢弃**（`VBEP` 0 行、零报错）。接口若只给计划行，数量与派生金额 `NETWR` **一起归零**。

> ⚠️ **判据是 `TVEPZ` 有没有条目，不是 `TVAP-LFREL`！**（2026-10-10 更正）
> 实测 `Z001` 与 `Z014` 的 `TVAP-LFREL` **都为空**，无法区分 —— 网上与老代码里「`LFREL` 空 ⇒ 无计划行」的
> 说法在**本系统不成立**。也**不能**按 `TVAK-VBTYP` 泛化：实测 `Z002`（`VBTYP='I'`）、`ZQT`（`VBTYP='B'`）**都有计划行**。

| 判定项 | 会产生计划行 | 不产生计划行 |
|---|---|---|
| `TVEPZ` 条目 | `Z001` / `Z002` / `Z011` / `Z013` **有** | **`Z014` / `Z015` 无** |
| `VBEP` 行数 | 各有 1 条 | 各 0 条 |
| `VBAP-KWMENG` | = 订单数量 | **恒为 0** |
| `TVAP-LFREL` | 空 | 空（**无法区分**） |

**关键事实**：`BAPISDITM` 里**没有任何字段的 `REFFIELD = KWMENG`**（`DD03L` 全表核实）—— BAPI **无法直接写 `VBAP-KWMENG`**。
数量只有两条进入通道：

| 通道 | BAPI 字段 | 落库 | 适用 |
|---|---|---|---|
| 计划行 | `BAPISCHDL-REQ_QTY` | `VBEP-WMENG` →（SD 汇总反写）`VBAP-KWMENG` | **产生**计划行的类型（`Z001`） |
| 目标数量 | `BAPISDITM-TARGET_QTY`（`DZMENG`，`REFFIELD = ZIEME`） | **`VBAP-ZMENG`** | **不产生**计划行的类型（`Z014`/`Z015`） |

**做法：两条都下发，无需按订单类型分支** —— 对交货相关的类型，标准函数**忽略** `TARGET_QTY`
（实测 `Z001`：`KWMENG = 5.000`、`ZMENG = 0.000`、计划行 2 条；与漏下 `TARGET_QTY` 时**完全相同** ⇒ 不会重复计数）：

```abap
* 行项目值与更新标识各加一行
cs_itm-target_qty = is_item-kwmeng.
IF is_item-kwmeng IS NOT INITIAL. cs_itmx-target_qty = 'X'. ENDIF.
```

（生产接口 `ZFM_SDI001` 的做法是按「目标数量」`ZMENG` 驱动：`ls_soitem-target_qty = ls_item-zmeng.`；入参没有 `ZMENG` 时取订单数量 `KWMENG`。）

**验收口径**：`Z014` / `Z015` 的「数量」看 **`VBAP-ZMENG`**；`VBAP-KWMENG` 对该类单据**恒为 0 属标准行为**
（300 既有早期单据 `5000000000`~`5000000003` 同样是 `KWMENG = 0` + `ZMENG = 1`）。→ 不要拿 `KWMENG` 做验收断言。

**排查两步（比盲试字段快得多）**：
1. `SELECT * FROM DD03L WHERE TABNAME = 'BAPISDITM' AND REFFIELD = '<底表字段>'` —— 先确认 BAPI 有没有对应字段；
2. `SELECT * FROM TVEPZ WHERE PSTYV = '<项目类别>'` —— **有条目 = 会产生计划行**（走计划行通道）；**无条目 = 不产生计划行**（数量只能走 `TARGET_QTY` → `ZMENG`）。★ **不要用 `TVAP-LFREL` 判断**（本系统 `Z001` 与 `Z014` 都为空）。

### 5.2 ★★ 改「已存在」计划行的类别 / 交货冻结（2026-10-27 `ZFID001C` 实测）

`VBEP-ETTYP`（计划行类别）与 `VBEP-LIFSP`（计划行交货冻结）**可以**经
`SD_SALESDOCUMENT_CHANGE` 的 `SCHEDULE_IN / SCHEDULE_INX` 改。三处硬约束，缺一则
「返回全 `S` 但字段一个字不动」：

1. **`BAPISCHDLX-UPDATEFLAG = 'U'`** —— 字段名是 `UPDATEFLAG`（不是 `UPDFLAG`），`BAPISCHDL` 本身没有该字段。
   不传时标准只回 `SCHEDULE_IN has been processed successfully`，`VBEP` 纹丝不动。
2. **每个行项目只下发一条 `SCHEDULE_IN`**（取 `MIN( ETENR )` 那条）。同一行项目下发多条 ⇒
   `V1 335 System error: Schedule line 0002 for item 000010 does not exist`，整单
   `V4 219 ... was not changed`。一条即够 —— 保存后该行项目**全部**计划行（`0001`/`0002`）同步变成目标值。
3. `SCHEDULE_INX` 的 `SCHED_TYPE` / `REQ_DLV_BL` 逐字段置 `'X'`；目标值本身就空的字段（如清除交货冻结）
   同样要置 `'X'`，否则不清空。

配套：

- `BAPI_SALESORDER_CHANGE`（封装层）对计划行与 `EXTENSIONEX` 增强字段**都不生效**，
  必须用 `SD_SALESDOCUMENT_CHANGE` + `CALL_FROM_BAPI = 'X'`。
- **不要同时下发 `ITEM_IN`**：标准按 `VBAP-SPART` 空值取产品组文本失败（`V2 157 Missing text for division 00`）。
- 该函数**不提交** ⇒ 调用侧 `COMMIT WORK AND WAIT`，异常 `ROLLBACK WORK`。
- 改完**必须回读校验**（`SELECT SINGLE`）：标准对计划行字段是静默跳过，「成功」不代表改了。

参考实现：`ZFID001C` 的 `frm_upd_pre_order`（FS ZSD018 预收款冻结订单解锁 / 回锁）。

---

### 6.2 计划行数量校验（业务规则，ZSD 惯例）

先取现有行项目号（同 `sd-salesdocument-change.md` §6.1），再逐行累计计划行数量：

```abap
LOOP AT it_item INTO ls_item.
  CLEAR lv_wmeng.
  LOOP AT ls_item-schedule INTO ls_schedule.
    lv_wmeng = lv_wmeng + ls_schedule-wmeng.
  ENDLOOP.

  READ TABLE lt_vbap TRANSPORTING NO FIELDS
       WITH KEY vbeln = lv_vbeln posnr = ls_item-posnr BINARY SEARCH.
  IF sy-subrc = 0.
    " 已存在的行项目：计划行数量必须一致
    IF lv_wmeng <> ls_item-kwmeng.
      cs_return-msgty = 'E'.
      MESSAGE s005(zsd01) INTO cs_return-msgtx.   " 请检查计划交货数量！
      RETURN.
    ENDIF.
  ELSE.
    " 新增的行项目：计划行数量不得大于订单数量
    IF lv_wmeng > ls_item-kwmeng.
      cs_return-msgty = 'E'.
      MESSAGE s004(zsd01) INTO cs_return-msgtx.   " 计划交货数量大于订单数量!
      RETURN.
    ENDIF.
  ENDIF.
ENDLOOP.
```

**注意三点**：
1. 参照实现 `ZFM_SDI001` 写作 `WHERE zmeng IS INITIAL`，靠行项目的「目标数量」`ZMENG` 排除"目标数量驱动计划行"的行。**若入参结构没有 `ZMENG`，就退化为对全部行校验**——此时务必确认业务可接受（含义：改行项目必须连计划行一起回传）。
2. 参照实现的两处 `MESSAGE` **没有置 `msgty`**（S 类型消息只填文本，返回状态为空），照抄会让调用方拿不到失败标志 ⇒ **补 `msgty = 'E'`**。
3. `ZSD01` 消息类**只有中文文本**（`T100` 里 `SPRSL` 仅 `1`）⇒ `MESSAGE ... INTO` 在非中文会话下取到空串，建议 `IF IS INITIAL. <中文字面量> ENDIF.` 兜底。

**★★ 必须先按项目类别豁免「不产生计划行」的订单类型**（2026-10-10 教训）：上面这套校验对 `Z014` / `Z015` 等
**不产生计划行**的项目类别会**恒报错** —— 它们的 `VBAP-KWMENG` 恒为 0、调用方无从下发计划行，
`lv_wmeng(0) <> ls_item-kwmeng(订单数量)` 永远成立。做法（判据同 §5.1 的 `TVEPZ`）：

```abap
" 取现有行项目时把项目类别一起取出
SELECT posnr, pstyv FROM vbap INTO TABLE @lt_vbap WHERE vbeln = @lv_vbeln.

... READ TABLE lt_vbap INTO ls_vbap WITH KEY posnr = ls_item-posnr BINARY SEARCH.
    lv_idx = sy-subrc.
    " 修改模式取 VBAP 现网真值；新增行取入参 PSTYV
    IF lv_idx = 0. lv_pstyv = ls_vbap-pstyv. ELSE. lv_pstyv = ls_item-pstyv. ENDIF.

    " ★ 项目类别未配置计划行类别 ⇒ 不产生计划行 ⇒ 整行跳过校验
    IF lv_pstyv IS NOT INITIAL.
      SELECT SINGLE pstyv FROM tvepz INTO @lv_chk WHERE pstyv = @lv_pstyv.
      IF lv_chk IS INITIAL. CONTINUE. ENDIF.
    ENDIF.

    IF lv_idx = 0.  " 已存在行：必须一致
      IF lv_wmeng <> ls_item-kwmeng. ... ENDIF.
    ELSE.           " 新增行：不得大于
      IF lv_wmeng >  ls_item-kwmeng. ... ENDIF.
    ENDIF.
```

判据取自标准配置表 ⇒ **自动覆盖未来新增的「无计划行」订单类型**，无需硬编码 `AUART` 清单。

**执行位置**：`SD_SALESDOCUMENT_*` 调用**之前**的前置校验段。
