# `BAPI_PRODORD_COMPLETE_TECH` · 生产订单技术完成

**用途**：抬头级技术完成（TECO），支持批量。
**同域**：取消 TECO `prodord-teco-reset-bdc.md` · 用户状态 `bapi-prodord-user-status.md`

---

## 1. 用哪个

**用本 BAPI**，**不要**用 `BAPI_ALM_ORDER_MAINTAIN` + `it_methods` —— 那是跨对象维护用的，要手工拼 `refnumber` / `objecttype` / `objectkey`，且语义不是 TECO。

## 2. 签名（`fupararef` 实测）

```
ORDERS             T   BAPI_ORDER_KEY          " 字段 ORDER_NUMBER，可多张
DETAIL_RETURN      T   BAPI_ORDER_RETURN
RETURN             E   BAPIRET2
SCOPE_COMPL_TECH   I   BAPI_ORDER_FUNC_CNTRL-SCOPE_COMPL_TECH
```

```abap
ls_scope-scope_compl_tech = 'X'.
CALL FUNCTION 'BAPI_PRODORD_COMPLETE_TECH'
  EXPORTING scope_compl_tech = ls_scope
  TABLES    orders           = lt_orders
            detail_return    = lt_detail
            return           = lt_ret.

READ TABLE lt_ret TRANSPORTING NO FIELDS WITH KEY type = 'E'.
IF sy-subrc = 0.
  CALL FUNCTION 'BAPI_TRANSACTION_ROLLBACK'.
ELSE.
  CALL FUNCTION 'BAPI_TRANSACTION_COMMIT' EXPORTING wait = 'X'.
ENDIF.
```

## 3. ★ 没有「技术完成日期」入参

该 BAPI **不接受日期**。要指定 `AUFK-IDAT2`：

- 成功后另补 `UPDATE aufk SET idat2 = ...`；
- 或走 BAdI / 增强。

直改标准表要评估**审计与权限风险**，能接受才做。

## 4. 对账点

| 检查项 | 表 / 字段 |
|---|---|
| 已 TECO | `AUFK-IDAT2` 非空；`JEST` 出现 `I0045` 且 `INACT` 为空 |
| 订单未被锁 | `JEST` 无 `I0048`（锁定） |
| 未误关单 | `JEST` 不应出现 `I0046`（关闭）——TECO ≠ 关闭 |

**批量前先用 1 张单跑通并立即对账**。批量失败不会回滚已处理的单，中途报错要按 `DETAIL_RETURN` 逐单核状态再重跑（幂等：已 TECO 的单再调不报错）。
