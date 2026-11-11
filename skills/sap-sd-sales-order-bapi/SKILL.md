---
name: sap-sd-sales-order-bapi
description: 用 SD 标准 BAPI（BAPI_SALESORDER_CREATEFROMDAT2 创建 / BAPI_SALESORDER_CHANGE 修改）或更低层的 SD 标准函数（SD_SALESDOCUMENT_CREATE / SD_SALESDOCUMENT_CHANGE）在 ABAP 接口里实现销售订单「创建 / 修改 / 行项目增删 / 字段与长文本清空」的完整范式。含 ★「SD BAPI 按登录语言（会话语言）查找产品组文本，本系统 TSPAT 只有中文 ⇒ 英文会话下必报 V2 157 Missing text for division xx language EN，且 SET LOCALE LANGUAGE / sy-langu 赋值都无效」这条必踩坑与验证-绕开手法（`SAP_LANGUAGE_OVERRIDE=zh`）；★ 三个「报错文本与真因完全不相干」的坑：新定价条件硬编码 COND_ST_NO='001' 会报「定价类型 XX 不在步骤编号 001 中」（正解：只有条件已存在才回填 PRCD_ELEMENTS 的 STUNR/ZAEHK，新条件留空由定价过程自动定位，且不要设 LOGIC_SWITCH-COND_HANDL='X'）、删除行只填 ITEM_INX 而 ITEM_IN 留空会因函数入口 `sort item_in / item_inx by itm_number` 而两表错位、报出毫不相干的「没有可用的项目类别 (表 T184 …) / ITEM_IN 000000中出现错误」（正解：成对表行数一致、ITM_NUMBER 逐行相同）、长文本删除的开关是 FUNCTION='003' 而非 '005'（'005' 只走 CREATE_TEXT 把文本重写成一条空行 ⇒ 返回 S 但 STXH 头与 TDTXTLINES 都还在，且 TDLUSER/TDLTIME 已刷新故极易误判为清空成功；正解：'003' 走 DELETE_TEXT，且删前必须先查 STXH，因为 DELETE_TEXT 对不存在的文本会 MESSAGE E600 RAISING NOT_FOUND 污染 BAPIRET2 返回表）；★「清空标识 &&」范式：字符字段用 DESCRIBE FIELD <struc> TYPE t COMPONENTS n + ASSIGN COMPONENT 动态遍历、只清类型 C/g 的字段（注意 TYPE 必须写在 COMPONENTS 之前，否则激活报 "TYPE ..." is missing），长文本传 && 走功能码 003 删除，语义上「空串 = 不处理、&& = 清空」；★「本系统是 S/4HANA，VBAK 无 ZTERM/INCO1/INCO2_L/BZIRK/ZLSCH（已移至 VBKD）、无 ABGRU，VBAP 无 XLOEK」的字段核对结论与「字段存疑以激活报错为准」的判定原则；本系统未部署 BAPI_TE_VBAK/BAPI_TE_VBAP 但**增强字段一样走标准扩展接口 `EXTENSIONIN`**（`BAPE_VBAK/VBAKX/VBAP/VBAPX` 四条承载链、`BAPIPAREX_T`）——含三条硬约束：`BAPE_*` 首字段是键位 `VBELN`(+`POSNR`) 修改模式必须下发（否则 `move-corresponding` 清空 `E_VBAKKOM-VBELN` → `V1 045`/`V4 219`）；`VALUEPART1` 仅 240 字符、`1~4` 合计 960，值结构必须按 240 分块填满（`BAPE_VBAP`=271 只填 part1 会静默丢尾部字段）；`*KOZX` 标识字段数据元素必须是 `CHAR1` 而非 `BAPIUPDATE`（`GET_CHANGEABLE_FIELDS` 只认 `ROLLNAME='CHAR1'/'CHAR01'`，否则 Z 字段整批被排除、返回 S 值不变零报错 —— 创建路径不走这份清单，故"创建能写、修改写不进"）；序列化只用 `cl_abap_container_utilities=>fill_container_c`（与标准函数内 `READ_CONTAINER_C` 互逆），别手写 `ASSIGN ... CASTING TYPE c LENGTH <变量>`（本版语法不支持；去掉 LENGTH 则字段符号长度不跟随 → DUMP `Invalid subfield access`）；CHANGE 新增行项目的数量取自计划行（不是行项目入参的订单数量）漏传会静默丢数量；★ 数量有两条落库通道，取决于**项目类别在 `TVEPZ`（项目类别→计划行类别确定表）中有无配置**（★ 不是 `TVAP-LFREL`——本系统 `Z001` 与 `Z014` 的 `LFREL` 都为空、无法区分，也不能按 `TVAK-VBTYP` 泛化，`Z002`/`ZQT` 实测都有计划行）：有配置的类型（`Z001`）走计划行反写 `VBAP-KWMENG`，无配置的借项/贷项凭单请求（`Z014`/`Z015`）**不生成计划行**、下发的 `BAPISCHDL` 被静默丢弃，数量只能经 `BAPISDITM-TARGET_QTY` 落 **`VBAP-ZMENG`**（`BAPISDITM` 里没有任何字段的 `REFFIELD = KWMENG`，BAPI 无法直写 `KWMENG`），漏下即数量与派生金额 `NETWR` 一起为 0；对交货相关类型标准函数忽略 `TARGET_QTY`，故两条通道都下发安全、不会重复计数；「去掉删除标识、改全量比对自动删除 VBAP 多余行」的简化套路与配套断言；「计划行数量校验」这条 ZSD 业务规则（已存在行计划行合计必须等于订单数量、新增行不得大于）及其**必做的项目类别豁免**（★ 对不产生计划行的 `Z014`/`Z015` 会恒报 `ZSD01 s005`，须按 `TVEPZ` 判据整行跳过，否则该类订单根本无法通过接口维护）与两个照抄坑——参照实现 `WHERE zmeng IS INITIAL` 在无 `ZMENG` 字段的结构上会退化为全量校验、`MESSAGE s0xx(zsd01) INTO` 不设 `msgty` 且该消息类只有中文文本；伙伴角色 AG/WE/RE/RG 在 S/4 落库显示为 SP/SH/BP/PY；条件类型按销售组织映射；E2E 探针用底表增强字段做唯一标记来断言落库；★ 增强字段必须做**落库读回逐字段对账**（只断言"接口返回 S"会漏掉静默失败）；★ **参考单据是三件套**——`BAPISDITM` 的 `REF_DOC`(编号) + `REF_DOC_IT`(行号) + **`REF_DOC_CA`(参考凭证类别)**，漏传类别报 `V2 068`「凭证 &1 不含凭证类别 &2 但含 &3」（普通订单不参考原单故从不复现，**退货订单天然参考原单必然踩到**；参考销售订单类别为 `'C'`，行项目类别应反查被参考单据的 `VBAK-VBTYP`、不要无脑取抬头 `VGTYP`；若 `&3` 为空则说明行项目 `VGBEL` 填了不存在的单据号或 `VGPOS` 填 0 —— 三件套指的是**被参考单据**的编号/行号，不是本单行项目号，故须配套「行号必填 + 单据存在」两条入参校验）；★ **退货订单 `Z011`（`VBTYP='H'`）** 的行项目 `PSTYV` 必须与订单类型匹配（`T184` 里 `Z011+NORM→Z011`、`Z001+NORM→Z001` 是两套独立配置），**传 `Z011` 或留空（留空由 SAP 自动确定，最稳）**，沿用销售订单的 `Z001` 必报 `V1 321`「没有为项目 &2 定义项目类别 &1」；退货数量存**正数**、定价与普通订单同。当需要新建/改造销售订单相关的 RFC 接口，或排查「创建订单报缺文本 / 创建报定价类型不在步骤 001 / 删行报项目类别 T184 / 订单不落库 / 新增行数量为 0 / **增强字段写入失败、修改时增强字段静默不落库、增强字段尾部丢失、报 V1 045 输入凭证编号或 V4 219 销售凭证没有修改** / **退货订单报 V2 068 不含凭证类别、报 V1 321 没有为项目定义项目类别** / 报「请检查计划交货数量」但订单类型本就没有计划行 / 清长文本返回成功但没删掉」时加载。
agent_created: true
---

# 销售订单 BAPI（创建 / 修改）实现范式

适用：示例客户 SAP ERP（`~/ABAP-AI`，系统 DEV，**S/4HANA**）。
范式实例：`ZBPM_ISP016`（FS `SD_ZSD007` 销售订单维护接口，函数组 `ZFG_BPM016`，包 `ZSD`）。

---

## 1. ★ 必踩坑：BAPI 按「登录语言」查找主数据文本

**症状**：接口返回 `E`，明细消息为

```
Missing text for division 10 language EN        （消息 V2 157）
Error in SALES_ITEM_IN 000010
Sales document  was not changed
```

创建与「测试运行」**都失败**，且 `VBAK` 完全不落库。

**根因**：`BAPI_SALESORDER_CREATEFROMDAT2` / `BAPI_SALESORDER_CHANGE` 在确定产品组描述时，按 **登录语言（会话语言）** 读 `TSPAT`。
本系统 `TSPAT` **只维护了中文（`SPRAS='1'`）文本** —— `TVKOT`（销售组织）、`TVTWT`（分销渠道）都是 `1/D/E` 三语言齐备，**唯独产品组缺英文**。

**关键排除结论（都实测过）**：

| 尝试 | 结果 |
|---|---|
| `SET LOCALE LANGUAGE '1'.` | ❌ 无效（`sy-langu` 确实变成 `ZH`，BAPI 仍报 `language EN`） |
| `sy-langu = '1'.` | ❌ 无效（同上） |
| ADT 请求带 `sap-language: zh` | ✅ **一次通过** |
| `SET LOCALE LANGUAGE 'ZH'.` | ❌ 运行期 500 `Key word for accessing the SAP text environment table TCP0C is too long`（语言键必须是 SAP 单字符码，不是 ISO 码） |

⇒ **BAPI 用的是会话/登录语言，不是 `sy-langu`。**

**用法**：

```bash
# 跑探针/报表时指定会话语言
SAP_ENV_FILE=$PWD/env/dev.env SAP_CLIENT_OVERRIDE=300 SAP_LANGUAGE_OVERRIDE=zh \
  node scripts/work/adt.js run ZTEST_ISP016_E2E2
```
（`scripts/work/adt.js` 已支持 `SAP_LANGUAGE_OVERRIDE`：设值后所有请求带 `sap-language` 头。）

**根治**（属主数据，动之前先问）：请 SD 顾问在 `TSPAT` 补齐相关产品组（`00`、`10`~`18`）的英文文本。补齐后任意语言都能用。
**前置确认**：先问对接方（BPM / IPAAS）RFC 调用用什么语言 —— 若本来就是中文，无需改主数据。

---

## 2. BAPI 选型与调用参数

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

★★ **`COND_ST_NO` / `COND_COUNT` 只有「条件已存在」时才填，新条件必须留空**（详见 §9.1）。
~~`COND_ST_NO='001' / COND_COUNT='01'`~~ 是错的写法，会报「定价类型 xx 不在步骤编号 001 中」。
`LOGIC_SWITCH-COND_HANDL` **不要设 `'X'`**（参照实现不设），否则条件行为与交付口径不一致。

### 2.2 文本

抬头 `VBBK` Z001~Z010、行项目 `VBBP` Z001~Z010，走 `BAPISDTEXT`（`FUNCTION / ITM_NUMBER / TEXT_ID / LANGU / TEXT_LINE`）。
**单条超 132 字符要按 132 拆行**（`WHILE lv_off < lv_len. lv_seg = iv_text+lv_off. ... lv_off = lv_off + 132. ENDWHILE.`）。
抬头文本的 `ITM_NUMBER` 传 `'000000'`（NUMC 的"初始值"就是全 0，标准函数据此判抬头/行项目）；修改模式 `FUNCTION` 传 `'005'`、创建模式留空。

★★ **`FUNCTION` 是功能码开关，不是"更新标识" —— `'003'` 才是删除**（详见 §9.3）：

| `FUNCTION` | 标准函数动作 |
|---|---|
| `'003'` | `DELETE_TEXT` + `COMMIT_TEXT` → **文本被删除**（`STXH` 头记录消失） |
| 其余（含 `'005'`、空） | `CREATE_TEXT` → **覆盖写入**；若只有一条空行，文本会变成"一条空行"，`STXH` 头与 `TDTXTLINES` **都还在** |

⇒ 想真正清空长文本，必须传 `'003'`；传 `'005'` 会**返回 `S` 但删不掉**，而且 `STXH-TDLUSER/TDLTIME` 已被刷新，很容易误判成"清空已生效"。
文本名：抬头 `TDNAME = VBELN`（`TDOBJECT = 'VBBK'`）、行项目 `TDNAME = VBELN + POSNR`（`'VBBP'`）。

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

## 5. ★ 计划行与数量：`CHANGE` 新增行的数量取自计划行

`BAPI_SALESORDER_CHANGE` **新增**行项目的数量取自 `SCHEDULE_LINES`（计划行），**不是** `ORDER_ITEM_IN-KWMENG`。
若只传 `order_item_in` 而漏了计划行 ⇒ BAPI 返回 `S`，但 `VBAP-KWMENG` 落库为 **`0.000`**（**静默丢数量**）。

**范式：行项目未配计划行时按 `KWMENG` 补一条**

```abap
" 创建模式：对全部行项目
LOOP AT is_input-it_item INTO ls_initm WHERE zitem_dl <> 'X'.
  READ TABLE lt_sched TRANSPORTING NO FIELDS WITH KEY itm_number = ls_initm-posnr.
  CHECK sy-subrc <> 0.
  CLEAR ls_sch.  ls_sch-itm_number = ls_initm-posnr.
  ls_sch-req_date = is_input-head-audat.  ls_sch-req_qty = ls_initm-kwmeng.
  APPEND ls_sch TO lt_sched.

  " 修改模式还要给出对应的 X 结构与 updateflag
  CLEAR ls_schx.  ls_schx-itm_number = ls_initm-posnr.
  ls_schx-req_date = 'X'.  ls_schx-req_qty = 'X'.  ls_schx-updateflag = 'I'.
  APPEND ls_schx TO lt_schex.
ENDLOOP.
```

**修改模式只对「本次新增（`VBAP` 中不存在）且入参未给计划行」的行补** —— 已存在行（`updateflag='U'`）不补，
避免覆盖原有计划行：

```abap
READ TABLE lt_posnr TRANSPORTING NO FIELDS WITH KEY table_line = ls_initm-posnr.
CHECK sy-subrc <> 0.          " 仅新增行
```

计划行字段映射：`ETENR → SCHED_LINE`、`EDATU → REQ_DATE`、`WMENG → REQ_QTY`、`LIFSP → REQ_DLV_BL`。

### 5.1 ★★ 数量有两条通道，取决于项目类别是否「与交货相关」（2026-10-10 实测）

上面的「补计划行」只对**会产生计划行**的订单类型（如 `Z001`）有效。**借项 / 贷项凭单请求（`Z014` / `Z015`）完全不适用** ——
它们的项目类别在 **`TVEPZ`（项目类别 → 计划行类别确定表）中没有配置** ⇒ SD **不生成计划行**，下发的 `BAPISCHDL` 被标准函数
**静默丢弃**（`VBEP` 0 行、零报错）。接口若只给计划行，数量与派生金额 `NETWR` **一起归零**。

> ⚠️ **判据是 `TVEPZ` 有没有条目，不是 `TVAP-LFREL`！**（2026-10-10 更正）
> 实测 `Z001` 与 `Z014` 的 `TVAP-LFREL` **都为空**，无法区分 —— 网上与老代码里「`LFREL` 空 ⇒ 无计划行」的
> 说法在**本系统不成立**。也**不能**按 `TVAK-VBTYP` 泛化：实测 `Z002`（`VBTYP='I'`）、`ZQT`（`VBTYP='B'`）**都有计划行**。

| 判定项 | 会产生计划行 | 不产生计划行 |
|---|---|---|
| `TVEPZ` 条目 | `Z001` / `Z002` / `Z011` / `Z013` **有** | **`Z014` / `Z015` 无** |
| `VBEP` 行数 | 各有 1 条 | 各 0 条 |
| `VBAP-KWMENG` | = 订单数量 | **恒为 0** |
| `TVAP-LFREL` | 空 | 空（**无法区分**） |

**关键事实**：`BAPISDITM` 里**没有任何字段的 `REFFIELD = KWMENG`**（`DD03L` 全表核实）—— BAPI **无法直接写 `VBAP-KWMENG`**。
数量只有两条进入通道：

| 通道 | BAPI 字段 | 落库 | 适用 |
|---|---|---|---|
| 计划行 | `BAPISCHDL-REQ_QTY` | `VBEP-WMENG` →（SD 汇总反写）`VBAP-KWMENG` | **产生**计划行的类型（`Z001`） |
| 目标数量 | `BAPISDITM-TARGET_QTY`（`DZMENG`，`REFFIELD = ZIEME`） | **`VBAP-ZMENG`** | **不产生**计划行的类型（`Z014`/`Z015`） |

**做法：两条都下发，无需按订单类型分支** —— 对交货相关的类型，标准函数**忽略** `TARGET_QTY`
（实测 `Z001`：`KWMENG = 5.000`、`ZMENG = 0.000`、计划行 2 条；与漏下 `TARGET_QTY` 时**完全相同** ⇒ 不会重复计数）：

```abap
* 行项目值与更新标识各加一行
cs_itm-target_qty = is_item-kwmeng.
IF is_item-kwmeng IS NOT INITIAL. cs_itmx-target_qty = 'X'. ENDIF.
```

（生产接口 `ZFM_SDI001` 的做法是按「目标数量」`ZMENG` 驱动：`ls_soitem-target_qty = ls_item-zmeng.`；入参没有 `ZMENG` 时取订单数量 `KWMENG`。）

**验收口径**：`Z014` / `Z015` 的「数量」看 **`VBAP-ZMENG`**；`VBAP-KWMENG` 对该类单据**恒为 0 属标准行为**
（300 既有早期单据 `5000000000`~`5000000003` 同样是 `KWMENG = 0` + `ZMENG = 1`）。→ 不要拿 `KWMENG` 做验收断言。

**排查两步（比盲试字段快得多）**：
1. `SELECT * FROM DD03L WHERE TABNAME = 'BAPISDITM' AND REFFIELD = '<底表字段>'` —— 先确认 BAPI 有没有对应字段；
2. `SELECT * FROM TVEPZ WHERE PSTYV = '<项目类别>'` —— **有条目 = 会产生计划行**（走计划行通道）；**无条目 = 不产生计划行**（数量只能走 `TARGET_QTY` → `ZMENG`）。★ **不要用 `TVAP-LFREL` 判断**（本系统 `Z001` 与 `Z014` 都为空）。

### 5.2 ★★ 改「已存在」计划行的类别 / 交货冻结（2026-10-27 `ZFID001C` 实测）

`VBEP-ETTYP`（计划行类别）与 `VBEP-LIFSP`（计划行交货冻结）**可以**经
`SD_SALESDOCUMENT_CHANGE` 的 `SCHEDULE_IN / SCHEDULE_INX` 改。三处硬约束，缺一则
「返回全 `S` 但字段一个字不动」：

1. **`BAPISCHDLX-UPDATEFLAG = 'U'`** —— 字段名是 `UPDATEFLAG`（不是 `UPDFLAG`），`BAPISCHDL` 本身没有该字段。
   不传时标准只回 `SCHEDULE_IN has been processed successfully`，`VBEP` 纹丝不动。
2. **每个行项目只下发一条 `SCHEDULE_IN`**（取 `MIN( ETENR )` 那条）。同一行项目下发多条 ⇒
   `V1 335 System error: Schedule line 0002 for item 000010 does not exist`，整单
   `V4 219 ... was not changed`。一条即够 —— 保存后该行项目**全部**计划行（`0001`/`0002`）同步变成目标值。
3. `SCHEDULE_INX` 的 `SCHED_TYPE` / `REQ_DLV_BL` 逐字段置 `'X'`；目标值本身就空的字段（如清除交货冻结）
   同样要置 `'X'`，否则不清空。

配套：

- `BAPI_SALESORDER_CHANGE`（封装层）对计划行与 `EXTENSIONEX` 增强字段**都不生效**，
  必须用 `SD_SALESDOCUMENT_CHANGE` + `CALL_FROM_BAPI = 'X'`。
- **不要同时下发 `ITEM_IN`**：标准按 `VBAP-SPART` 空值取产品组文本失败（`V2 157 Missing text for division 00`）。
- 该函数**不提交** ⇒ 调用侧 `COMMIT WORK AND WAIT`，异常 `ROLLBACK WORK`。
- 改完**必须回读校验**（`SELECT SINGLE`）：标准对计划行字段是静默跳过，「成功」不代表改了。

参考实现：`ZFID001C` 的 `frm_upd_pre_order`（FS ZSD018 预收款冻结订单解锁 / 回锁）。

---

## 6. 修改模式的行项目增 / 改 / 删判定

先取现有行项目号：`SELECT posnr FROM vbap INTO TABLE @lt_posnr WHERE vbeln = @lv_vbeln.`

| 条件 | `BAPISDITMX-UPDATEFLAG` | X 结构 |
|---|---|---|
| `ZITEM_DL = 'X'` | `'D'` | 无需逐字段置 X |
| 行项目号**不在** `lt_posnr` | `'I'` | 所有下传字段一并置 `'X'` |
| 行项目号**在** `lt_posnr` | `'U'` | 只对本行传了值的字段置 `'X'` |

### 6.1 ★ 更省事的做法：去掉删除标识，改「全量比对」

若调用方本就每次都传**全量行项目**，可不设删除标识：把入参各 `POSNR` 收集排序，反向遍历 `vbap` 现有 `POSNR`，**在入参中查不到的即置 `'D'`**。接口契约更简单（少一个字段、少一类校验），语义从「增量 + 显式删除」变为「全量覆盖」。

```abap
SELECT posnr FROM vbap INTO TABLE @lt_vbap WHERE vbeln = @lv_vbeln.
SORT lt_vbap BY table_line.

CLEAR lt_in_pos.
LOOP AT is_input-item INTO ls_fs_item.
  APPEND ls_fs_item-posnr TO lt_in_pos.
ENDLOOP.
SORT lt_in_pos BY table_line.

LOOP AT lt_vbap INTO lv_del.
  READ TABLE lt_in_pos TRANSPORTING NO FIELDS
       WITH KEY table_line = lv_del BINARY SEARCH.
  CHECK sy-subrc <> 0.

  CLEAR: ls_itm, ls_itmx.
  ls_itm-itm_number  = lv_del.      " ★ 两表都要填，见 §9.2
  ls_itmx-itm_number = lv_del.
  ls_itmx-updateflag = 'D'.
  APPEND ls_itm  TO lt_item.
  APPEND ls_itmx TO lt_itemx.
ENDLOOP.
```

配套：走 `EXTENSIONIN`（§4）后**没有提交后回写底表这一步**，被删行自然不会误报「增强字段写入失败」——初版那种 `CONTINUE` 补丁（旧的 `frm_update_ext`）应随改造一并删除。

**注意接口的入参校验通常要求修改模式也必须传行项目的 `MATNR` / `KWMENG` / `VRKME`**（与 FS「行项目必输」一致）
⇒ 调用方**不能只传要改的那个字段**（如只传新短文本），必须带上物料、数量、销售单位。这是设计约束，要在接口文档里写明。

---

### 6.2 计划行数量校验（业务规则，ZSD 惯例）

先取现有行项目号（同 §6.1），再逐行累计计划行数量：

```abap
LOOP AT it_item INTO ls_item.
  CLEAR lv_wmeng.
  LOOP AT ls_item-schedule INTO ls_schedule.
    lv_wmeng = lv_wmeng + ls_schedule-wmeng.
  ENDLOOP.

  READ TABLE lt_vbap TRANSPORTING NO FIELDS
       WITH KEY vbeln = lv_vbeln posnr = ls_item-posnr BINARY SEARCH.
  IF sy-subrc = 0.
    " 已存在的行项目：计划行数量必须一致
    IF lv_wmeng <> ls_item-kwmeng.
      cs_return-msgty = 'E'.
      MESSAGE s005(zsd01) INTO cs_return-msgtx.   " 请检查计划交货数量！
      RETURN.
    ENDIF.
  ELSE.
    " 新增的行项目：计划行数量不得大于订单数量
    IF lv_wmeng > ls_item-kwmeng.
      cs_return-msgty = 'E'.
      MESSAGE s004(zsd01) INTO cs_return-msgtx.   " 计划交货数量大于订单数量!
      RETURN.
    ENDIF.
  ENDIF.
ENDLOOP.
```

**注意三点**：
1. 参照实现 `ZFM_SDI001` 写作 `WHERE zmeng IS INITIAL`，靠行项目的「目标数量」`ZMENG` 排除"目标数量驱动计划行"的行。**若入参结构没有 `ZMENG`，就退化为对全部行校验**——此时务必确认业务可接受（含义：改行项目必须连计划行一起回传）。
2. 参照实现的两处 `MESSAGE` **没有置 `msgty`**（S 类型消息只填文本，返回状态为空），照抄会让调用方拿不到失败标志 ⇒ **补 `msgty = 'E'`**。
3. `ZSD01` 消息类**只有中文文本**（`T100` 里 `SPRSL` 仅 `1`）⇒ `MESSAGE ... INTO` 在非中文会话下取到空串，建议 `IF IS INITIAL. <中文字面量> ENDIF.` 兜底。

**★★ 必须先按项目类别豁免「不产生计划行」的订单类型**（2026-10-10 教训）：上面这套校验对 `Z014` / `Z015` 等
**不产生计划行**的项目类别会**恒报错** —— 它们的 `VBAP-KWMENG` 恒为 0、调用方无从下发计划行，
`lv_wmeng(0) <> ls_item-kwmeng(订单数量)` 永远成立。做法（判据同 §5.1 的 `TVEPZ`）：

```abap
" 取现有行项目时把项目类别一起取出
SELECT posnr, pstyv FROM vbap INTO TABLE @lt_vbap WHERE vbeln = @lv_vbeln.

... READ TABLE lt_vbap INTO ls_vbap WITH KEY posnr = ls_item-posnr BINARY SEARCH.
    lv_idx = sy-subrc.
    " 修改模式取 VBAP 现网真值；新增行取入参 PSTYV
    IF lv_idx = 0. lv_pstyv = ls_vbap-pstyv. ELSE. lv_pstyv = ls_item-pstyv. ENDIF.

    " ★ 项目类别未配置计划行类别 ⇒ 不产生计划行 ⇒ 整行跳过校验
    IF lv_pstyv IS NOT INITIAL.
      SELECT SINGLE pstyv FROM tvepz INTO @lv_chk WHERE pstyv = @lv_pstyv.
      IF lv_chk IS INITIAL. CONTINUE. ENDIF.
    ENDIF.

    IF lv_idx = 0.  " 已存在行：必须一致
      IF lv_wmeng <> ls_item-kwmeng. ... ENDIF.
    ELSE.           " 新增行：不得大于
      IF lv_wmeng >  ls_item-kwmeng. ... ENDIF.
    ENDIF.
```

判据取自标准配置表 ⇒ **自动覆盖未来新增的「无计划行」订单类型**，无需硬编码 `AUART` 清单。

**执行位置**：`SD_SALESDOCUMENT_*` 调用**之前**的前置校验段。

### 6.3 ★ 「清空标识」范式：字符字段传 `&&` 即置空

当调用方每次都传全量数据、需要某种手段表达"把这个字段清掉"时（`BAPISDHD1`/`BAPISDITM1` 里空串只能表达"不传"，无法区分"不改"与"改空"），**用保留值 `&&` 作为清空标记**是个干净的做法。

**字符字段 —— 动态遍历，不硬编码字段名**：

```abap
FORM frm_clear_mark CHANGING cs_data TYPE any.
  DATA: lv_count TYPE i, lv_type TYPE c LENGTH 1.
  FIELD-SYMBOLS: <lv_comp> TYPE any.

  DESCRIBE FIELD cs_data TYPE lv_type COMPONENTS lv_count.   " ★ TYPE 必须在 COMPONENTS 之前
  IF lv_count = 0. RETURN. ENDIF.

  DO lv_count TIMES.
    ASSIGN COMPONENT sy-index OF STRUCTURE cs_data TO <lv_comp>.
    IF sy-subrc <> 0. EXIT. ENDIF.
    DESCRIBE FIELD <lv_comp> TYPE lv_type.
    IF lv_type = 'C' OR lv_type = 'g'.                        " 只处理字符型
      IF <lv_comp> = '&&'. CLEAR <lv_comp>. ENDIF.
    ENDIF.
  ENDDO.
ENDFORM.
```

- 挂载点：**结构填充完成之后、交给标准函数之前**，对 `BAPISDHD1`（抬头）/ `BAPISDITM1`（行项目）/ `BAPISCHDL`（计划行）各调一次。
- `lv_type = 'C' OR 'g'`（`g` = 字符串）天然跳过数字、日期与**内嵌结构/内表**（那些类型是 `u`/`v`/`h`），不会误清。
- **不要逐字段 `IF ls_hd-bstnk = '&&'. CLEAR ls_hd-bstnk. ENDIF.`** —— 字段一多就漏，且结构新增字段要改代码。

**长文本 —— 必须走功能码 `'003'`，且先查存在性**（详见 §9.3）：

```abap
IF iv_text = '&&'.
  IF iv_function IS INITIAL OR iv_vbeln IS INITIAL. RETURN. ENDIF.   " 创建模式不处理
  IF iv_posnr IS INITIAL.                                             " 抬头
    lv_object = 'VBBK'.   lv_tdname = iv_vbeln.
  ELSE.                                                               " 行项目
    lv_object = 'VBBP'.   CONCATENATE iv_vbeln iv_posnr INTO lv_tdname.
  ENDIF.

  SELECT SINGLE tdname FROM stxh INTO @lv_dummy                       " ★ 不存在就跳过
    WHERE tdobject = @lv_object AND tdname = @lv_tdname
      AND tdid = @iv_tdid AND tdspras = @sy-langu.
  IF sy-subrc <> 0. RETURN. ENDIF.

  CLEAR ls_text.
  ls_text-function   = '003'.                                         " ★ 003 = 删除
  ls_text-itm_number = iv_posnr.
  ls_text-text_id    = iv_tdid.
  ls_text-langu      = sy-langu.
  APPEND ls_text TO ct_text.
  RETURN.
ENDIF.
```

**语义分工（要写进接口文档）**：长文本传**空串 = 本次不处理**（保持原值），传 `&&` = **删除**；与"行项目传全量"相反，调用方**只下发需要改动的文本**即可。
**风险提示**：`&&` 成了保留值，须与对接方确认业务取值不会恰好是 `&&`；有疑虑就换更特殊的标记（如 `~CLEAR~`）。

---

## 7. E2E 测试要点

- **环境**：集团 300 才有销售订单主数据（客户销售视图、物料销售视图、定价过程）。集团 100 无 `VBAK` 数据。
- **运行命令**：
  ```bash
  SAP_ENV_FILE=$PWD/env/dev.env SAP_CLIENT_OVERRIDE=300 SAP_LANGUAGE_OVERRIDE=zh \
    node scripts/work/adt.js run ZTEST_ISP016_E2E2
  ```
- **落库断言用唯一标记**：把 `'E16C' + sy-datum + sy-uzeit`（≤20 字符）写进 `VBAK-ZBPMNO`，
  然后 `SELECT vbeln FROM vbak WHERE zbpmno = @lv_mark` 精确取回本次生成的订单号，**避免误命中历史数据**。
  测试运行（`TESTRUN='X'`）用另一个前缀的标记，断言其行数 = 0。
- **断言清单**（创建路径）：抬头（`AUART/VKORG/VTWEG/SPART/KVGR5/BSTNK/WAERK/KNUMV` + 增强字段）→
  行项目（`MATNR/KWMENG/VRKME/WERKS/PSTYV` + 增强）→ 计划行（`VBEP`）→ 伙伴（`VBPA` 按 `KUNNR` 判，见 §2.3）→
  条件（`PRCD_ELEMENTS WHERE knumv = vbak-knumv AND kschl = 'ZP01'`）→ 文本（`STXH WHERE tdobject='VBBK' AND tdname=vbeln`）。
- ★★ **增强字段必须做「全量字段对账」**：把 `VBAK` / `VBAP` 的**每一个** Z 字段逐一读回比对（`ZBPM_ISP016` 实测为抬头 22 字段 + 行项目 17 字段），**不能只断言"接口返回 S"**——尾部字段被截断、修改模式整批未更新，两种失败都**零报错**。数值型入参字段（如 `DEC`）断言要用数值字面量。
- ★ **修改模式要有「选择性更新」用例**：只下发部分增强字段 + 其中一个传 `&&` 清空，断言**未下发的字段保持原值**（证明标识结构逐字段置 `X` 生效）。
- ★ **要有一个「标准字段 + 增强字段同时传」的用例**：否则容易把「报错型」与「静默型」两类失败混成一个问题（见 §9.4）。
- ★ **退货订单（`Z011`）要单列用例**：`㉓-1` TESTRUN 参考原销售订单（回归点：行项目 `REF_DOC_CA` 是否下发）→ `㉓-2` 正式创建并核对 `VBAP-PSTYV = Z011`、`VGBEL / VGPOS / VGTYP` 全部落库（见 §10）。**这是普通订单用例覆盖不到的路径**——参考单据三件套、项目类别随订单类型变化都只在退货场景暴露。
- **`$TMP` 探针不可定义 `FORM`**（激活报 `Statement is not accessible`）⇒ 复用逻辑用 `DEFINE` 宏。
- 探针会真实创建订单，多次运行会累积。**在报告里记录订单号**；300 集团属测试环境可接受。

---

## 8. 常见报错 → 根因速查

| 报错 | 根因 |
|---|---|
| `V2 157 Missing text for division xx language EN` | 会话语言为 EN 而 `TSPAT` 无英文文本 → §1 |
| 订单创建返回 `S` 但 `VBAP-KWMENG = 0` | 新增行未传计划行（**与交货相关**的类型）→ §5 |
| 借项 / 贷项凭单请求（`Z014` / `Z015`）返回 `S` 但 `VBAP-ZMENG = 0` 且 `NETWR = 0` | 该类项目类别不产生计划行，只给计划行必丢数量；须补下 `BAPISDITM-TARGET_QTY` → §5.1 |
| 维护借项 / 贷项凭单请求（`Z014` / `Z015`）报 `E`「请检查计划交货数量！」（`ZSD01 s005`） | 该类项目类别**不产生计划行**（`TVEPZ` 无条目）⇒ `VBAP-KWMENG` 恒为 0，调用方无从下发计划行，计划行数量校验**恒不通过**。校验前先按 `TVEPZ` 判据免除该行 → §5.1 / §6.2 |
| `V2 068 凭证 &1 不含凭证类别 &2 但含 &3`（&2 为空） | 行项目参考单据少了 **`REF_DOC_CA`（参考凭证类别）** → §10.1 |
| `V2 068 凭证 &1 不含凭证类别 &2 但含 &3`（**&3 为空**、&1 看着像行项目号） | 行项目 `VGBEL` 填了**不存在**的单据号，或 `VGPOS` 填 0 —— 三件套指的是**被参考单据**的编号/行号，不是本单行项目号 → §10.1 |
| `V1 321 没有为项目 &2 定义项目类别 &1` | 行项目 `PSTYV` 与订单类型不匹配 → §10.2 |
| 修改订单报 `V1 045 输入凭证编号` / `V4 219 销售凭证 &1 没有修改`（用了 `EXTENSIONIN`） | `BAPE_*` 的键位字段 `VBELN` 没下发，`move-corresponding` 清空了单号 → §4.2（`V4 219` 是兜底消息，**根因看它前面那条**） |
| 增强字段**尾部几个字段**不落库（前几个正常） | 值结构 > 240 字符而只填了 `VALUEPART1`，被静默截断 → §4.3（`BAPE_VBAP` = 271 会踩，`BAPE_VBAK` = 204 不会） |
| 创建时增强字段能落库、**修改时返回 `S` 但值不变且零报错** | `*KOZX` 标识字段数据元素是 `BAPIUPDATE`（须为 `CHAR1`），被 `GET_CHANGEABLE_FIELDS` 整批排除 → §4.5 |
| 激活报 `".", "RANGE ...", "DECIMALS ...", or "ELSE UNASSIGN" expected after "C".` | 用了 `ASSIGN ... CASTING TYPE c LENGTH <变量>` → §4.4 |
| 运行 DUMP `Invalid subfield access: Offset plus length too long`（在序列化 FORM 里） | `ASSIGN ... CASTING TYPE c`（不带 `LENGTH`）后字段符号长度不跟随源结构 → §4.4 |
| `销售订单 xxx 行项目 yyy 增强字段写入失败`（数据其实已改对） | 旧方案（提交后 `UPDATE` 底表）未跳过已删除行；**改用 `EXTENSIONIN`（§4）后此问题消失** |
| 激活报 `Unknown column name "ABGRU"` / `"XLOEK"` | 本系统 S/4 无该列 → §3 |
| 激活报 `The elements in the "SELECT LIST" list must be separated using commas` | 多字段 `SELECT` 漏逗号（S/4 语法）→ 一律逗号分隔 |
| 修改订单只改一个字段就报「物料不能为空」 | 修改模式同样强制行项目必输字段 → §6 |
| `000010:在定价过程XXX中定价类型YYY不在步骤编号001中` | 新条件硬编码了 `COND_ST_NO` → §9.1 |
| `没有可用的项目类别 (表 T184 xxx yyy) / ITEM_IN 000000中出现错误` | `ITEM_IN` / `ITEM_INX` 排序后错位（报错文本与真因完全不相干）→ §9.2 |
| 修改订单报 `header_inx-updateflag` 非法 | `ORDER_HEADER_INX-UPDATEFLAG` 只能是 `'U'` 或 `'D'`（函数入口硬校验，见 `SD_SALESDOCUMENT_CHANGE` 源码） |
| 传 `FUNCTION='005'` 清长文本：返回 `S` 但 `STXH` 里文本还在 | `'005'` 只走 `CREATE_TEXT` 覆盖写入 → §9.3，改用 `'003'` |
| 清空长文本反而把接口打成 `E`（消息 `E600`） | `DELETE_TEXT` 对不存在的文本 `MESSAGE E600 ... RAISING NOT_FOUND` → §9.3，删前先查 `STXH` |
| 激活报 `"TYPE ..." is missing between "X" and "COMPONENTS".` | `DESCRIBE FIELD` 取组件数漏了 `TYPE` 子句 → `DESCRIBE FIELD x TYPE t COMPONENTS n.` |

---

## 9. ★ 「报错文本与真因不相干」的坑（2026-10-09 / 10-10 实测）

### 9.1 新定价条件不能指定步骤号

- **现象**：创建订单报 `000010:在定价过程ZGSDC1中定价类型ZP01不在步骤编号001中 / 销售凭证 没有修改`。
- **根因**：把新条件的 `BAPICOND-COND_ST_NO` 硬编码成 `'001'`。标准函数按「定价过程 + 步骤号」校验条件类型是否存在；本系统 `T683S` 中 `ZGSDC1` 的 `ZP01` 实际位于 **`STUNR = '010'`**。
- **正解**：**只有条件已存在时才回填步骤号**——`PRCD_ELEMENTS` 按 `KNUMV + KPOSN + KSCHL + KINAK = ''` 命中，才把 `STUNR`/`ZAEHK` 写进 `COND_ST_NO`/`COND_COUNT` 并把 `BAPICONDX-UPDATEFLAG` 置 `'U'`；**新条件留空**（`'I'`），由定价过程按条件类型自动定位步骤。
- **查证手段**：`SELECT * FROM T683S WHERE KALSM = '<定价过程>'` 看各条件类型落在哪个 `STUNR`。
- 同时**不要设** `LOGIC_SWITCH-COND_HANDL = 'X'`（生产参照接口 `ZFM_SDI001` 不设，`logic_switch` 整个留空）。

### 9.2 SD 标准函数入口会排序成对表 ⇒ 删除行两表都必须带行项目号

- **现象**：修改订单删行报 `没有可用的项目类别 (表 T184 Z001  TEXT ) / ITEM_IN 000000中出现错误 / 销售凭证 xxx 没有修改`——**指向项目类别确定，与删除毫无关系**。
- **根因**：`SD_SALESDOCUMENT_CHANGE`（函数组 `VBAK`，包含程序 **`LVBAKF0C`**）入口处执行
  `sort item_in by itm_number ascending.` / `sort item_inx by itm_number ascending.`
  ——两张表**各自独立排序**。若删除行只填 `ITEM_INX` 而让 `ITEM_IN` 那一行整体留空（`ITM_NUMBER = '000000'`），排序后空行排到最前，**两表索引错位**，空行被当成新行参与项目类别确定 → 报 `T184` 查不到。
- **正解**：删除行**两张表都填 `ITM_NUMBER`**：

  ```abap
  CLEAR: ls_itm, ls_itmx.
  ls_itm-itm_number  = lv_del.     " ★ 关键
  ls_itmx-itm_number = lv_del.
  ls_itmx-updateflag = 'D'.
  APPEND ls_itm  TO lt_item.
  APPEND ls_itmx TO lt_itemx.
  ```

- **推论（通用）**：凡传给 `SD_SALESDOCUMENT_*` 的**成对表**（`ITEM_IN`/`ITEM_INX`、`SCHEDULE_IN`/`SCHEDULE_INX`、`CONDITIONS_IN`/`CONDITIONS_INX`），**行数必须一致、`ITM_NUMBER` 必须逐行相同**，不能靠「只填 X 表」偷懒。
- **排查手段**：`get_source.js FM SD_SALESDOCUMENT_CHANGE VBAK` 读标准源码；`D010INC WHERE MASTER = 'SAPLVBAK'` 找包含程序；`grep -n "form ms_move_item_inx"` 定位实现。

### 9.3 长文本删除的开关是 `'003'`，不是 `'005'`

- **现象**：修改模式下想把某条长文本清空，`BAPISDTEXT-FUNCTION` 传 `'005'`、`TEXT_LINE` 留空，接口**返回 `S`**，但查 `STXH` 文本**依然存在**、`TDTXTLINES` 仍是 `'00001'`。极易误判为"清空已生效"，因为 `STXH-TDLUSER` / `TDLTIME` **已经被刷新成本次运行的时刻**——标准函数确实动了这条文本，只是没删。
- **根因**：`SD_SALESDOCUMENT_CHANGE` 第 15 步调 `SD_SALES_DOCU_MAINTAIN`（函数组 **`SAPLV45A`**），其 `create_text_header` / `create_text_item`（源码 2478 / 2625 行起）是：

  ```abap
  case function.
    when '003'.                          " 删除
      call function 'DELETE_TEXT' exporting id = ct_tdid language = ct_tdspras
                                  name = ct_tdname object = 'VBBK' ...
      if sy-subrc <> 0. ... else. call function 'COMMIT_TEXT' exporting object = 'VBBK'. endif.
    when others.                         " 含 '005'、空：覆盖写入
      call function 'CREATE_TEXT' exporting ... object = 'VBBK' tables flines = i_tlinetab ...
  endcase.
  ```

  ⇒ `FUNCTION` 是**功能码开关**，不是"更新标识"。传 `'005'` 只是把文本**重写成一条空行**，头记录与行数都保留。
- **正解**：清空分支固定 `FUNCTION = '003'`（`FORMAT_COL` 不需要设）。
- **★ 附带必须处理的一点**：`DELETE_TEXT` 源码末段是

  ```abap
  IF any_deleted = abap_false.
     MESSAGE E600 WITH NAME ID LANGUAGE RAISING NOT_FOUND.
  ENDIF.
  ```

  即目标文本不存在时**不仅抛异常、还留下一条 `E` 消息**；`create_text_header` 的 `if sy-subrc <> 0` 分支随即 `fehler_ausgeben`，把它转成 `BAPIRET2` 追加进标准函数的 `RETURN` 表 ⇒ 调用方按 `E` 判失败，"清空"反而把接口打成失败。
  ⇒ **删前必须先查存在性**：

  ```abap
  SELECT SINGLE tdname FROM stxh INTO @lv_dummy
    WHERE tdobject = @lv_object AND tdname = @lv_tdname
      AND tdid = @iv_tdid AND tdspras = @sy-langu.
  IF sy-subrc <> 0. RETURN. ENDIF.
  ```

  副作用是好的：调用方对"本来就没有的文本"传清空标记变成**幂等安全**操作。
- **排查手段**：`get_source.js FM SD_SALES_DOCU_MAINTAIN SAPLV45A` → `grep -n -E "create_text_header|create_text_item|DELETE_TEXT|CREATE_TEXT"`；文本名规则见 §2.2。

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
   node scripts/work/adt.js query "SELECT * FROM DD03L WHERE TABNAME = 'ZSVBAPKOZX'"
   ```
5. **构造「同时传标准字段 + 增强字段」的用例**：若两者同时落库而"只传增强字段"失败，说明是两个独立问题；只测一种很容易误判。`ZBPM_ISP016` 的用例㉑-2 就是为此设的。

**通用教训**：`EXTENSIONIN` 的两类失败模式——**报错型**（键位/格式）与**静默型**（变更清单/长度截断）——必须分别用不同类型的断言覆盖：前者看 `ES_RETURN-MSGTY`，后者必须**落库读回逐字段对账**。只断言"接口返回 S"是不够的。

---

## 10. ★ 参考单据与退货订单（2026-10-10 实测）

### 10.1 参考单据是「三件套」，少传类别必报 `V2 068`

SD 的参考单据关系在 BAPI 结构里分**三个**字段，缺一不可：

| 层级 | BAPI 字段 | 对应底表 |
|---|---|---|
| 抬头 | `BAPISDHD1-REF_DOC` / `BAPISDHD1-REFDOC_CAT` | `VBAK-VGBEL` / `VBAK-VGTYP` |
| **行项目** | **`BAPISDITM-REF_DOC` / `REF_DOC_IT` / `REF_DOC_CA`** | **`VBAP-VGBEL` / `VGPOS` / `VGTYP`** |

**症状**：只传编号 + 行号、类别留空 ⇒ 标准函数报

```
V2 068  凭证 &1 不含凭证类别 &2 但含 &3
        → 凭证 7000000136 不含凭证类别  但含 C      （&2 空、&3 是凭证的真实类别）
```

**为什么容易漏**：普通销售订单（如 `Z001`）不参考原单，`VGBEL` 为空，三个字段一起空，**从不复现**；**退货订单天然要参考原销售订单**，于是只在退货场景暴露。

**正解**（行项目结构通常没有独立的"类别"字段 ⇒ 查被参考单据）：

```abap
cs_itm-ref_doc    = is_item-vgbel.
cs_itm-ref_doc_it = is_item-vgpos.
IF is_item-vgbel IS NOT INITIAL.
  SELECT SINGLE vbtyp FROM vbak INTO @lv_vbtyp WHERE vbeln = @is_item-vgbel.
  IF sy-subrc = 0.
    cs_itm-ref_doc_ca = lv_vbtyp.          " ★ 取被参考单据自身的凭证类别
  ELSE.
    cs_itm-ref_doc_ca = is_input-vgtyp.    " 兜底：抬头类别
  ENDIF.
ENDIF.
```

> **不要无脑取抬头 `VGTYP`**（早期实现）：那隐含「行项目与抬头参考同一单据」的假设，一旦调用方传了别的单据号（或传错），错误类别会被硬套上去，报错反而更难查。

**参考类别取值 = 被参考凭证自身的 `VBAK-VBTYP`**：参考**销售订单**用 `'C'`（`Z001` 的 `VBTYP = C`）；退货单自身是 `'H'`，不能拿它当参考类别。

**三条入参校验（缺任何一个就会把晦涩的 `V2 068` 抛给调用方）**：

```
行项目 { POSNR } 填写了参考单据编号，抬头必须填写参考单据的凭证类别
行项目 { POSNR } 填写了参考单据编号，参考单据行号不能为空
行项目 { POSNR } 的参考单据 { VGBEL } 不存在
```

**★ 编号 / 行号指的是「被参考单据」的，不是本单的行项目号。** 实例（`Z007` 寄售结算退回）：
行项目误填 `VGBEL = '0000000010'`（= `POSNR` 10 的零填充）、`VGPOS = 0` ⇒ 报
「凭证 10 不含凭证类别 C 但含」（**`&3` 为空** = 该单据在 `VBAK` 里查不到）。
标准形态（既有单实测）：`VGBEL = 41000000xx`（**与抬头参考同一个单据**）+ `VGPOS = 000010` + `VGTYP = C`；
行项目整体留空也合法（表示该行不参考）。

**排查手段**：
```bash
node scripts/work/adt.js query "SELECT VBELN, POSNR, VGBEL, VGPOS, VGTYP FROM VBAP WHERE VBELN = '<退货单>'"   # 看标准做法长什么样
node scripts/work/adt.js query "SELECT * FROM T100 WHERE ARBGB = 'V2' AND MSGNR = '068' AND SPRSL = '1'"        # 消息原文（占位符顺序决定怎么读）
```

### 10.2 退货订单 `Z011`：项目类别必须与订单类型匹配

**症状**：拿销售订单的参数去建退货单，行项目 `PSTYV` 仍是 `Z001` ⇒

```
V1 321  没有为项目 &2 定义项目类别 &1
        → 没有为项目 000010 定义项目类别 Z001
```

**根因**：项目类别由 `T184`（项目类别确定：`AUART` + `MTPOS`(物料项目类别组) + `VWPOS`… → `PSTYV`）决定。同一物料在两种订单类型下是**两套独立配置**：

```bash
node scripts/work/adt.js query "SELECT * FROM T184 WHERE AUART = 'Z011'"   # → Z011 + NORM → PSTYV Z011
node scripts/work/adt.js query "SELECT * FROM T184 WHERE AUART = 'Z001'"   # → Z001 + NORM → PSTYV Z001
```

**正解**：退货单的行项目 `PSTYV` 传 **`Z011`**，**或干脆留空** —— 留空时由 SAP 按「订单类型 + 物料项目类别组」自动确定（两种都实测通过）。**最稳的是留空**，把项目类别交给配置决定，接口不用关心订单类型差异。

### 10.3 退货订单的其它要点

| 项 | 结论（`Z011` / 系统实测） |
|---|---|
| 订单类型属性 | `VBTYP = 'H'`、`TRVOG = 0`、伙伴确定过程 `PARGR = TA`、编号内部范围 `NUMKI = Z5`（落到 `60000000xx` 段）、`TVAK-KALSM` 为空 |
| **数量符号** | `VBAP-KWMENG` / `VBEP-WMENG` **存正数**（样例退货单 3.000 / 3.000）—— 方向由 `VBTYP='H'` 在后续交货/开票环节体现，**接口不做符号翻转** |
| 定价 | 与销售订单同：样例退货单 `PRCD_ELEMENTS` 里 `ZP01` 在 `STUNR = 010`，`MWSI` / `VPRS` / `NETW` 照常带上 |
| 客户/物料 | 与销售订单**完全通用**（无需为退货单独建主数据） |
| 伙伴 | 仍是 `AG / WE / RE / RG`（落库 S/4 显示 `SP / SH / BP / PY`） |
| 计划行数量校验（§6.2） | 退货数量为正数时 `合计 = 订单数量` / `不得大于` 两条规则照常成立 |

**判据速查**：`TVAK.VBTYP` —— `C` = 销售订单、`H` = 退货订单、`B` = 报价、`A` = 询价。

