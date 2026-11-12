---
name: sap-abap-bapi-usage
description: BAPI / 标准函数（FM）调用总纲（跨项目通用）。把散落在各技能里的 BAPI 使用经验集中到一处：调用规范（CALL FUNCTION 段序、COMMIT/ROLLBACK 责任边界、CHECK 函数做 dry-run、POSTING_INTERFACE 兜底）、★四条参数结构硬约束（x 结构必须与原结构成对、标识字段数据元素必须 CHAR1、VALUEPART1 仅 240 按 960 分块、清空标识 && 的语义）、★★「返回 S 但值没变」静默失效清单（16 条：SD 增强字段·TVEPZ 数量双通道·BAPI_USER_EXISTENCE_CHECK 恒真·DELETE_TEXT RAISING NOT_FOUND·定价步骤号·OBJ_KEY 布局·BSEG 999 行·双币 CURRENCYAMOUNT·UMSKZ 无字段·READ_TEXT 类型冲突等）、★BAPI 按会话语言取文本（SET LOCALE LANGUAGE 无效，只有 sap-language 请求头有效）、金额日期字符转换口径（ALPHA/MATNR 反例/AMT_DOCCUR 字符串/PSTNG_DATE）、★按业务域选型表（FI 过账与冲销·PP 生产订单 TECO 与用户状态·SD 订单·BDC 兜底）、BAPIRET2 消息处理与 220 字符上限、凭证分片上限与边界用例、落库对账口径。当要新建/改造任何 BAPI 或标准函数调用、排查「返回 S 但数据没变 / 创建能写修改写不进 / 增强字段静默丢失 / 数量或金额为 0 / 报错文案与真因无关 / 调用后没提交」时加载本技能。
agent_created: true
---

# BAPI / 标准函数调用总纲

用途：调 BAPI 之前扫一遍第 1~6 节；出了「返 S 但不对」的症状直接跳第 3 节按症状对号；选接口跳第 7 节。

配套技能：SD 订单参数细节见 `sap-sd-sales-order-bapi`；BDC 录屏改造见 `sap-bdc-to-bapi-migration`；项目级封装接口约定见 `sap-abap-project-ops`。

**三条元规则**（比任何单条坑都重要）：

1. **BAPI 返回 `S` 只代表「函数跑完了」，不代表「数据进去了」。** 唯一可信的成功判据是**落库对账**：按业务键查底表，逐字段比期望值。返回值、消息类型、HTTP 状态都不算。
2. **缺参数不报错，缺「配对参数」才报错。** BAPI 的参数校验是条件触发的：结构没传 = 用默认值静默继续；该配对的标识结构没传 = 在特定数据下才炸。所以「编译过、跑通了」不能证明参数完整。
3. **报错文案经常与真实原因无关。** 拿到 `V1 045` / `V4 219` / `T184` 这类消息，先看**它前面那条 E**，再查表（`TBSL`/`TVEPZ`/`T184`）确认配置，别直接改代码。

---

## 1. 调用规范

- **`CALL FUNCTION` 段序强制**：`EXPORTING → IMPORTING → CHANGING → TABLES → EXCEPTIONS`。把 `TABLES` 写在 `IMPORTING` 之前，编译报 `Unable to interpret "EV_OBJNR"`——完全看不出是顺序问题。被调方 `EXPORTING` 形参要写在调用方 `IMPORTING` 段，写反报 `CALL_FUNCTION_PARM_UNKNOWN`，极易误判成「FM 接口没生成」。
- **提交责任必须明确到一方**。BAPI 自己不提交，标准函数/封装接口可能自己提交：
  - 裸 BAPI：调用方在**所有检查通过后**才 `BAPI_TRANSACTION_COMMIT EXPORTING wait = 'X'`，失败分支 `BAPI_TRANSACTION_ROLLBACK`。
  - 封装接口内部已 `COMMIT`：调用方**不要再提交**，也**不要在跑完后 `ROLLBACK`**——外层回滚对已提交的事务无效，只会让你误以为能撤回。
  - **「一批单据要么全成要么全败」就别在循环里提交**；要独立提交就必须保留回读校验（提交后数据才可见，删掉 `COMMIT AND WAIT` 会导致回读误判「没写进去」）。
- **先 CHECK 后 POST**：多数域有成对的 `*_CHECK` / `*_POST`（如 `BAPI_ACC_DOCUMENT_CHECK` / `_POST`），参数结构完全兼容，CHECK 只校验不落库。改造成「模拟导入」按钮时优先走这条，比自造校验逻辑可靠。
- **`*_CHECK` 的已知边界**：CHECK 与 POST 共用参数结构但**校验深度不完全一致**（部分增强/字段状态组检查只在 POST 阶段触发），且票据类（`UMSKZ = W/X/Y`）等特殊行可能根本走不了 BAPI 通道。
- **BDC 兜底时的提交语义**：`CALL TRANSACTION ... OPTIONS FROM ctu_params( dismode = 'N' updmode = 'S' )` 走同步更新，**不要再补 `BAPI_TRANSACTION_COMMIT`**。
- **别用 `Update*` 类写接口做试探性调用**——它会真写。曾用 `UpdateFunctionModule` 只传函数体「试试」，把 inactive 源码覆盖成 620 字符残版。探针只走只读接口。

---

## 2. 参数结构四条硬约束

### 2.1 `x` 结构必须与原结构成对传

只传 `depreciationareas` 漏 `depreciationareasx` ⇒ 填了 `AFASL` 就报 `No change parameter given for depreciation area 01`。

**缺 x 结构不报语法错，只在数据条件满足时触发**——所以测试用例必须覆盖「要改的字段非空」。

### 2.2 标识结构（`*KOZX`）的字段数据元素必须是 `CHAR1`，不能是 `BAPIUPDATE`

`SD_SALESDOCUMENT_CHANGE` 走 `GET_CHANGEABLE_FIELDS`，只滚 `WHERE rollname = 'CHAR1' OR 'CHAR01'` 的字段；用 `BAPIUPDATE` 的全部被排除 ⇒ **返回 S、值不变、零报错**。

而**创建路径不走这份清单** ⇒ 典型症状是「**创建能写、修改写不进**」。**不可改回 `BAPIUPDATE`**。

### 2.3 `BAPIPAREX-VALUEPART1` 只有 240 字符

标准函数按偏移连续读 `VALUEPART1~4`（合计 960）。只填第一段则尾部**静默截断**——`BAPE_VBAP` 实测 271 字符，后 3 个字段全空、无报错。**必须按 240 分四段填满**。

### 2.4 清空标识 `&&` 的语义

「空串 = 不处理 / `&&` = 清空 / 其它 = 赋新值」。实现上字符字段用 `DESCRIBE FIELD ... TYPE t COMPONENTS n` + `ASSIGN COMPONENT` 动态遍历，只清类型 `C`/`g` 的字段（`TYPE` 必须写在 `COMPONENTS` 之前，否则激活报 `"TYPE ..." is missing`）。

**注意 `&&` 只对长度 ≥2 的字段生效**——单字符字段无法区分「清空」与「空值」。

---

## 3. 静默失效清单（最贵的一节）

**凡「返回 S / 编译通过」但结果不对，先来这里对号。**

### 3.1 参数没落地

- **SD 增强字段标识结构必须是 `CHAR1`** —— 见 2.2，「创建能写、修改写不进」的元凶。
- **`BAPIPAREX-VALUEPART1` 只有 240 字符** —— 见 2.3，尾部字段静默丢。
- **`BAPE_*` 首字段是键位，修改模式漏传即清空单号** —— 标准函数把 `EXTENSIONIN` 值 `move-corresponding` 进 `E_VBAKKOM`，`VBELN` 留空就把单号覆盖成空 ⇒ `V1 045` 后跟 `V4 219`（**根因看 `V4 219` 前面那条 E 消息**）。
- **新增定价条件不能指定步骤号** —— 硬编码 `COND_ST_NO='001'` 而实际步骤在 `STUNR=010` ⇒ 报「定价类型不在步骤编号 001 中」。留空由定价过程自动定位；用「条件是否已存在」驱动 `UPDATEFLAG` 的 `I`/`U`。
- **`UMSKZ` 在三个 BAPI 结构里都没有字段** —— 票据类（W/S）走标准 BAPI 通道会被静默丢弃、科目记错。只能经 `EXTENSION2` 增强落库，或整张走 `POSTING_INTERFACE_*`。

### 3.2 数据错位与数量归零

- **借贷项/无计划行订单类型：数量只认 `TARGET_QTY`** —— `BAPISDITM` 里没有任何字段的参考字段是 `KWMENG`；该类项目类别在 `TVEPZ` 无配置 ⇒ 不产生计划行，下发的 `BAPISCHDL` 被静默丢弃，返 S 但 `KWMENG=0`、`NETWR=0`、`VBEP` 0 行。

  判据用 **`TVEPZ` 有无条目**，**不能用 `TVAP-LFREL`**（`Z001` 与 `Z014` 的 `LFREL` 都为空）、也不能用 `VBTYP`。

  读取侧同一坑：`VBAP-KWMENG` 恒 0、数量在 `VBAP-ZMENG` ⇒ 回填口径「`KWMENG` 非空优先、为空回退 `ZMENG`」。
- **接口二次拆张时 `OBJ_KEY` 只回一个凭证号** ⇒ 张数少报、按行回写指错凭证。`OBJ_KEY` 布局是 `凭证号(10)+公司代码(4)+会计年度(4)`，年度在 **`+14(4)`**（常被误写 `+10(4)` 取到公司代码）。
- **`BSEG-BUZEI` 是 `NUMC(3)`，单张凭证 999 行物理上限**，BAPI 实际只吸纳 990 行 —— 分片上限取 `989 明细 + 1 轧差`；边界必须覆盖 999/1000/1997（1997 按 `>999` 判会切出 1000 行而溢出）。
- **`BAPIACHE09` 没有 `EXCH_RATE` 字段** —— 双币（00+10 行）只给 00 行带汇率时，系统按 OB08 重定抬头汇率（填 7 落 8.28）。`CURR_TYPE='10'` 行也必须带 `exch_rate`，明细行与轧差行两处都要。
- **双币凭证每个 `ITEMNO_ACC` 必须给两条 `CURRENCYAMOUNT`，且每种币种小计为 0** —— 缺 `10` 行报 `Inconsistent currency information`；拆分产生的轧差行同样要补。

### 3.3 校验形同虚设 / 反被报错

- **`BAPI_USER_EXISTENCE_CHECK` 在本类系统对任何账号都返 0**（连 `ZZZZZZ999` 都通过）⇒ 校验形同虚设，单据转给无效账号后两个界面都看不到。直查 `USR02` + 长度防护（`0 < len <= 12`）。
- **`DELETE_TEXT` 对不存在的文本 `RAISING NOT_FOUND`** —— 标准函数把该 E 消息追加进 `BAPIRET2`，被 `frm_check_return` 判失败 ⇒「清空」反而把接口打成 E。清空前先查 `STXH`（`TDOBJECT+TDNAME+TDID+TDSPRAS`），不存在就跳过（顺带让操作幂等）。
- **删长文本的功能码是 `003` 不是 `005`** —— `SD_SALES_DOCU_MAINTAIN` 里 `005` 只是把文本重写成一条空行。另：删完 `STXH` 头与 `TDTXTLINES` 都还在、`TDLUSER/TDLTIME` 已刷新，**极易误判为清空成功**。
- **`SD_SALESDOCUMENT_CHANGE` 入口对两个表各自排序** —— 删除行必须 `ITEM_IN` 与 `ITEM_INX` **都填** `ITM_NUMBER`；只填 `ITEM_INX` 会错位，报完全不相关的 `T184 没有可用的项目类别`。
- **`READ_TEXT` 的 `NAME` 形参是 `TDOBNAME`(70)**，实参 `TDNAME`(16) 触发运行期类型冲突 —— 编译通过、空入参正常、一命中数据就 500 `Type conflict during a function module call`。形参写 `TYPE tdobname`，或直读 `STXL` 簇表。

---

## 4. 语言与文本

- **BAPI 取主数据文本用的是会话语言，不是你代码里的任何变量。**
- **`SET LOCALE LANGUAGE '1'.` / `sy-langu = '1'.` 都改不动它**（实测两法皆无效）。唯一有效入口是**会话级请求头 `sap-language`**（ADT 场景即 `SAP_LANGUAGE_OVERRIDE`），在 ABAP 代码之前生效。
- 典型症状：`BAPI_SALESORDER_CREATEFROMDAT2` 在无头英文会话下返回 `V2 157 Missing text for division 10 language EN`，但人工 ZH 登录跑同一单正常。
- 与 `T100` 消息文本是同一类根因：**SAP 的文本读取语言 = 会话语言，不 fallback**。写消息要双语言，建主数据文本同样要双语言。
- **根治只能靠主数据**：接口若由外系统以英文 RFC 调用，必须请顾问补齐 `TSPAT` 等文本表的 EN，代码绕不过去。

---

## 5. 金额 / 日期 / 字符

- **金额字段**：BAPI 的 `AMT_DOCCUR` 等建议**直接赋字符串常量**（`'1000.00'`），避免 `WRITE ... DECIMALS` 带入千分位。
- **过账日期字段是 `PSTNG_DATE`**，不是 `POSTING_DATE`。
- **借贷符号**：FI BAPI 用「借正贷负」；走封装接口时通常按 BSCHL 查 `TBSL-SHKZG` 反推方向，**金额一律传正数**，记账码给错就报「记账码不存在」。
- **编码补零**：客户/供应商/科目/成本中心/订单号一律 `ALPHA = IN`；**`MATNR` 是反例**——为 `CHAR40` 且主数据存不补零形态，补零反而取不到，要用 `CONVERSION_EXIT_MATN1_INPUT`。
- **13 位毫秒时间戳直接转 `TIMESTAMP` 会得到 `00000000`** —— 毫秒除 1000 得 10 位秒数赋 `CHAR14` 后右对齐左补空格，`CONVERT TIME STAMP` 视为非法而失败且不报错。截前 10 位 + `cl_abap_tstmp=>add( )`；该 FM 的 `TSTMP` 形参要求 `TIMESTAMP` 类型，**直接传字面量抛 `CX_PARAMETER_INVALID_TYPE`**。
- **`CONCATENATE` 拼 `NUMC3` 保留前导零** —— `'009'` 拼成 9 位字符串赋 `DATS(8)` 被截，月末算成 `0001-01-31`。用偏移量 `p_perio+1(2)` 跳过前导零。
- **探针入参为数值型（`DEC`）必须用数值字面量赋值**，赋字符串报 `cannot be interpreted as a number` 并返 500。

---

## 6. 返回消息处理

- `BAPIRET2` 的 `TYPE` 判错用 `type CA 'AE'`（`A` 中止 / `E` 错误），逐行扫，不要只看第一行。
- **标准 FM 常把消息拼成 `/msg1/msg2/…`**，信息量不足。做法：把 `MSGTYP/MSGID/MSGNO/MESSAGE_V1..V4` 原样打出来，再写场景表驱动的诊断报表（`lt_scen = VALUE #( ( … ) ( … ) )` 逐条调用）把模糊报错钉死到根因。
- **`MESSAGE_TEXT_BUILD`**（`msgid`/`msgnr`/`msgv1..4` → `message_text_output`）把 BAPI/BDC 消息统一转文本，比 `MESSAGE ID ... INTO` 稳。
- **`MESSAGE ... WITH` 对整条文本约 70 字符上限** ⇒ 长 BAPI 错误被静默截断成 `Field Reas...`。改用短前缀 + 字符串模板接原文（≤220 字符，对齐 `BAPI_MSG`）。
- **`BAPIACGL09-ITEM_TEXT`(50) / `BAPIACHE09-HEADER_TXT`(25) 静默右截断** —— 拼「前缀+后缀」先把前缀截到 `长度-后缀长度`。
- **BDC 返回消息必须用表工作区字段**：`gt_messtab-msgid / -msgnr / -msgv1..4`，不能写 `sy-msgid`/`sy-msgno`/`sy-msgv*`（在 `LOOP` 里不随行变化）。`BDCMSGCOLL` 字段是 `MSGNR` 不是 `MSGNO`。

---

## 7. 按业务域选型

调之前先确认**这个域有没有统一封装接口**。项目上通常有「封装接口 > 裸 BAPI > BDC」的优先级，照抄老程序的 BAPI 写法经常踩到已废止的口径。

### 7.1 FI 会计凭证

| 需求 | 走什么 | 要点 |
|---|---|---|
| 过账 | 项目封装接口（如 `ZFM_FII001` 一类）优先；无封装才 `BAPI_ACC_DOCUMENT_POST` | 封装接口内部自己 `COMMIT`/`ROLLBACK`，调用方不要再提交/回滚 |
| 模拟导入 | `BAPI_ACC_DOCUMENT_CHECK`（与 POST 参数结构兼容，仅少 `obj_key` 出参） | 不 COMMIT 不 ROLLBACK；成功时凭证号留空 |
| 冲销 | 项目封装接口优先；历史写法 `BAPI_ACC_DOCUMENT_REV_POST`（需 `FI_REFERENCE_CREATE` 拼 `REVERSAL-OBJ_KEY_R`） | 冲销日期/原因在 `BAPIACREV`；判成败看 `MSGTY`，**不要用「MSGTX 非空 = 失败」**（成功时 MSGTX 也非空） |
| 改已过账凭证 | `FI_DOCUMENT_CHANGE`（组 `FACG`，`T_ACCHG` 只填 `FDNAME`+`NEWVAL`） | 抬头不传 `I_BUZEI`，行项目才传；**绝不直接 UPDATE `BSEG`** |
| 票据类行（`UMSKZ = W/X/Y`） | `POSTING_INTERFACE_*`（FB01 批输入） | `I_UPDATE` 值域实测只有 `S/A/L`，**没有「不更新数据库」档位** ⇒ 模拟模式下不要伪造成功，直接回 E |

### 7.2 PP 生产订单

- **批量技术完成 → `BAPI_PRODORD_COMPLETE_TECH`**。不要用 `BAPI_ALM_ORDER_MAINTAIN` + `it_methods`（那是跨对象维护用的，要手工拼 `refnumber`/`objecttype`/`objectkey`）。签名（`fupararef` 实测）：

  ```
  ORDERS             T   BAPI_ORDER_KEY      " 字段 ORDER_NUMBER，可多张
  DETAIL_RETURN      T   BAPI_ORDER_RETURN
  RETURN             E   BAPIRET2
  SCOPE_COMPL_TECH   I   BAPI_ORDER_FUNC_CNTRL-SCOPE_COMPL_TECH
  ```

  判错后 `BAPI_TRANSACTION_COMMIT wait = 'X'`。**该 BAPI 没有「技术完成日期」入参** —— 要指定日期只能成功后另补 `UPDATE aufk SET idat2 = ...` 或走 BAdI（直改标准表要评估审计/权限风险）。
- **取消技术完成 → 没有标准 BAPI**。实测 `SELECT funcname FROM enlfdir WHERE funcname LIKE 'BAPI_PRODORD%'`：34 个函数里有 `COMPLETE_TECH`/`CLOSE`/`SETUSERSTATUS`/`REVOKEUSERSTATUS`/`SET_DELETION_FLAG`，**无 TECO Reset**。`IBAPI_ALM_ORDER_TECO_RESET` 是内部函数，不当正式方案。只能 BDC 调 `CO02`（屏幕 `SAPLCOKO1`，功能码 `=ENTK`，**必须先 `SELECT` 原值再回填，否则必输字段被清空而报错**）。
- **用户状态（财务关闭标识等）→ `BAPI_PRODORD_SETUSERSTATUS` / `_REVOKEUSERSTATUS`**；`STATUS_CHANGE_EXTERN` 也可用（`user_status` 传状态码如 `E0002`、`set_chgkz = 'X'`）。
- **状态判定别逐单查**：一次 `SELECT jest JOIN tj02t ON stat AND spras = sy-langu` 取全，`SORT BY objnr` 后按订单切片遍历。

### 7.3 SD 销售订单

创建/修改的参数细节、增强字段 `EXTENSIONIN` 承载链、参考单据三件套、退货单、计划行数量校验 —— 全部见 `sap-sd-sales-order-bapi`。本节只留一条：**优先用 `SD_SALESDOCUMENT_CREATE/_CHANGE`（标准函数）而非 `BAPI_SALESORDER_*`**，前者参数结构更全（`EXTENSIONIN`、长文本、计划行可控），后者是前者的薄封装。

### 7.4 无标准接口时

BDC 是最后手段，且要接受三个事实：无返回值可判（只能扫 `BDCMSGCOLL`）、必输字段必须先取原值回填、屏幕结构随版本变。改造范式见 `sap-bdc-to-bapi-migration`。

---

## 8. 落库对账口径（写代码前就定）

不要用「返回值」当验收标准，用**表 + 字段 + 期望值**：

| 场景 | 对账点 |
|---|---|
| 过账 | `BKPF`（凭证号/公司/年度）+ `BSEG`（行数、借贷合计、`UMSKZ`、`ZUONR`） |
| 订单创建 | `VBAK`/`VBAP` 行数 + `KWMENG`/`ZMENG` 双通道 + `VBEP` 计划行 + 增强字段（`ZZ*`） |
| 增强字段 | **逐字段读回比对**，只断言「返回 S」会漏掉全部静默失败 |
| 长文本 | `STXH` 头 + `STXL` 簇；清空后再查 `TDTXTLINES` |
| TECO | `AUFK-IDAT2` + `JEST`（`I0045`）+ `AFKO` |

**探针必带基线对照**：同参数先跑一次「已知能成功」的最简用例，基线 S 才说明环境正常；基线同样报错 ⇒ 问题在抬头/科目/期间/字段状态组，**别改新代码**。

**只靠探针跑通不代表结构完整** —— 必须做**键级/字段级对账**，重点核「值恰为空」的字段（初版实测漏建 21 个字段，运行时全看不出来）。

---

## 9. 关联技能

| 技能 | 何时转过去 |
|---|---|
| `sap-sd-sales-order-bapi` | SD 订单：参数全表、增强字段、参考单据、退货单、计划行校验 |
| `sap-bdc-to-bapi-migration` | BDC 录屏改造为标准函数 / BAPI |
| `sap-abap-pitfalls` | 非 BAPI 类的坑（语法、ADT 激活、ALV、F4、DDIC） |
| `sap-abap-project-ops` | 项目级封装接口的具体签名与调用口径 |
| `sap-json-interface-mapping` | 接口 JSON 报文的键名与空值控制 |
