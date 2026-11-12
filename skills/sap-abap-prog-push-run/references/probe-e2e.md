# 探针设计 / E2E 纪律 / 调自定义 FM 的探针（§8.0、§8.0.1、§13）

> 主册：[`../SKILL.md`](../SKILL.md)。判据一句话：
> **探针里每一次 CLEAR / 复位 / 状态修补，都要问「真实用户会做这个动作吗」，不会，就是在替程序掩盖缺陷。**

## 8.0 ★ 探针设计：断言要判「可判定」，别把数据面缺失报成 FAIL

**口径类断言先确认分母非空**。凡用「命中订单 / 某子集」当分母的用例，在该子集为空时会退化成 `0 = 0`
或 `0 > 0`，两者都不是对程序的判定 —— 前者是**伪 FAIL**（本次 ZFID003 T10a：命中 `E0002` 的订单其组件全被删除标记），
后者是无意义的 PASS。处理原则二选一：

1. **换口径断言**：把前提性结论（如「明细行与 RESB 行 1:1」）放到**全量集合**上验证 —— 换口径后本次拿到 52 = 52 行，依然是有效证据；
2. **判 SKIP 并写清依据**：给 `chk` 加第三种状态 `'S'` 并**独立计数**，正文里给出取证的数字（如「订单 resb 共 2 行且**全部** `XLOEK='X'`」）。

两种都要在断言文本里带上**实际数字与期望**，否则下一次复盘时无法判断它当时到底验了什么。

**口径变更类改动的回归套路**（本次 ZFID003 明细投料 COEP → MSEG → `RESB-ENMNG/ENWRT`）：
先找一条**能暴露差异的真实数据**当样板（同物料跨两道工序、两行已领量不同），
断言写成「两行各取自己的值」而不是「和等于 X」—— 前者在旧口径下必 FAIL、新口径下 PASS，才有回归能力；
再补一条「比值/单位成本一致」证明两个字段同源（金额不是另一处汇总来的）。

**★ 造探针数据前先查科目/主数据的「隐性必输字段」，否则整批全红还查不出代码问题。**
会计凭证类探针尤其容易踩：**成本相关科目（成本要素 / `KTOKS` 为费用类）每一行都必须带成本对象**
（`KOSTL` / `AUFNR` / `PS_POSID` 之一），漏了 BAPI 会报
`Account xxx requires an account assignment relevant to cost accounting` —— 行数多时表现为「全部行失败」，
极易被误判成新逻辑的缺陷。本次 `ZTEST_ZFIB001_SPLITROW` 1000 行全红就是这个原因（补 `KOSTL='50F01000'` 即通过）。
同理，`RSTGR`（付款原因代码）由字段状态组决定是否必输 —— **科目/字段状态组要挑「必输项最少」的那一个**
（本次测试公司 5000 用 `8000000034`，字段状态组 `Z008`；比 `1001001000` 少一个 `RSTGR`）。

**★ 造数前先看底表主键 —— `INSERT` 撞键只回 `sy-subrc<>0`，不报错不转储。**
2026-09-24 `ZBPM_ISP011` 探针：`ZTFI0002` 主键 = `MANDT+BUKRS+ZFKDT+ZFKDH`，**不含业务键 `ZBPMLCH`**；
两个测试流程号复用同一 `ZFKDT+ZFKDH` ⇒ 第二个流程整行没进去 ⇒ 后续用例以「流程号不存在」的**假象**报 FAIL，
差点被当成接口缺陷。⇒ **造数循环里逐条判 `sy-subrc`，并在正式用例前加一条「造数行数自检」断言**
（期望几行就断几行），否则数据面缺失会一路伪装成逻辑缺陷。

**跑多张拆分的探针时，轧差中转科目必须在目标集团存在且过账得了。**
`ZFM_FII001_SPLIT` 的 `i_trans_hkont` 缺省是 `1999999999` —— 实测该科目**只在 client 300 / 科目表 `5000` 有**，
client 100 / 科目表 `INT` 查无（`SKA1` + `SKB1` 都空）。探针直接调函数时可以传 `i_trans_hkont` 绕开；
但测**批导程序**（它不传该入参）时就必须目标集团真有这个科目，否则每张都失败、`ET_DOC` 被清空。

## 8.0.1 ★★ E2E 探针里不得出现任何「为了让流程跑通」的手工复位

**判据：探针里每一次 CLEAR / 重置 / 状态修补，都要问一句「真实用户会做这个动作吗？」不会，那这段代码就在替你掩盖缺陷。**

`ZFIB003` 血泪案例：第一版探针在「① 测试导入」和「② 正式导入」之间插了「`CLEAR icon/msg` + 重跑已存在检查」，理由是"模拟用户看完测试结果后点正式导入"——听起来合理，实际是把真实用户**不会**做的动作塞进了测试。结果正式导入每次都命中全部行，`exist` 状态机缺陷被测试脚本自己掩盖，直到用户在 GUI 上手工点了一遍才暴露。

正确的三段式（一份真实代码路径下互证「测试导入不落库」与「正式导入落库」）：

```abap
" ① 测试导入
lv_test = abap_true.
PERFORM frm_call_bapi USING lv_test.
PERFORM frm_e2e_readback USING '测试导入后（应无新增）'.       "期望命中 0 行

" ② 正式导入：看完测试结果后【直接】点，不复位、不重跑检查
"   ← 这一段就是状态机缺陷的回归点，中间插任何 CLEAR 都会把缺陷掩盖掉
CLEAR lv_test.
PERFORM frm_call_bapi USING lv_test.
PERFORM frm_e2e_readback USING '正式导入后（应落库）'.          "期望命中 N 行

" ③ 幂等复跑：再点一次正式导入，已落库行应自动转为「已存在」跳过
PERFORM frm_call_bapi USING lv_test.
PERFORM frm_e2e_readback USING '幂等复跑后（不应新增）'.        "期望命中仍为 N 行
```

配套要点：

- 回查必须覆盖**所有落点表**，只看主表命中不算通过（科目例：`SKA1` 主数据 / `SKAT` 描述验语言 / `SKB1` 公司代码层 / `CSKB` 成本要素，其中 `SKAT-SPRAS` 是验证「维护语言」修正的唯一证据）。
- 每段补一行 `[计数]` 输出（`已存在= / 成功= / 错误= / 校验通过=`），因为 `MESSAGE ... TYPE 'S'` 在 ADT 无头运行中**不落输出流**，汇总文本无法直接验证，`[计数]` + 逐行图标是等价证据。
- 每轮跑完会**真的落库**测试数据，第二轮起要换一批主键（科目 9001 → 9011 → 9021），否则全命中「已存在」拿不到正常路径证据；测试报告里要列出残留测试对象。

## 13. 写【调用自定义接口 FM 的探针】时的两件事（2026-09-22 ZSAP_ISP001 实测）

### 13.1 ★ `CALL FUNCTION` 的段名与形参方向相反 —— 写错会 dump `CALL_FUNCTION_PARM_UNKNOWN`

**被调方的 EXPORTING 形参，必须写在调用方的 `IMPORTING` 段；被调方 IMPORTING 形参写在调用方 `EXPORTING` 段。**

```abap
" 被调方签名：EXPORTING VALUE(ES_RETURN) TYPE ZCIS_RETURN / TABLES IT_ITEM
" ❌ 报 CALL_FUNCTION_PARM_UNKNOWN：Function parameter "ES_RETURN" is unknown.
CALL FUNCTION 'ZSAP_ISP001' EXPORTING es_return = ls_ret TABLES it_item = lt_item.
" ✅
CALL FUNCTION 'ZSAP_ISP001' IMPORTING es_return = ls_ret TABLES it_item = lt_item.
```

写错时报的是**运行时错误**（HTTP 500 + `CALL_FUNCTION_PARM_UNKNOWN` / `CX_SY_DYN_CALL_PARAM_NOT_FOUND`），
短文本指向被调方的形参名，**极易误判成「FM 接口没生成」**。本轮为此在
`GetFunctionModule` / `ActivateFunctionModule` / `FUPARAREF` 上查了一圈（都是好的）。
**判据**：拿一个肯定能用的接口 FM（如 `ZBPM_ISP002`）用同样写法调一次 —— 若同样报错，就是你调用方写错了。

### 13.2 `UpdateTable` 改不了结构，要用 `UpdateStructure`

结构（`INTTAB`，E071 里也是 `R3TR TABL`）用 `UpdateTable` 会回
`Resource controller does not support method PUT`（tables 资源不收结构）。
改结构字段用 `UpdateStructure {structure_name, ddl_code, transport_request, activate}`，步骤
`lock→check_new_code→update→unlock→check_inactive→activate`，返回 `activated:true` 才算成功。
范式：`GetStructure` 取 DDL → 锚点替换 → 回推 → `dd03l` 复核（写法见 `sap-ddic-object-ops` 范式三）。

**结构被 FM 引用时**：AF 激活 FM 会连带生效（`push_fm_source.js` 走完即可）；
`ActivateFunctionGroup` / `ActivateFunctionModule` 在对象已 active 时返回
`activated:false / generated:true`，**属正常**（"nothing to activate"），不代表失败。

### 13.3 探针回查底表：部分列 SELECT 必须自建窄结构（再犯一次）

`SELECT ktopl, saknr, xspea, ... FROM ska1 INTO TABLE @lt_ska1` 里 `lt_ska1` 若是
`STANDARD TABLE OF ska1`（整行），激活报
`The data type of the component "ERDAT" of "LT_SKA1" is not compatible with the data type of "MCOD1"`。
一律先 `TYPES: BEGIN OF ty_ska1, ... END OF ty_ska1.`（列序 = SELECT 列序）再 `INTO TABLE @lt_ty_ska1`。
