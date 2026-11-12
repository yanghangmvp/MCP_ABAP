---
name: sap-abap-bapi-usage
description: BAPI / 标准函数（FM）的**索引入口**（跨项目通用）。一个 BAPI 一个文件，放在 references/ 下，本 SKILL.md 只做三件事：告诉你该读哪个文件、告诉你报错该查哪、告诉你新 BAPI 怎么加。现有分册覆盖：`BAPI_ACC_DOCUMENT_POST`（过账·双币·BSEG 999 行）、`BAPI_ACC_DOCUMENT_REV_POST`（冲销）、`FI_DOCUMENT_CHANGE`（改已过账）、`POSTING_INTERFACE_*`（票据 UMSKZ）、`BAPI_PRODORD_COMPLETE_TECH`（TECO）、取消 TECO（只能 BDC CO02）、`BAPI_PRODORD_SETUSERSTATUS`（用户状态）、`SD_SALESDOCUMENT_CREATE` / `_CHANGE`（SD 订单创建·变更）、`EXTENSIONIN`（增强字段承载链）、`BAPISCHDL` + `TVEPZ`（计划行与数量双通道）、`BAPISDTEXT`（长文本）、参考单据与退货单、BDC 兜底；通用三册：调用规范与参数四条硬约束、16 条静默失效清单、语言与数据格式。当要新建或改造任何 BAPI / 标准函数 / 批输入调用，或排查「返回 S 但数据没变 / 创建能写修改写不进 / 增强字段静默丢失 / 数量或金额为 0 / 报错文案与真因无关 / 调用后没提交 / 英文会话 Missing text / 双币不一致 / 时间戳变 00000000」时加载本技能，先读本文件定位文件，再读 references 下对应那份。
agent_created: true
---

# BAPI 索引

**一个 BAPI 一个文件。** 本文件只负责路由——不写具体用法，用法都在 `references/` 里。

## 0. 怎么用（30 秒）

1. §2 按 BAPI 名查，或 §3 按任务查，定位文件
2. 只读那一份（通用规则第一次用时读 §5 那三本）
3. 收尾按对应文件的「对账点」验收

**三条元规则**（先记住，省一半时间）：

1. **返回 `S` 只代表「函数跑完了」，不代表「数据进去了」。** 唯一可信判据是**落库对账**：表 + 字段 + 期望值。
2. **缺参数不报错，缺「配对参数」才报错。** 编译过、跑通了，不能证明参数完整。
3. **报错文案常与真因无关。** 拿到 `V1 045` / `V4 219` / `T184`，先看**它前面那条 E**，再查配置表，别直接改代码。

---

## 1. 通用三册（任何 BAPI 都适用）

| 文件 | 内容 |
|---|---|
| [`_通用调用规范.md`](references/_通用调用规范.md) | `CALL FUNCTION` 段序、提交责任边界、CHECK/POST、**参数结构四条硬约束**、BAPIRET2、对账口径 |
| [`_静默失效清单.md`](references/_静默失效清单.md) | 16 条「返 S 但值没变」+ 一分钟排查顺序 |
| [`_语言与数据格式.md`](references/_语言与数据格式.md) | 会话语言、`ALPHA`/`MATNR`、金额日期、13 位时间戳、`NUMC` |

## 2. 按 BAPI 名查

| BAPI / FM | 文件 | 一句话 |
|---|---|---|
| `BAPI_ACC_DOCUMENT_POST` | [bapi-acc-document-post](references/bapi-acc-document-post.md) | 过账；双币每行两条 `CURRENCYAMOUNT`；分片 989+1 |
| `BAPI_ACC_DOCUMENT_CHECK` | 同上 | 模拟；与 POST 参数兼容，不提交不回滚 |
| `BAPI_ACC_DOCUMENT_REV_POST` | [bapi-acc-document-rev-post](references/bapi-acc-document-rev-post.md) | 冲销；需 `FI_REFERENCE_CREATE` 拼 `OBJ_KEY_R`；判成败看 `MSGTY` |
| `FI_DOCUMENT_CHANGE` | [fi-document-change](references/fi-document-change.md) | 改已过账；组 `FACG`，抬头不传 `I_BUZEI` |
| `POSTING_INTERFACE_*` | [posting-interface-fb01](references/posting-interface-fb01.md) | 票据类 `UMSKZ` 唯一通道；`I_UPDATE` 无「不落库」档 |
| `BAPI_PRODORD_COMPLETE_TECH` | [bapi-prodord-complete-tech](references/bapi-prodord-complete-tech.md) | TECO 唯一正解；**没有技术完成日期入参** |
| 取消 TECO（无 BAPI） | [prodord-teco-reset-bdc](references/prodord-teco-reset-bdc.md) | 只能 BDC `CO02` + `=ENTK`，先取原值回填 |
| `BAPI_PRODORD_SETUSERSTATUS` | [bapi-prodord-user-status](references/bapi-prodord-user-status.md) | 用户状态；状态码查 `TJ30T`，别照抄别项目 |
| `STATUS_CHANGE_EXTERN` | 同上 | 备选；`set_chgkz = 'X'` |
| `BAPI_ALM_ORDER_MAINTAIN` | — | **别用来做 TECO**，见 `bapi-prodord-complete-tech.md` §1 |
| `SD_SALESDOCUMENT_CREATE` | [sd-salesdocument-create](references/sd-salesdocument-create.md) | 建单；条件/文本/伙伴参数 |
| `BAPI_SALESORDER_CREATEFROMDAT2` | 同上 | 薄封装；`testrun='X'` 模拟 |
| `SD_SALESDOCUMENT_CHANGE` | [sd-salesdocument-change](references/sd-salesdocument-change.md) | 变更；增改删判定、清空 `&&`、报错速查 |
| `BAPI_SALESORDER_CHANGE` | 同上 | `simulation='X'`；标识结构必须 `CHAR1` |
| `BAPIPAREX_T` / `EXTENSIONIN` | [sd-extensionin](references/sd-extensionin.md) | 增强字段四段承载链；`VALUEPART1` 240 分块 |
| `BAPISCHDL` / `TVEPZ` | [sd-schedule-line-qty](references/sd-schedule-line-qty.md) | 计划行与数量双通道；数量只认 `TARGET_QTY` |
| `BAPISDTEXT` | [sd-long-text](references/sd-long-text.md) | 长文本；删除功能码 `'003'` 不是 `'005'` |
| 参考单据 / 退货单 | [sd-reference-doc-return](references/sd-reference-doc-return.md) | 三件套缺 `REF_DOC_CA` 必报 `V2 068` |
| `CALL TRANSACTION ... USING` | [bdc-fallback](references/bdc-fallback.md) | BDC 兜底；`updmode='S'` 别再补 COMMIT |
| `BAPI_USER_EXISTENCE_CHECK` | [`_静默失效清单.md`](references/_静默失效清单.md) §3 | **对任何账号都返 0**，校验形同虚设 |
| `READ_TEXT` / `DELETE_TEXT` | 同上 §3 | 形参 `TDOBNAME(70)`；文本不存在 `RAISING NOT_FOUND` |
| `MESSAGE_TEXT_BUILD` | [`_通用调用规范.md`](references/_通用调用规范.md) §3 | 消息转文本，比 `MESSAGE ID INTO` 稳 |
| `CONVERSION_EXIT_MATN1_INPUT` | [`_语言与数据格式.md`](references/_语言与数据格式.md) §2 | `MATNR` 不能 `ALPHA = IN` |

## 3. 按任务查（可能要多读几份，按顺序）

| 我要做 | 读顺序 |
|---|---|
| 过一张会计凭证 | `bapi-acc-document-post` → 需要模拟再读同文件的模拟节 |
| 冲销一张凭证 | `bapi-acc-document-rev-post` |
| 改已过账凭证的文本/分配 | `fi-document-change` |
| 带票据（UMSKZ）过账 | `posting-interface-fb01`（整张走，别混 BAPI） |
| 批量技术完成生产订单 | `bapi-prodord-complete-tech` |
| 取消技术完成 | `prodord-teco-reset-bdc` |
| 置/撤销生产订单用户状态 | `bapi-prodord-user-status` |
| 新建销售订单 | `sd-salesdocument-create` →（要增强字段）`sd-extensionin` →（数量为 0 或计划行）`sd-schedule-line-qty` →（要文本）`sd-long-text` |
| 修改销售订单 | `sd-salesdocument-change` → 同上按需 |
| 带参考单据 / 退货单 | `sd-reference-doc-return` → `sd-salesdocument-create` |
| 确认某功能到底有没有标准接口 | `bdc-fallback` §1 的判定顺序 |
| 新写一个 BAPI 调用 | `_通用调用规范` → 对应 BAPI 文件 → 复制 `_模板.md` 沉淀 |
| 写完怎么验收 | 各文件末尾「对账点」+ `_通用调用规范` §4 |

## 4. 按症状查

| 症状 | 去哪 |
|---|---|
| 返回 S，值没变 | `_静默失效清单.md` §0 起 |
| 创建能写、修改写不进 | `_通用调用规范.md` §2.2 + `sd-extensionin.md` §4.5 |
| 增强字段部分为空、无报错 | `_通用调用规范.md` §2.3（`VALUEPART1` 240 分块） |
| 数量金额同时为 0、计划行为空 | `sd-schedule-line-qty.md` §5.1（`TVEPZ` 判据） |
| 报 `No change parameter given` | `_通用调用规范.md` §2.1（缺 `x` 结构） |
| 报 `T184 没有可用的项目类别` 但根因不是项目类别 | `sd-salesdocument-change.md` §9.2（两表都要填 `ITM_NUMBER`） |
| 报 `V1 045` 后跟 `V4 219` | `sd-extensionin.md` §4.2（`BAPE_*` 漏传 `VBELN` 冲空单号） |
| 报 `V2 157 Missing text ... language EN` | `_语言与数据格式.md` §1（会话语言，补 `TSPAT` EN） |
| 报 `Inconsistent currency information` | `bapi-acc-document-post.md` §2（缺 `CURR_TYPE='10'` 行） |
| 报 `Type conflict during a function module call` | `_静默失效清单.md` §3（`READ_TEXT` 形参类型） |
| 报 `cannot be interpreted as a number` 并 500 | `_语言与数据格式.md` §3（探针入参用数值字面量） |
| 时间戳转成 `00000000` | `_语言与数据格式.md` §3.1 |
| 数据写重 / 提交两次 | `_通用调用规范.md` §1（提交责任边界） |
| 冲销返错但其实成功了 | `bapi-acc-document-rev-post.md` §2（别用 `MSGTX` 判失败） |
| 单据转给无效用户后两边都看不到 | `_静默失效清单.md` §3 |
| 清空长文本反而报 E | `sd-long-text.md` §9.3 |

---

## 5. 新增一个 BAPI 怎么做（三步，不碰已有文件）

**这是本结构存在的理由**：以后每多一个 BAPI，只新增一个文件 + 索引加一行，**不改任何已有内容**。

```bash
cd references
cp _模板.md bapi-xxx-yyy.md       # 文件名 = BAPI 全名小写、下划线转连字符
```

1. **填模板**：用途 / 先决 / 选型 / 签名 / 必填与配对 / 坑 / 对账点。
2. **本文件加两行**：§2 接口名表一行，§3 任务表一行（若有明确任务场景）；有可辨识报错的再加 §4 一行。
3. **相关文件的「同域」补一句**（可选，方便从别的文件过来）。

命名规则：

| 类型 | 文件名 | 例 |
|---|---|---|
| 有明确 BAPI / FM | 全名小写、`_`→`-` | `BAPI_GOODSMVT_CREATE` → `bapi-goodsmvt-create.md`（待建） |
| 专题（跨多个 BAPI） | `<域>-<主题>` | `sd-extensionin.md`、`prodord-teco-reset-bdc.md` |
| 通用规则 | `_` 前缀 | `_通用调用规范.md` |

**一个文件只讲一件事。** 超过 250 行就该考虑拆（`sd-extensionin` 就是把 737 行的 SD 大册里单独切出来的）。

## 6. 关联技能

| 技能 | 分工 |
|---|---|
| `sap-abap-project-ops` | 项目级封装接口的具体签名（`ZFM_FII*` 等）；本技能只讲通用与标准接口 |
| `sap-bdc-to-bapi-migration` | 从 BDC 改造成标准函数的路径 |
| `sap-abap-pitfalls` | 非 BAPI 类坑（语法、ADT 激活、ALV、F4、DDIC） |
| `sap-abap-prog-push-run` | 报表侧：推送、激活、无头运行、500 定位 |
| `sap-json-interface-mapping` | 接口 JSON 报文的键名与空值控制 |
