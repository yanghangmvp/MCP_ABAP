# 取消 TECO · 无标准 BAPI，只能 BDC `CO02`

**结论**：**没有标准 BAPI 能取消技术完成。**
**同域**：技术完成 `bapi-prodord-complete-tech.md` · 用户状态 `bapi-prodord-user-status.md`

---

## 1. 验证过程（别重复踩）

`SELECT funcname FROM enlfdir WHERE funcname LIKE 'BAPI_PRODORD%'` —— 34 个函数中包含：

```
BAPI_PRODORD_COMPLETE_TECH     ← 只能置，不能取消
BAPI_PRODORD_CLOSE
BAPI_PRODORD_SETUSERSTATUS
BAPI_PRODORD_REVOKEUSERSTATUS
BAPI_PRODORD_SET_DELETION_FLAG
```

**没有 TECO Reset。** `IBAPI_ALM_ORDER_TECO_RESET` 是内部函数，不当正式方案。

## 2. BDC `CO02` 做法

- 屏幕程序 `SAPLCOKO1`，功能码 **`=ENTK`**。
- **必须先 `SELECT` 原值再回填**——否则屏幕上预填的必输字段被清空，报一堆不相关的必输错误。
- 建 `BDCDATA` 时按屏幕字段顺序：订单号 → `=ENTK` → 回填字段。

```abap
" 关键：先取原值
SELECT SINGLE aufnr, werks, dispo FROM aufk INTO @DATA(ls_o)
  WHERE aufnr = @lv_aufnr.

" BDCDATA 里把 ls_o 的字段逐项回填，再打 =ENTK
```

## 3. 对账点

| 检查项 | 表 / 字段 |
|---|---|
| TECO 已取消 | `AUFK-IDAT2` 为空；`JEST` 中 `I0045` 的 `INACT = 'X'`（不是删除行，是置失效） |
| 状态未连带异常 | `JEST` 其它状态行 `INACT` 未被动改 |
| 未产生新凭证 | 取消 TECO 不应产生财务凭证；若产生说明功能码错了 |

**判断 TECO 是否生效只看 `JEST` 的 `INACT`，不看行是否存在**——状态行永远在，靠 `INACT` 标记失效。
