# SD 销售订单创建 · `SD_SALESDOCUMENT_CREATE`

**用途**：新建销售订单，含条件（定价）、文本、伙伴。修改见 `sd-salesdocument-change.md`。
**模拟**：`BAPI_SALESORDER_CREATEFROMDAT2` 用 `testrun = 'X'`；`SD_SALESDOCUMENT_CREATE` 直调。
**同域**：增强字段 `sd-extensionin.md` · 计划行数量 `sd-schedule-line-qty.md` · 长文本 `sd-long-text.md` · 参考退货 `sd-reference-doc-return.md`

> 章号沿用原 SD 分册编号，便于与其它册互引。

---

## 1. ★ 必踩坑：BAPI 按「登录语言」查找主数据文本

**已迁到本技能 `_语言与数据格式.md`**（症状 `V2 157 Missing text`、`SET LOCALE LANGUAGE` 无效、唯一入口是请求头 `sap-language`、根治靠补 `TSPAT` 的 EN 文本）。本技能只讲 SD 侧参数与规则。

## 2. BAPI 选型与调用参数

> 通用规则（`x` 结构成对、标识 `CHAR1`、`VALUEPART` 分块、`&&` 清空、返回消息处理、落库对账）见 `_通用调用规范.md`；本节及以下只写 SD 订单专有内容。

| 场景 | BAPI | 测试运行参数 |
|---|---|---|
| `VBELN` 为空 → 新建 | `BAPI_SALESORDER_CREATEFROMDAT2` | `testrun = 'X'` |
| `VBELN` 非空 → 修改 | `BAPI_SALESORDER_CHANGE` | `simulation = 'X'` |

```abap
" 创建
CALL FUNCTION 'BAPI_SALESORDER_CREATEFROMDAT2'
  EXPORTING order_header_in = ls_hd   testrun = is_input-head-testrun
  IMPORTING salesdocument   = lv_vbeln
  TABLES    return = lt_ret  order_items_in = lt_item  order_schedules_in = lt_sched
            order_partners = lt_part  order_conditions_in = lt_cond  order_text = lt_text.

" 修改
CALL FUNCTION 'BAPI_SALESORDER_CHANGE'
  EXPORTING salesdocument = lv_vbeln  order_header_in = ls_hd  order_header_inx = ls_hdx
            simulation    = is_input-head-testrun
  TABLES    return = lt_ret  order_item_in = lt_item  order_item_inx = lt_itemx
            schedule_lines = lt_sched  schedule_linesx = lt_schex
            partners = lt_part  conditions_in = lt_cond  conditions_inx = lt_condx
            order_text = lt_text.
```

- **`TESTRUN` 字段在 DDIC 结构里必须用 `XFELD`**：按 FS 挂 `BAPIFLAG` 会失败（`BAPIFLAG` 是 `STRU` 类型，不能作字段数据元素）。
- **修改模式的抬头更新标识 `BAPISDH1X`**：只对**本次传了值**的字段置 `'X'`，未传字段保持原值；`updateflag = 'U'`。注意创建后不可改的字段（订单类型等）不要下传。
- **判错**：遍历 `lt_ret`，`TYPE = 'E'` 或 `'A'` 即失败（`W` 如「销售凭证不完整: 编辑数据」不算失败）；失败必须 `BAPI_TRANSACTION_ROLLBACK`。
- **提交**：`BAPI_TRANSACTION_COMMIT EXPORTING wait = 'X'.` —— `wait` 必须给，否则后续 `UPDATE` 底表时目标行可能还没落库。

### 2.1 条件（销售价格）

`VKORG 5000 → ZP01`（含税价格）、`5001 → ZP02`（不含税价格）；其他销售组织跳过价格下传。
`BAPICOND` 填 `ITM_NUMBER / COND_TYPE / COND_VALUE / CURRENCY / COND_P_UNT / COND_UNIT`；`BAPICONDX` 对应值字段置 `'X'`。

★★ **`COND_ST_NO` / `COND_COUNT` 只有「条件已存在」时才填，新条件必须留空**（详见 `sd-salesdocument-change.md` §9.1）。
~~`COND_ST_NO='001' / COND_COUNT='01'`~~ 是错的写法，会报「定价类型 xx 不在步骤编号 001 中」。
`LOGIC_SWITCH-COND_HANDL` **不要设 `'X'`**（参照实现不设），否则条件行为与交付口径不一致。

### 2.3 伙伴

`BAPIPARNR` 传 `AG`（售达方）/ `WE`（送达方）/ `RE`（收票方）/ `RG`（付款方）。
**S/4HANA 会重编码**：落 `VBPA` 后显示为 `SP / SH / BP / PY` —— 属标准映射，**不是缺陷**，断言时要按 `KUNNR` 判而不是按 `PARPARTN_ROLE`（`PARVW`）判。

---

## 3. ★ 本系统 S/4HANA，`VBAK` / `VBAP` 字段比 ECC 精简

FS 或旧经验里常见的字段，在本系统**并不存在**：

| 字段 | 归属 | 本系统实况 |
|---|---|---|
| `ZTERM` / `INCO1` / `INCO2_L` / `BZIRK` / `ZLSCH` | 付款条件、国际贸易条款、销售地区、付款方式 | **`VBAK` 无此列**，S/4 已移至 **`VBKD`** |
| `ABGRU`（整单拒绝原因） | `VBAK` | **`VBAK` 无此列**（`ABGRU` 仅 `VBAP` 有） |
| `XLOEK`（行项目删除标识） | `VBAP` | **`VBAP` 无此列**；删除行项目实测为从 `VBAP` **物理移除** |

**判定原则**：**字段存疑时以「激活报错」为准** —— 编译器报 `Unknown column name "ABGRU"` 就是权威；
`DD03L` 预读可作参考（本次 `DD03L` 与激活器结论一致，但 `ADT data preview` 对 `DD03L` 的查询在部分场景不可靠）。
`GetTable`（`node scripts/call-adt-tool.js GetTable '{"table_name":"VBAK"}'`）可拿完整 DDL 复核，注意 `include xxx;` 处不展开。

**对接口的影响**：`ZTERM` / `INCO1` 等**照常传 `BAPISDHD1`** —— BAPI 内部按 S/4 模型写 `VBKD`，调用方无需关心；
只有「直接 `UPDATE` 底表」的代码才需要避开这些列。

---
