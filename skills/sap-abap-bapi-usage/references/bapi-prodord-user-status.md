# 生产订单用户状态 · `BAPI_PRODORD_SETUSERSTATUS`

**用途**：设置 / 撤销用户状态（如财务关闭标识）。含状态批量判定手法。
**同域**：技术完成 `bapi-prodord-complete-tech.md` · 取消 TECO `prodord-teco-reset-bdc.md`

---

## 1. 两个接口

| 操作 | 接口 |
|---|---|
| 置用户状态 | `BAPI_PRODORD_SETUSERSTATUS` |
| 撤销用户状态 | `BAPI_PRODORD_REVOKEUSERSTATUS` |
| 备选 | `STATUS_CHANGE_EXTERN`（`user_status` 传状态码、`set_chgkz = 'X'`） |

## 2. ★ 状态码是项目自定义的

`E0002` 这类码不是全局常量，是**每个项目在 `TJ30` / `TJ30T` 里自建的**。照抄别项目的码会：

- 报「状态不存在」，或更糟；
- 恰好存在但语义不同，把订单置成错误状态。

**先查**：

```abap
SELECT * FROM tj30t WHERE stsma = @lv_stsma AND spras = @sy-langu.
" stsma 从 TJ30 按对象类型 PRO 取
```

## 3. 状态批量判定（别逐单查）

```abap
SELECT j~objnr, j~stat, j~inact
  FROM jest AS j
  INTO TABLE @DATA(lt_stat)
  WHERE j~inact = @space.

SELECT t~stat, t~txt04
  FROM tj02t AS t
  INTO TABLE @DATA(lt_txt)
  WHERE t~spras = @sy-langu.

SORT lt_stat BY objnr.
" 按订单 objnr 切片遍历，别在循环里 SELECT SINGLE
```

常用系统状态码：`I0045` = TECO、`I0046` = 关闭、`I0002` = 已释放、`I0048` = 锁定。

## 4. 对账点

| 检查项 | 表 / 字段 |
|---|---|
| 用户状态已置 | `JEST` 有该状态码且 `INACT` 为空 |
| 系统状态未被连带 | `I0045` / `I0046` 的 `INACT` 未变 |
| 状态文本 | `TJ30T` 对得上（确认置的是对的那个码） |
