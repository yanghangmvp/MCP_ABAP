# SD 增强字段 · `EXTENSIONIN`（`BAPIPAREX_T`）

**用途**：把客户自定义 `ZZ*` 字段通过标准扩展接口落进 `VBAKKOZ`/`VBAPKOZ`，**不要提交后回写底表**。
**四段承载链缺一段值就搬不过去**；`VALUEPART1` 只有 240 字符；标识结构必须是 `CHAR1`。
**同域**：创建 `sd-salesdocument-create.md` · 变更 `sd-salesdocument-change.md`

> 章号沿用原 SD 分册编号，便于与其它册互引。

---

## 4. ★★ 客户增强字段走 `EXTENSIONIN`（标准扩展接口），不要提交后回写底表

**首选方案（2026-10-10 起，`ZBPM_ISP016` 实证）**：SD 标准函数的 `EXTENSIONIN`（类型 `BAPIPAREX_T`，行类型 `BAPIPAREX`）**可以承载客户增强字段**——只要标准结构已按四段链建好。用它能与订单主体**同一次提交**落库，比"提交后 `UPDATE` 底表"干净得多（没有落库时序问题、没有删除行误报失败、`TESTRUN`/模拟运行下也能被标准函数一起回滚）。

> 旧结论「本系统未部署 `BAPI_TE_VBAK`/`BAPI_TE_VBAP` ⇒ 只能提交后 `UPDATE`」**已作废**：不需要这两个结构，`EXTENSIONIN` 走的是另一条路。
> 参考：<https://www.cnblogs.com/BinGeneral/p/15570798.html>

### 4.1 承载链（四段必须全齐，缺一段值就搬不过去）

```
抬头：BAPE_VBAK  → ZSBAPE_VBAK  → VBAKKOZ/VBAKKOZX  append ZSVBAKKOZ/ZSVBAKKOZX
      ↑ 另有 VBAKKOM/VBAKKOMX append ZSVBAKKOZ/ZSVBAKKOZX
行项：BAPE_VBAP  → ZSBAPE_VBAP  → VBAPKOZ/VBAPKOZX  append ZSVBAPKOZ/ZSVBAPKOZX
      ↑ 另有 VBAPKOM/VBAPKOMX append ZSVBAPKOZ/ZSVBAPKOZX
```

实测长度（**决定要不要分块，见 §4.3**）：`BAPE_VBAK` = **204**、`BAPE_VBAKX` = 27、`BAPE_VBAP` = **271**、`BAPE_VBAPX` = 64。

### 4.2 ★ 键位：`BAPE_*` 的前两个字段是 `VBELN` + `POSNR`

`BAPE_VBAK` / `BAPE_VBAKX` 首字段是 `VBELN`（`VBELN_VA`）+ `POSNR`（`POSNR_VA`），`BAPE_VBAP` / `BAPE_VBAPX` 同。
标准函数内部把 `EXTENSIONIN` 的值 `move-corresponding` 进 `E_VBAKKOM` / `E_VBAPKOM` ⇒ **`VBELN` 留空会把单号清掉**。

- **修改模式必须随单号下发**：`ls_val-vbeln = iv_vbeln.` / `ls_valx-vbeln = iv_vbeln.`（行项目再加 `posnr`）。
- **创建模式传 `space`**（单号还没生成），`move-corresponding` 无害。
- 不传的后果：`V1 045`「输入凭证编号」，或随之 `V4 219`「销售凭证 &1 没有修改」。**`V4 219` 是"最后一条"兜底消息**（`SD_SALESDOCUMENT_CHANGE` 第 13 步 `loop at return where type = chare or chari` 触发），**真正原因看它前面那条消息**。

### 4.3 ★★ `VALUEPART1` 只有 240 字符 ⇒ 值结构必须按 240 分块

`BAPIPAREX-VALUEPART1` = **240**，`VALUEPART1~4` 合计 **960**。标准函数按 `extensionin-structure` 的长度（= **30**，`structure` 字段本身）+ 偏移**整体连续读**值段 ⇒ **超过 240 的结构只填 `VALUEPART1` 会被静默截断**（`BAPE_VBAP` = 271 ⇒ 尾部字段全丢，本接口实测丢掉 `ZVBAP_YL3~5`；`BAPE_VBAK` = 204 不超，所以**抬头侧不暴露问题**，很容易漏判）。

**判据**：`DESCRIBE FIELD` 取值结构长度，`> 240` 就要分块。

```abap
FORM frm_add_ext USING    iv_structure TYPE char30   " 'BAPE_VBAK' 等
                          iv_value     TYPE any
                 CHANGING ct_ext       TYPE bapiparex_t.
  DATA: ls_ext TYPE bapiparex,
        lv_msg TYPE c LENGTH 960.                      " 30 + 240*4 = 990，值段取 960
  CLEAR: ls_ext, lv_msg.

  cl_abap_container_utilities=>fill_container_c(       " ★ 见 §4.4
    EXPORTING im_value     = iv_value
    IMPORTING ex_container = lv_msg ).

  ls_ext-structure  = iv_structure.
  ls_ext-valuepart1 = lv_msg(240).
  ls_ext-valuepart2 = lv_msg+240(240).
  ls_ext-valuepart3 = lv_msg+480(240).
  ls_ext-valuepart4 = lv_msg+720(240).
  APPEND ls_ext TO ct_ext.
ENDFORM.
```

### 4.4 ★ 序列化只用 `fill_container_c`，别手写 `ASSIGN ... CASTING`

`cl_abap_container_utilities=>fill_container_c` 与标准函数内部用的 `READ_CONTAINER_C` **互为逆运算**，转换长度**自动按源结构的类型信息取**，无需手算。

手写搬运的两处死法（都实测过）：

| 写法 | 结果 |
|---|---|
| `ASSIGN iv_value TO <fs> CASTING TYPE c LENGTH lv_len.` | **激活失败**：`".", "RANGE ...", "DECIMALS ...", or "ELSE UNASSIGN" expected after "C".`（本版 ABAP 不支持 `CASTING ... LENGTH <变量>`，长度必须是字面量） |
| 退回 `ASSIGN iv_value TO <fs> CASTING TYPE c.` + `lv_msg+0(lv_len) = <fs>+0(lv_len)` | **运行 DUMP**：`Invalid subfield access: Offset plus length too long`（不带 `LENGTH` 时字段符号长度**不跟随源结构**，`+0(lv_len)` 越界） |

### 4.5 ★★ 标识结构（`*KOZX`）的字段数据元素必须是 `CHAR1`，不能是 `BAPIUPDATE`

这是「**创建能写、修改写不进**」的唯一真因，且**返回 `S`、值不变、零报错**，最难判断。

- `SD_SALESDOCUMENT_CHANGE` 第 07 步调 `GET_CHANGEABLE_FIELDS`（包含程序 **`LVBAKF0G`**）：用 `DDIF_NAMETAB_GET` 取 `VBAKKOMX` / `VBAPKOMX` 的字段后——
  ```abap
  LOOP AT ... WHERE rollname = 'CHAR1' OR rollname = 'CHAR01'.
    " 只把这些字段滚动进 FT_VBAKKOMX / FT_VBAPKOMX
  ENDLOOP.
  ```
  随后 `SD_VBAKKOM_ERMITTELN` 遍历 `T_DD03L_FIELDS`，`IF <I_VBAKKOMX_FIELD> = CHARX.` 才搬值。
- 若 `ZSVBAKKOZX` / `ZSVBAPKOZX` 的字段数据元素是 `BAPIUPDATE` ⇒ **整批被排除**，值不搬、**不报错**。
- **为什么创建能写**：创建路径**不走**这份可变更字段清单。
- **修复**：把两个 append 结构的标识字段数据元素改成 `CHAR1`。
  ```bash
  node scripts/call-adt-tool.js UpdateStructure @/tmp/ZSVBAKKOZX_update.json
  # { "structure_name": "ZSVBAKKOZX", "ddl_code": "<完整 DDL>",
  #   "transport_request": "<父请求号>", "activate": true }
  ```
  改后核验上层：`VBAKKOMX` / `VBAKKOZX` / `VBAPKOMX` / `VBAPKOZX` 的 Z 字段 `ROLLNAME` 应全为 `CHAR1`。

### 4.6 值 ↔ 标识的逐字段对应（含 `&&` 清空）

```abap
PERFORM frm_set_ext_field USING    <入参字段>
                          CHANGING <值结构>-<字段> <标识结构>-<字段> lv_changed.
```

| 入参取值 | 值结构 | 标识结构 | 效果 |
|---|---|---|---|
| 空 | 不赋值 | 不置 `X` | **本次不更新** |
| `&&`（修改模式） | `CLEAR` | 置 `X` | **清空** |
| 其它 | 原值 | 置 `X` | **更新** |

只要有一个字段产生动作（`cv_has = abap_true`），才 `APPEND` 该 `EXTENSIONIN` 条目 —— 即**修改模式只下发要变的增强字段**。

⚠️ **`&&` 清空的边界**：只对**长度 ≥ 2 的字符字段**有效。`CHAR1` 标志位与数值字段写 `&&` 会被截断成 `&`，语义无意义 ⇒ 这两类只走「空 = 不改 / 非空 = 改」，**无法表达"标志位从 X 改回空"**（需与对接方另议标记）。

```abap
FORM frm_set_ext_field USING    iv_src   TYPE any
                       CHANGING cv_val   TYPE any
                                cv_valx  TYPE any
                                cv_has   TYPE abap_bool.
  DATA lv_type TYPE c LENGTH 1.
  DESCRIBE FIELD iv_src TYPE lv_type.
  IF lv_type = 'C' OR lv_type = 'g'.
    IF iv_src = '&&'.                    " 清空
      CLEAR cv_val.   cv_valx = 'X'.   cv_has = abap_true.   RETURN.
    ENDIF.
  ENDIF.
  IF iv_src IS NOT INITIAL.              " 带值
    cv_val = iv_src.   cv_valx = 'X'.   cv_has = abap_true.
  ENDIF.
ENDFORM.
```

### 4.7 调用点：与订单主体同一个 `CALL FUNCTION`

```abap
CALL FUNCTION 'SD_SALESDOCUMENT_CREATE'          " 或 _CHANGE
  EXPORTING ... extensionin = lt_ext ...         " ← 直接挂在标准函数上
```

`frm_fill_ext` 一次性产出四张 `BAPE_*`（抬头 + 行项目），创建模式 `IV_VBELN` 传 `space`、修改模式传 `lv_vbeln`。
**代码里不要再有 `UPDATE vbak / vbap`** —— 改造后 `frm_update_ext` 应整体删除。

---

### 9.4 `EXTENSIONIN` 的「报错/静默」组合陷阱（2026-10-10 实测）

用 `EXTENSIONIN` 传增强字段时，会**连续撞两个独立问题**，且第二个**零报错**，极易把两者混成一个：

| 阶段 | 症状 | 真因 |
|---|---|---|
| 第一步 | 修改一律报 `E`：`V1 045 输入凭证编号` → `V4 219 销售凭证 &1 没有修改` | `BAPE_VBAK`/`BAPE_VBAP` 首字段 `VBELN` 未赋值 → §4.2 |
| 第二步 | 修完键位后**返回 `S`**，但 `VBAK-ZHTLX` 等**仍是旧值**，**无任何提示** | `*KOZX` 标识字段数据元素为 `BAPIUPDATE`，被 `GET_CHANGEABLE_FIELDS` 排除 → §4.5 |

**诊断顺序（照做即可定位）**：

1. **先看报错**：`V4 219` 永远看它**前面**那条消息（本例 `V1 045` 才是根因）。
2. **确认键位**：`BAPE_*` 的 `VBELN`（+ 行项目 `POSNR`）在修改模式下是否已下发。
3. **确认长度**：`DESCRIBE FIELD <值结构> LENGTH n.` —— `n > 240` 就必须按 240 分块填 `VALUEPART1~4`（§4.3）。
4. **确认标识字段数据元素**：查 `DD03L.ROLLNAME`，`*KOZX` 的 Z 字段必须全部是 `CHAR1`（§4.5）。可用
   ```bash
   node scripts/adt.js query "SELECT * FROM DD03L WHERE TABNAME = 'ZSVBAPKOZX'"
   ```
5. **构造「同时传标准字段 + 增强字段」的用例**：若两者同时落库而"只传增强字段"失败，说明是两个独立问题；只测一种很容易误判。`ZBPM_ISP016` 的用例㉑-2 就是为此设的。

**通用教训**：`EXTENSIONIN` 的两类失败模式——**报错型**（键位/格式）与**静默型**（变更清单/长度截断）——必须分别用不同类型的断言覆盖：前者看 `ES_RETURN-MSGTY`，后者必须**落库读回逐字段对账**。只断言"接口返回 S"是不够的。

---
