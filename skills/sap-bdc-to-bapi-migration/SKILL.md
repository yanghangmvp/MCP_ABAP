---
name: sap-bdc-to-bapi-migration
description: 把 ABAP 报表里的 BDC（CALL TRANSACTION / bdc_dynpro / bdc_field / BDCDATA 录屏）批量录入改造成标准函数或 BAPI 调用的可复用范式——含「五步法」结构（归集校验键 → FOR ALL ENTRIES 一次性取校验数据 → 内存逐行校验 → 组装标准函数结构 → 单行调用并汇总消息）、「正式导入 + 测试导入」双按钮（testmode 只校验不落库）的 CUA 登记方式、★「待处理行必须用独立内部标记判定，绝不能用 ICON/MSG 这类输出列当状态机」的缺陷范式（否则先测试导入再正式导入会空跑）、★「E2E 探针里不得出现任何手工复位，否则测试脚本会替程序掩盖缺陷」的验证纪律，以及标准函数的隐性必输约束排查手法（文档不写、只在运行时以消息抛出）。当需要把 BDC 改成 BAPI/函数模块、要把一份 Excel 批导报表重写为标准函数调用、要给写操作加一个"先试跑"按钮、或遇到"校验通过但导入没反应"时加载本技能。
agent_created: true
---

# BDC → 标准函数 / BAPI 改造范式

适用项目：示例客户 SAP ERP（`~/ABAP-AI`，系统 DEV，客户端 100 为正式对象、300 有示例测试数据）。

> 本技能只管「**从 BDC 改造成标准函数**」这条路径。改造目标函数本身的调用规范、参数约束与静默失效清单见 `sap-abap-bapi-usage`。

## 0. 先判断该不该改

| BDC 的形态 | 处置 |
|---|---|
| **批量录入**（`BDCDATA` 内表 + `CALL TRANSACTION ... USING` 循环建数据，如 `FS00` 建科目、`MM01` 建物料） | **优先改成 BAPI / 标准函数**——BDC 依赖屏幕字段名，标准屏幕一变就静默失败；且无法逐行拿结构化返回消息 |
| **跨程序跳转**（`CALL TRANSACTION 'Zxxxx' AND SKIP FIRST SCREEN`，带 `#EC CI_CALLTA` 豁免） | **保留**。这不是 BDC 批导，是导航 |
| **仅调标准事务取数/展示**（`CALL TRANSACTION 'CO03'/'FB03' AND SKIP FIRST SCREEN`） | 保留。改成 `BAPI_*_GETDETAIL` 收益有限，除非需要结构化数据 |

本项目实测：`ZFIB003`（FS00 建科目）已改造；`ZFIR005`（CO03 月结 TECO）、`ZFID001B/C/D`（FB08 冲销、FB03 查凭证）仍是 BDC，属于「跳转/展示」类，**按需再议**。

## 1. 五步法（改造骨架）

参照本项目既有接口 `ZSAP_ISP001`（批量凭证导入）的写法，与项目约定「接口函数瘦函数体 + FORM」一致：

1. **归集校验键**：把上传的原始行去重后抽成要校验的键集合（公司代码、科目组、字段状态组、科目号…）。
2. **一次性取校验数据**：对每个键集合各发**一条** `SELECT ... FOR ALL ENTRIES IN @lt_x`，结果缓存在 `gt_*`。
   - 注意：**本系统编译器不支持内表 IN 列表**（`WHERE f IN @lt_itab` 报 *row structure of the table is incorrect*）→ 必须用 `FOR ALL ENTRIES IN @lt_x WHERE f = @lt_x-table_line`。
   - 注意：`FOR ALL ENTRIES` 前必须判空（`IF lt_x IS NOT INITIAL`），否则退化成全表。
3. **内存逐行校验**：`FORM frm_glaccount_single` 这类「单行处理 FORM」接收缓存的表当入参（`USING it_cache TYPE tt_xxx`），只做内存判断，不再发 SQL。
4. **组装目标结构**：把行数据映射到标准函数的 `COA` / `CCODE` / `CAREA` / `NAME` 等嵌套结构。**描述类字段的语言要取维护语言，不是 `sy-langu`**。
5. **单行调用 + 汇总消息**：循环调标准函数，把 `RETURN`/`MESSAGE` 表按行回写到 ALV 的 `icon` + `msg` 列，最后统一汇总。

**调用顺序不可颠倒**（否则 `update failure` / 锁残留）：
`validate → CALL FUNCTION → IF 无错 THEN COMMIT WORK AND WAIT → GL_ACCT_UTIL_DEQUEUE_ALL`（各个标准函数有各自的 dequeue 函数，没有就 `DEQUEUE` 对应锁对象）。

## 2. 双按钮：正式导入 + 测试导入

用户（用户）在本项目明确要求：**正式导入前先跑一遍测试导入看报错**。范式：

```abap
FORM user_command USING pr_ucomm LIKE sy-ucomm ... .
  DATA lv_testmode TYPE xfeld.

  CASE pr_ucomm.
    WHEN 'ZLOAD'.                       "正式导入（项目约定：按钮分支写字面量，不用 CONSTANTS）
      CLEAR lv_testmode.
      PERFORM frm_call_bapi USING lv_testmode.
    WHEN 'ZTEST'.                       "测试导入：只校验不落库
      lv_testmode = abap_true.
      PERFORM frm_call_bapi USING lv_testmode.
  ENDCASE.
ENDFORM.
```

要点：

- **标准函数只校验不落库的开关通常是 `testmode = 'X'`**（`GL_ACCT_MASTER_SAVE` 就是），部分 BAPI 用 `TESTRUN = 'X'`。**先去函数文档/Signature 里确认参数名，不要猜。**
- 测试模式**绝不能提交**：`IF iv_testmode = abap_true. ... RETURN/跳过 COMMIT. ENDIF.`
- 结果列用三种图标区分：通过 `@5D@`（`ICON_SIMULATE` 语义）、成功 `@5B@`、失败 `@5C@`。
- 已存在数据的处理要在**两个模式里一致**——本项目定为「报『存在相同公司代码科目数据』、不创建」，且在**解析阶段**（`frm_check_account_exist`）就标红，避免用户误以为正式导入会覆盖。
- **CUA 登记**：走 `scripts/work/cua/config/<PROG>.json` + `node scripts/work/gen_cua.js`（见技能 `sap-cua-gui-status-functions`）。本例 `ZLOAD`（`@5Y@` `ICON_RELEASE`，pfno 13）、`ZTEST`（`@8Z@` `ICON_SIMULATE`，pfno 14）。

**删 BDC 要删干净**（漏一个就激活报错/留死码）：

```
gt_bdcdata / gt_bdcmsgcoll 内表
FORM bdc_dynpro / FORM bdc_field（注意文件末尾还有一份定义）
lv_dest / lv_brsize
BDC 专用的 ctu_params / mode / update
```

## 2.1 ★ 待处理行必须用「独立内部标记」判定，不能用 ICON / MSG

**这是把 BDC 批导改成"双按钮"时最容易踩的逻辑坑，且在单次测试里测不出来。**

原 `ZFIB003` 写法：

```abap
LOOP AT gt_tab ASSIGNING <fs_tab> WHERE icon IS INITIAL.   " ← 用输出列当状态机
  PERFORM frm_glaccount_single ...
ENDLOOP.
```

单次运行没问题（`icon` 空 = 待处理）。但一旦有「测试导入」按钮：

1. 点 `ZTEST` → 每行的 `icon` 都被写上（`@5D@` 通过 / `@5C@` 失败）；
2. 点 `ZLOAD` → `WHERE icon IS INITIAL` **命中 0 行** → 一条都导不进去，只回一句「没有需要导入的数据行」。

用户视角就是「校验通过了、图标也有了、导入是空的」。

**正确做法**：给行结构加一个不进字段目录的内部标记（`ty_alv-` 末尾追加 `exist(1)`，字段目录是显式列表所以不会显示出来），单独表达"该行不可导入"这一业务事实：

```abap
" ty_alv 末尾（保持 icon/msg 的位置不变，避免影响 ASSIGN COMPONENT 的列序号）
        icon(5),
        msg(255),
        exist(1),      " 科目已存在（不可导入）；不列入字段目录
      END OF ty_alv.

" frm_check_account_exist：每次调用全量重判，置/清标记
LOOP AT gt_tab ASSIGNING <fs_tab>.
  CLEAR <fs_tab>-exist.                 " ← 必须先清，保证幂等
  IF <fs_tab>-bukrs IS INITIAL OR <fs_tab>-saknr IS INITIAL.
    CONTINUE.
  ENDIF.
  ... 命中目标表则：
      <fs_tab>-exist = 'X'.
      <fs_tab>-icon  = c_icon_err.
      <fs_tab>-msg   = TEXT-m01.
ENDLOOP.

" 动作 FORM 入口：重算链路 → 重判 → 复位非「不可导入」行的结果列
PERFORM frm_get_coa_from_bukrs.     "用户可能改过公司代码
PERFORM frm_check_account_exist.    "用户可能改过科目号
LOOP AT gt_tab ASSIGNING <fs_tab> WHERE exist IS INITIAL.
  CLEAR: <fs_tab>-icon, <fs_tab>-msg.
ENDLOOP.

" 三处循环条件一律改成 exist
LOOP AT gt_tab ASSIGNING <fs_tab> WHERE exist IS INITIAL.
```

这一改同时带来三个好处：

| 收益 | 说明 |
|---|---|
| 重复点击幂等 | 测试导入 → 正式导入 → 再点一次正式导入，三段都能正确执行，第三次把已落库的行自动判为「已存在」跳过，不重复创建 |
| ALV 改数后能重判 | 入口重算链路 + 重判，用户改了行数据不会被旧标记误伤 |
| 汇总口径清晰 | 可以分别统计「成功 / 失败 / 跳过已存在」，消息里写清 `跳过已存在N条` |

**汇总消息的边界也要改**：原来 `IF lv_ok = 0 AND lv_er = 0` 就报「没有需要导入的数据行」，加入 `exist` 后要把 `lv_skip` 一起纳入判断，否则"全部行都已存在"时会丢掉跳过条数这条信息。

> **通用教训**：`ICON` / `MSG` / 任何 ALV 显示列都是**输出**，不是状态。跨按钮需要保持的状态必须有独立的内部字段。同理，测试脚本里如果为了让流程跑通而手工复位这些输出列，就等于把待验证的缺陷掩盖掉了——见 §4。

## 3. 标准函数的隐性必输约束（最重要的排查手法）

**标准函数的必输校验往往不写在文档里，只在运行时以消息抛出。** 排查顺序：

1. 先跑一次「测试导入」，把报错原样记下来；
2. 按消息号去 `T100` 反查「哪个字段」，不要靠猜；
3. 去**有数据的目标系统**里查同类对象的现有记录，看这个字段**惯例**填什么；
4. 修完重跑，直到全绿；
5. 把约束**写进源码注释 + 固化成常量**，别留魔法值。

### 已踩过的三条（`GL_ACCT_MASTER_SAVE` 建总账科目）

| 约束 | 报错 | 修法 |
|---|---|---|
| 描述必须落在**维护语言**（`T001-SPRAS`）下 | `FH 743 Description missing in maintenance language` | 取 `T001-SPRAS` 填入 `glaccount_name-KEYY-SPRAS`；**不要用 `sy-langu`**（登录 EN 时会失败，且 `SKA1` 已建、`SKAT` 失败，科目建不全）；空则退回 `sy-langu` |
| 损益类科目（`GLACCOUNT_TYPE <> 'X'`）必填 `GVTYP` | `Make an entry in field "P&L statmt acct type"` | 参照科目表现有惯例统一填 `'X'` |
| 成本要素（`CAREA`）必填有效期 | `Required field VALID_FROM is empty` | 参照 `CSKB` 现有惯例填 `DATAB = 19000101` / `DATBI = 99991231` |

### 顺带修掉的既有错误

原 `ZFIB003` 写 `WHERE ktopl = gt_tab-bukrs` —— **把公司代码当科目表**。只在「公司代码 = 科目表」时侥幸成立。正确链路：

```
T001.BUKRS → KTOPL + SPRAS（维护语言）
TKA01.KTOPL → KOKRS（控制范围，成本要素维护需要）
```

**改造此类程序时，一定要把原来的「取数键」逐个审一遍**，这类"碰巧对"的写法在 BDC 时代不报错，改标准函数后立刻暴露。

## 4. E2E 探针：把「测试导入 → 正式导入」串在一个程序里

因为 `adt.js run` **跑不出 ALV**（`NO_FIELDCATALOG_AVAILABLE`），用 `scripts/work/gen_e2e_harness.js` 把生产源码整份复制成 `$TMP` 程序，只做两处外科手术：

```
replace: ["    PERFORM frm_upload_file_xls.", "    PERFORM frm_e2e_load."]   # 内表造数替代 GUI_UPLOAD
hookLine: "    PERFORM frm_alv."                                            # 整行换成 frm_e2e_dump
```

`frm_e2e_dump` 的三段式（**这是关键，能在一份真实代码路径下互证「测试导入不落库」与「正式导入落库」**）。

⚠️ **铁律：探针里绝不能出现任何"为了让流程跑通"的手工复位。** 只做按钮会做的事。

```abap
FORM frm_e2e_dump.
  DATA lv_test TYPE xfeld.

  PERFORM frm_e2e_write USING '上传解析 + 已存在检查（frm_deal_data 之后）'.

  "① 测试导入
  lv_test = abap_true.
  PERFORM frm_call_bapi USING lv_test.
  PERFORM frm_e2e_write USING '① 测试导入（testmode）结果'.
  PERFORM frm_e2e_readback USING '测试导入后（应无新增）'.       "期望命中 0 行

  "② 正式导入：看完测试结果后【直接】点正式导入，不复位、不重跑检查
  "   ← 这一段是 §2.1 那个逻辑缺陷的回归点，中间插任何 CLEAR 都会把缺陷掩盖掉
  CLEAR lv_test.
  PERFORM frm_call_bapi USING lv_test.
  PERFORM frm_e2e_write USING '② 正式导入结果'.
  PERFORM frm_e2e_readback USING '正式导入后（应落库）'.          "期望命中 N 行

  "③ 幂等复跑：再点一次正式导入，已落库的行应自动转为「已存在」跳过，不重复创建
  PERFORM frm_call_bapi USING lv_test.
  PERFORM frm_e2e_write USING '③ 再点一次正式导入（幂等复跑）结果'.
  PERFORM frm_e2e_readback USING '幂等复跑后（不应新增）'.        "期望命中仍为 N 行
ENDFORM.
```

**血泪教训**：`ZFIB003` 第一版探针在 ① 和 ② 之间插了「`CLEAR icon/msg` + 重跑已存在检查」，理由是"模拟用户看完测试结果后点正式导入"——听起来很合理，实际是把真实用户**不会**做的动作塞进了测试。结果正式导入每次都命中全部行，逻辑缺陷被测试脚本自己掩盖，直到用户在 GUI 上手工点了一遍才暴露。

> 判据：**测试脚本里出现的每一次 CLEAR / 重置 / 状态修补，都要问一句"真实用户会做这个动作吗？"** 如果不会，那这段代码就在替你掩盖缺陷。

再补一个逐段 `[计数]` 输出，把行状态分布写清楚，便于逐段核对：

```abap
WRITE: / '  [计数] 已存在(exist)=', lv_ex, ' 成功(@5B@)=', lv_ok,
         ' 错误(@5C@)=', lv_er, ' 校验通过(@5D@)=', lv_ot.
```

（注意 `MESSAGE ... TYPE 'S'` 在 ADT 无头运行中**不落输出流**，所以汇总消息文本无法直接验证，用 `[计数]` + 逐行图标/消息作为等价证据。）

配套 `frm_e2e_readback` 用 `FOR ALL ENTRIES` 回查目标系统的**所有落点表**（科目例：`SKA1`（主数据）/ `SKAT`（描述，验语言）/ `SKB1`（公司代码层）/ `CSKB`（成本要素））。**只看主表命中不算通过**——`SKAT` 的 `SPRAS` 是验证「维护语言」修正的唯一证据。

用例矩阵至少覆盖：

| 类别 | 用例 |
|---|---|
| 正常 | 资产负债类；损益类 + 成本要素；只给短文本（验长文本回落）；科目号不足位数（验前导零补位） |
| 异常 | 已存在；编号区间不符；公司代码不存在；科目组不存在；字段状态组不存在；必输字段为空 |

**坑**：`adt.js run` **不认 `SAP_ENV_FILE` 里的 `SAP_CLIENT`**（永远取 100）→ 切集团必须 `SAP_CLIENT_OVERRIDE=300`；但 `gen_e2e_harness.js --push` 认 `SAP_ENV_FILE`。判断实际落到哪个集团看输出 `[adt] client = N`。$TMP 程序是**集团相关**的，测试必须建在目标集团。

**坑**：每轮跑完会**真的落库**测试数据。第二轮起要换一批科目号（9001 → 9011 → 9021 → 9041），否则第二轮全部命中「已存在」拿不到正常路径证据。**在测试报告里列出所有残留测试对象**，方便清理。

## 5. 交付清单（五步，别漏）

1. **备份原源码**到 `backup/<PROG>_<日期>_before_<改动>.abap`（从 SAP 原样拉，不是抄本地可能已漂移的副本）；
2. 改本地生产源码到 `FICO/<PROG>_<中文描述>.abap`；
3. 推源码：`SAP_ENV_FILE=$PWD/env/dev.env CORR_NR=<父请求号> PKG=ZFICO SRC_FILE=<abs> node scripts/work/push_prog_source.js`（**不带 `SAP_CLIENT_OVERRIDE`**，请求建在 100）；
4. 推文本元素（`scripts/work/textelements/<PROG>.json`，新增的 `TEXT-mXX` 必须在这里加）→ **PROG/PX 是独立激活对象，推完必须单独激活**；
5. `node scripts/work/gen_cua.js` 登记 CUA 功能码。

验证：`final version => active` + `GetInactiveObjects` 返回 0 + **把 SAP 激活版拉回来和本地逐字 diff**。

## 6. 测试报告（放 `测试报告/`）

复用 `测试报告/ZFID003_在制品结转平台测试报告_20260920.md` 的章节结构：交付与请求挂载核验 / 测试方法与限制 / 测试数据与用例 / 测试结果（汇总 + 逐行 + 落库回查）/ 本轮修复记录（缺陷编号 D-01…/ 改造项 S-01…）/ 遗留项 / 结论。**遗留项必须写清测试数据残留清单和「需人工目视」的部分**（ALV 渲染、按钮可用性、真实 Excel 上传）。
