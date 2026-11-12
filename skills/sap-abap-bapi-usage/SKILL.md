---
name: sap-abap-bapi-usage
description: BAPI / 标准函数（FM）调用的**索引入口**（跨项目通用）。本技能只有一张查找表 + 三条元规则，正文全部按业务域拆在 references/ 分册里：00 通用调用规范（CALL FUNCTION 段序、COMMIT/ROLLBACK 责任边界、CHECK 做 dry-run、四条参数结构硬约束、BAPIRET2 处理、落库对账）、10 静默失效清单（16 条「返 S 但值没变」）、20 语言与数据格式（会话语言、ALPHA/MATNR、AMT_DOCCUR、PSTNG_DATE、时间戳、NUMC）、30 FI 会计凭证（过账/模拟/冲销/改凭证/票据 UMSKZ/双币/OBJ_KEY/BSEG 999 行）、40 PP 生产订单（TECO/取消 TECO/用户状态/状态批量判定）、50 SD 销售订单（参数全表/EXTENSIONIN/计划行数量/参考单据/退货单/长文本）、90 BDC 兜底。支持「按场景查」「按 BAPI 名反查」「按症状反查」三条路径。当要新建或改造任何 BAPI、标准函数、批输入调用，或排查「返回 S 但数据没变 / 创建能写修改写不进 / 增强字段静默丢失 / 数量或金额为 0 / 报错文案与真因无关 / 调用后没提交 / 英文会话 Missing text / 双币不一致」时加载本技能，先读 SKILL.md 定位分册，再按需读 references 下的对应文件。
agent_created: true
---

# BAPI / 标准函数索引

**这个技能是一个目录，不是一本书。** 正文在 `references/` 下按业务域分册，本文件只负责把你送到正确的那一册。

## 0. 怎么用（三步，30 秒）

1. 扫 **§2 场景表** 或 **§3 接口名表**，定位到分册
2. 只读那一册（+ 必要时 `00-通用调用规范.md`）
3. 收尾按 `00-通用调用规范.md` §4 做落库对账

**三条元规则**（比任何单条坑都重要，先记住）：

1. **BAPI 返回 `S` 只代表「函数跑完了」，不代表「数据进去了」。** 唯一可信的判据是**落库对账**：按业务键查底表，逐字段比期望值。返回值、消息类型、HTTP 状态都不算。
2. **缺参数不报错，缺「配对参数」才报错。** 结构没传 = 用默认值静默继续；该配对的标识结构没传 = 在特定数据下才炸。「编译过、跑通了」不能证明参数完整。
3. **报错文案经常与真实原因无关。** 拿到 `V1 045` / `V4 219` / `T184`，先看**它前面那条 E**，再查配置表（`TBSL`/`TVEPZ`/`T184`），别直接改代码。

---

## 1. 分册清单

| 分册 | 内容 | 什么时候读 |
|---|---|---|
| [00-通用调用规范](references/00-通用调用规范.md) | 元规则、CALL FUNCTION 段序、提交责任、CHECK/POST、**参数结构四条硬约束**、BAPIRET2、对账口径 | **调任何 BAPI 前必读** |
| [10-静默失效清单](references/10-静默失效清单.md) | 16 条「返 S 但值没变」+ 一分钟排查顺序 | 结果不对但没报错 |
| [20-语言与数据格式](references/20-语言与数据格式.md) | 会话语言、ALPHA/MATNR、金额日期、13 位时间戳、NUMC | 文本读不到 / 值格式不对 |
| [30-FI-会计凭证](references/30-FI-会计凭证.md) | 过账/模拟/冲销/改凭证/票据、双币、OBJ_KEY、BSEG 分片 | 会计凭证相关 |
| [40-PP-生产订单](references/40-PP-生产订单.md) | TECO、取消 TECO（只能 BDC）、用户状态、状态批量判定 | 生产订单相关 |
| [50-SD-销售订单](references/50-SD-销售订单.md) | 参数全表、`EXTENSIONIN` 增强、计划行数量双通道、参考单据三件套、退货单、长文本 | 销售订单相关 |
| [90-BDC兜底](references/90-BDC兜底.md) | 判定顺序、三个必认事实、`CALL TRANSACTION` 要点 | 确认无标准接口时 |

---

## 2. 按场景查

| 我要做什么 | 读哪册 § |
|---|---|
| 新建一个 BAPI 调用，先把骨架搭对 | `00` §1 §2 |
| 判断该用哪个接口（封装/BAPI/BDC） | `00` §1 + 对应域册 §2 |
| 结果返 S 但数据没变 | `10` §0 → 按症状跳 |
| 创建能写、修改写不进 | `00` §2.2 + `50` §4.5 |
| 增强字段（`EXTENSIONIN`）搬不过去 | `00` §2.3 + `50` §4 |
| 数量/金额落成 0 | `10` §2 + `50` §5.1 |
| 报错文案和真因对不上 | `00` §0.3 + `50` §9 |
| 英文/无头会话报 `Missing text` | `20` §1 |
| 金额、日期、编码补零传错 | `20` §2 §3 |
| 过账 / 冲销 / 改已过账凭证 | `30` §2 §3 |
| 票据类（`UMSKZ`）走不通 | `30` §4 + `10` §1 |
| 生产订单 TECO / 取消 TECO / 用户状态 | `40` §1 §2 §3 |
| 销售订单创建/修改/退货单/参考单据 | `50` §2 §10 |
| 清空长文本反而报 E | `10` §3 |
| 确认某接口到底有没有标准实现 | `90` §1（判定顺序） |
| 写完之后怎么验收 | `00` §4 |

## 3. 按接口名反查

| BAPI / FM / 接口 | 分册 | 一句话结论 |
|---|---|---|
| `BAPI_TRANSACTION_COMMIT` / `_ROLLBACK` | `00` §1 | 裸 BAPI 由调用方提交；封装接口内部已提交就别再动 |
| `BAPI_ACC_DOCUMENT_POST` | `30` §2 §3 | 封装接口优先；双币每行两条 `CURRENCYAMOUNT` |
| `BAPI_ACC_DOCUMENT_CHECK` | `30` §2 | 与 POST 参数兼容，仅少 `obj_key`；不提交不回滚 |
| `BAPI_ACC_DOCUMENT_REV_POST` | `30` §2 | 需 `FI_REFERENCE_CREATE` 拼 `OBJ_KEY_R`；判成败看 `MSGTY` 不看 `MSGTX` |
| `FI_DOCUMENT_CHANGE` | `30` §2 §4 | 组 `FACG`，抬头不传 `I_BUZEI`；绝不 UPDATE `BSEG` |
| `FI_REFERENCE_CREATE` | `30` §2 | 只为拼冲销用的 `OBJ_KEY_R` |
| `POSTING_INTERFACE_*` | `30` §2 | `I_UPDATE` 只有 `S/A/L`，没有"不落库"档 |
| `BAPI_PRODORD_COMPLETE_TECH` | `40` §1 | 唯一正确的 TECO 接口；**没有技术完成日期入参** |
| `BAPI_PRODORD_SETUSERSTATUS` / `_REVOKEUSERSTATUS` | `40` §3 | 用户状态官方接口 |
| `STATUS_CHANGE_EXTERN` | `40` §3 | 备选；`set_chgkz = 'X'`，状态码查 `TJ30T` |
| `BAPI_ALM_ORDER_MAINTAIN` | `40` §1 | **别用来做 TECO**，要手拼 `objectkey` |
| 取消 TECO（无 BAPI） | `40` §2 | 只能 BDC `CO02` + `=ENTK`，且先取原值回填 |
| `SD_SALESDOCUMENT_CREATE` / `_CHANGE` | `50` §2 | 优先于 `BAPI_SALESORDER_*`（参数更全） |
| `BAPI_SALESORDER_CREATEFROMDAT2` | `50` §2 | 薄封装；`testrun='X'` 做模拟 |
| `BAPI_SALESORDER_CHANGE` | `50` §2 | `simulation='X'`；标识结构必须 `CHAR1` |
| `SD_SALES_DOCU_MAINTAIN` | `50` §9.3 | 删长文本功能码是 `'003'` 不是 `'005'` |
| `READ_TEXT` | `10` §3 | 形参是 `TDOBNAME(70)`，传 `TDNAME(16)` 必 500 类型冲突 |
| `DELETE_TEXT` | `10` §3 | 文本不存在会 `RAISING NOT_FOUND`；先查 `STXH` |
| `BAPI_USER_EXISTENCE_CHECK` | `10` §3 | **对任何账号都返 0**，校验形同虚设；直查 `USR02` |
| `MESSAGE_TEXT_BUILD` | `00` §3 | 把 `msgid/msgnr/msgv1..4` 转文本，比 `MESSAGE ID INTO` 稳 |
| `CONVERSION_EXIT_MATN1_INPUT` | `20` §2 | `MATNR` 不能 `ALPHA = IN`，用这个 |
| `CALL TRANSACTION ... USING` | `90` §3 | `updmode='S'` 已同步更新，别再补 COMMIT |

## 4. 按症状反查

| 症状 | 去处 |
|---|---|
| 返回 S，值没变 | `10` §1 |
| 创建能写、修改写不进 | `00` §2.2 + `50` §4.5 |
| 增强字段部分字段为空、无报错 | `00` §2.3（`VALUEPART1` 240 分块） |
| 数量和金额同时为 0、计划行为空 | `10` §2 + `50` §5.1（`TVEPZ` 判据） |
| 报 `No change parameter given` | `00` §2.1（缺 `x` 结构） |
| 报 `T184 没有可用的项目类别` 但根因不是项目类别 | `10` §3 + `50` §9.2（两表都要填 `ITM_NUMBER`） |
| 报 `V1 045` 后跟 `V4 219` | `10` §1（`BAPE_*` 漏传 `VBELN` 把单号冲空） |
| 报 `V2 157 Missing text ... language EN` | `20` §1（会话语言，补 `TSPAT` EN 文本） |
| 报 `Inconsistent currency information` | `30` §4（缺 `CURR_TYPE='10'` 行） |
| 报 `Type conflict during a function module call` | `10` §3（`READ_TEXT` 形参类型） |
| 报 `cannot be interpreted as a number` 并 500 | `20` §3（探针入参用数值字面量） |
| 时间戳转成 `00000000` | `20` §3.1（毫秒时间戳要截 10 位） |
| 数据写重 / 提交两次 | `00` §1（提交责任边界） |
| 冲销接口返错但其实成功了 | `30` §2（别用 `MSGTX` 非空判失败） |
| 单据转给无效用户后两边都看不到 | `10` §3（`USER_EXISTENCE_CHECK` 恒真） |

---

## 5. 扩展约定（新增 BAPI 经验往哪放）

**一个事实只在一个地方有权威版本。** 新增时按此落位，别新建并列的"XX BAPI"技能：

| 新内容类型 | 落到哪 |
|---|---|
| 通用调用规则、参数结构、提交语义、对账 | `00-通用调用规范.md` |
| 「返 S 但不对」的新坑 | `10-静默失效清单.md`（并在 §0 排查顺序里挂一行） |
| 语言、编码、日期、金额格式 | `20-语言与数据格式.md` |
| 某业务域的接口用法与参数 | 该域分册（FI=`30` / PP=`40` / SD=`50` / BDC=`90`） |
| 新业务域（MM / PM / QM / CO / HR） | 新建 `60-MM-....md` 这类分册，序号取该域段位 |

**新增后必须同步三处**：本文件 §1 分册清单、§3 接口名表、§4 症状表（若该坑有可辨识症状）。
只加分册不登记，等于没加——下次没人找得到。

### 待建分册（暂无内容，遇到再填）

`60-MM 物料与库存`（`BAPI_GOODSMVT_CREATE`、`BAPI_MATERIAL_SAVEDATA`）、
`70-PM/QM`（`BAPI_ALM_ORDER_MAINTAIN` 的正当用法、检验批）、
`80-CO 成本`（内部订单、成本中心过账）。

---

## 6. 关联技能

| 技能 | 分工 |
|---|---|
| `sap-abap-project-ops` | 项目级封装接口的具体签名与调用口径（如 `ZFM_FII001` 系列）；本技能只讲通用规则 |
| `sap-bdc-to-bapi-migration` | 从 BDC 改造成标准函数的路径与对比方法 |
| `sap-abap-pitfalls` | 非 BAPI 类坑（语法、ADT 激活、ALV、F4、DDIC） |
| `sap-abap-prog-push-run` | 报表侧：推送、激活、无头运行、500 定位 |
| `sap-json-interface-mapping` | 接口 JSON 报文的键名与空值控制 |
