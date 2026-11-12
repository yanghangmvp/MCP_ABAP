# BDC 兜底 · `CALL TRANSACTION ... USING`

**用途**：确认无标准接口后的最后手段。
**先决**：先走完 `_通用调用规范.md` §1 的判定顺序 —— 封装接口 → BAPI/标准 FM → `POSTING_INTERFACE_*` → 才是 BDC。
**改造路径**：把 BDC 批导改造成标准函数，见 `_通用调用规范.md` §5 与 `sap-abap-prog-push-run` §7.7 / §8.0.1（双按钮状态机、探针纪律）。

---

## 0. 手上的 BDC 该不该改

| BDC 的形态 | 处置 |
|---|---|
| **批量录入**（`BDCDATA` 内表 + `CALL TRANSACTION ... USING` 循环建数据，如 `FS00` 建科目、`MM01` 建物料） | **优先改成 BAPI / 标准函数** —— BDC 依赖屏幕字段名，标准屏幕一变就静默失败；且无法逐行拿结构化返回消息 |
| **跨程序跳转**（`CALL TRANSACTION 'Zxxxx' AND SKIP FIRST SCREEN`，带 `#EC CI_CALLTA` 豁免） | **保留**。这不是 BDC 批导，是导航 |
| **仅调标准事务取数 / 展示**（`CALL TRANSACTION 'CO03'/'FB03' AND SKIP FIRST SCREEN`） | 保留。改 `BAPI_*_GETDETAIL` 收益有限，除非需要结构化数据 |

判断口诀：**要写数据 → 改；只是跳过去 → 留。**

批量录入改造后的程序骨架（缓存校验数据 → 内存逐行校验 → 组装结构 → 单行调用 + 汇总消息）与「测试导入 / 正式导入」双按钮范式，见 `sap-abap-prog-push-run` §7.7。

---

## 1. 必须接受的三个事实

| 事实 | 后果 |
|---|---|
| 无返回值可判 | 只能扫 `BDCMSGCOLL`；且「有 S 级消息」也可能掩盖部分失败 |
| 必输字段必须先取原值回填 | 否则屏幕默认值被清空，报一堆不相关的必输错误 |
| 屏幕结构随版本 / 补丁变 | SP 升级后功能码、字段名、屏幕顺序都可能变，必须回归 |

## 2. 调用要点

```abap
ls_opt-dismode = 'N'.       " 后台
ls_opt-updmode = 'S'.       " 同步更新
CALL TRANSACTION 'CO02' USING lt_bdcdata
  OPTIONS FROM ls_opt
  MESSAGES INTO lt_messtab.
```

- **`updmode = 'S'` 已同步更新，不要再补 `BAPI_TRANSACTION_COMMIT`**。
- 消息必须用**表工作区字段**：`lt_messtab-msgid / -msgnr / -msgv1..4`。
  **不能写 `sy-msgid` / `sy-msgno` / `sy-msgv*`** —— 在 `LOOP` 里不随行变化，会把第一条消息复制给所有行。
- `BDCMSGCOLL` 的字段名是 **`MSGNR`** 不是 `MSGNO`。
- 判成败扫 `msgtyp CA 'AE'`，**同时保留 `S` 级消息**——很多「成功但不对」藏在里面。

## 3. 录屏注意

- 用 `SHDB` 录，**不要在录制里做无关键作**（滚动、切页签会带入无意义的 `BDC_OKCODE`）。
- `BDC_OKCODE` 用功能码名（`=ENTK`），不要用数字编码。
- 批量前先单条跑通并对账底表再扩量——BDC 中途失败不会自动回滚已处理的单据。

## 4. 对账点

| 检查项 | 表 / 字段 |
|---|---|
| 业务对象已生成 | 对应主表（订单 `AUFK` / 凭证 `BKPF` / 销售单 `VBAK`） |
| 无被跳过行 | `BDCMSGCOLL` 中 `A`/`E` 行数为 0；**行数与输入条数一致** |
| 部分成功可识别 | 记录成功流水号，失败重跑时跳过已完成项 |
