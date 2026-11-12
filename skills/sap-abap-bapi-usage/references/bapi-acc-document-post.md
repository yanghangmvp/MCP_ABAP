# `BAPI_ACC_DOCUMENT_POST` · 会计凭证过账

**用途**：过账一张或多张会计凭证。**模拟用 `BAPI_ACC_DOCUMENT_CHECK`**（同参数、不落库）。
**先决**：项目有封装接口（`ZFM_FII*` 一类）时优先用封装接口，它们内部自己 `COMMIT`/`ROLLBACK`，调用方不要再提交或回滚。见 `sap-abap-project-ops` §4。
**同域**：冲销 `bapi-acc-document-rev-post.md` · 改已过账 `fi-document-change.md` · 票据类 `posting-interface-fb01.md`

---

## 1. 骨架

```abap
" 1) 抬头
ls_doc_header-comp_code  = lv_bukrs.
ls_doc_header-doc_type   = 'SA'.
ls_doc_header-pstng_date = lv_budat.     " 是 PSTNG_DATE，不是 POSTING_DATE
ls_doc_header-doc_date   = lv_bldat.
ls_doc_header-username   = sy-uname.

" 2) 行项目：借贷方向由 BSCHL 决定，金额一律传正数
"    SHKZG 从 TBSL 反查，不要手填
" 3) 金额直接传字符串，避免千分位
ls_item-amt_doc_cur = '1000.00'.

CALL FUNCTION 'BAPI_ACC_DOCUMENT_POST'
  EXPORTING documentheader = ls_doc_header
  IMPORTING obj_key        = lv_obj_key
  TABLES    accountgl      = lt_gl
            currencyamount = lt_cur
            return         = lt_ret.

READ TABLE lt_ret TRANSPORTING NO FIELDS WITH KEY type = 'E'.
IF sy-subrc <> 0.
  CALL FUNCTION 'BAPI_TRANSACTION_ROLLBACK'.
ELSE.
  CALL FUNCTION 'BAPI_TRANSACTION_COMMIT' EXPORTING wait = 'X'.
ENDIF.
```

## 2. 硬限制（每一条都曾静默出错）

- **`BAPIACHE09` 没有 `EXCH_RATE` 字段** —— 双币（`CURR_TYPE` = `00` + `10`）时若只给 00 行带汇率，系统按 OB08 重定抬头汇率（填 7 落 8.28）。`CURR_TYPE='10'` 行也必须带 `exch_rate`，明细行与轧差行两处都要。
- **双币凭证每个 `ITEMNO_ACC` 必须给两条 `CURRENCYAMOUNT`，且每种币种小计为 0** —— 缺 `10` 行报 `Inconsistent currency information`；拆分产生的轧差行同样要补。
- **`BSEG-BUZEI` 是 `NUMC(3)`，单张 999 行物理上限**，BAPI 实际只吸纳 990 行 ⇒ 分片取 `989 明细 + 1 轧差`。边界必须覆盖 999 / 1000 / 1997（1997 按 `>999` 判会切出 1000 行而溢出）。
- **`OBJ_KEY` 布局是 `凭证号(10)+公司代码(4)+会计年度(4)`**，年度在 **`+14(4)`**（常被误写 `+10(4)` 取到公司代码）。二次拆张时若只回一个凭证号 ⇒ 张数少报、按行回写指错凭证。
- **`BAPIACGL09-ITEM_TEXT` 只有 50 字符**，静默右截断。拼「前缀+后缀」先把前缀截到 `长度-后缀长度`。
- **票据类行（`UMSKZ = W/X/Y`）走不通本 BAPI** —— `UMSKZ` 在三个 BAPI 结构里都没有字段，会被静默丢弃、科目记错。要么经 `EXTENSION2` 增强落库，要么整张走 `posting-interface-fb01.md`。

## 3. 模拟（`BAPI_ACC_DOCUMENT_CHECK`）

- 与 POST **参数结构兼容**，仅少 `obj_key` 出参。
- 不 `COMMIT` 不 `ROLLBACK`；成功时凭证号留空——**不要拿「凭证号为空」当失败判据**。
- CHECK 与 POST 的**校验深度不完全一致**：部分增强 / 字段状态组检查只在 POST 阶段触发。

## 4. 对账点

| 检查项 | 表 / 字段 |
|---|---|
| 凭证已生成 | `BKPF`：`BUKRS` + `BELNR` + `GJAHR` |
| 行数与金额 | `BSEG`：行数、按 `SHKZG` 汇总借贷、合计为 0 |
| 双币 | `BSEG`：`CURR_TYPE` 出现 `00` 与 `10` 两套，`WRSL`/`HSL` 均非 0 |
| 分配 / 文本 | `BSEG-ZUONR`、`SGTXT` 逐字段比对 |
| 票据类 | `BSEG-UMSKZ` 是否落上（不是空） |

**先跑 CHECK 或封装接口的模拟模式**：同样报错说明问题在科目 / 期间 / 字段状态组，不在你新写的代码。
