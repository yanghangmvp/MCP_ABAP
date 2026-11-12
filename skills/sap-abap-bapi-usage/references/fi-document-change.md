# `FI_DOCUMENT_CHANGE` · 修改已过账凭证

**用途**：改已过账凭证的**非金额类字段**（分配、文本、成本中心、付款条件等）。**绝不直接 `UPDATE BSEG`**。
**同域**：过账 `bapi-acc-document-post.md` · 冲销 `bapi-acc-document-rev-post.md`

---

## 1. 结构

- 组 `FACG`，`T_ACCHG` 只填 **`FDNAME`**（字段名）+ **`NEWVAL`**（新值）。
- **抬头不传 `I_BUZEI`，只有行项目改才传**。
- 行项目定位靠 `I_BUKRS` + `I_BELNR` + `I_GJAHR` + `BUZEI`。

```abap
ls_hdr-bukrs = lv_bukrs.
ls_hdr-belnr = lv_belnr.
ls_hdr-gjahr = lv_gjahr.

ls_item-buzei  = lv_buzei.
ls_item-fdname = 'SGTXT'.        " 要改的字段名
ls_item-newval = lv_new_text.

CALL FUNCTION 'FI_DOCUMENT_CHANGE'
  EXPORTING i_bukrs  = lv_bukrs
            i_belnr  = lv_belnr
            i_gjahr  = lv_gjahr
            i_header = ls_hdr
  TABLES    t_acchg  = lt_acchg
            t_return = lt_ret.
```

## 2. 硬约束

- **`T_ACCHG` 只认 `FDNAME` + `NEWVAL`**，不要试图传整个结构体。
- 一次改多个字段就传多行（同一 `BUZEI`、不同 `FDNAME`）。
- 改金额 / 科目这类核心字段**不允许**，只能冲销重记。
- 凭证必须**当期未关账**，且不在审批 / 冻结状态。

## 3. 对账点

| 检查项 | 表 / 字段 |
|---|---|
| 值已落 | `BSEG` 对应 `BUZEI` 的 `FDNAME` 字段等于 `NEWVAL` |
| 审计留痕 | `CDHDR` / `CDPOS`（`OBJECTCLAS = 'BELEG'`）有变更记录 |
| 未产生新凭证 | `BKPF` 凭证号不变；若变了说明走成了冲销重记 |

**不要用 `BAPI_ACC_DOCUMENT_POST` 传相同凭证号"覆盖"**——它只会新建一张。
