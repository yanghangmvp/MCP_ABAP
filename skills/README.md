# ABAP 作业技能包

这 10 个技能是**一个人跑完整套 SAP ERP 实施项目后沉淀下来的操作手册**，配上仓库里的 MCP（`mcp-abap-adt`）与作业脚本（`scripts/`），可以覆盖「连上系统 → 改对象 → 推源码 → 跑测试 → 出报告」的完整闭环。

面向的是**真实项目里会遇到的坑**，不是官方文档的复述。每条结论都注明来源（哪个程序、哪个事务、什么时候踩的），可以直接拿去用而不是再猜一遍。

## 安装

```bash
mkdir -p ~/.workbuddy/skills
cp -r skills/sap-* ~/.workbuddy/skills/
```

放好即可，Agent 会按 `description` 自动加载。项目级安装则放到 `<项目>/.workbuddy/skills/`。

## 清单

| 技能 | 什么时候用 | 体量 |
|---|---|---|
| [sap-abap-bapi-usage](sap-abap-bapi-usage/SKILL.md) | ★ **调 BAPI 之前看这个**。BAPI **索引**：一个 BAPI 一个文件（15 个接口册 + 3 个通用册 + 新增模板），SKILL.md 只有三张查找表——按 BAPI 名 / 按任务 / 按症状 | 132 行 + 18 分册 |
| [sap-abap-pitfalls](sap-abap-pitfalls/SKILL.md) | ★ **报错先查这个**。约 120 条「现象 → 根因 → 解法」+ 症状速查表 + 开工五阶段 checklist；BAPI 类的坑不在此处（见上一行） | 283 + 569 行 |
| [sap-abap-prog-push-run](sap-abap-prog-push-run/SKILL.md) | 报表侧全流程：推送、激活、无头运行、500 根因定位、ALV 按钮与 GUI 状态、文本元素、批导程序双按钮状态机、E2E 探针纪律、测试报告骨架 | 1201 行 |
| [sap-export-column-mapping](sap-export-column-mapping/SKILL.md) | 客户给的导出列 ↔ 源码字段对不上时，用「数据对撞法」定位 | 705 行 |
| [sap-ddic-object-ops](sap-ddic-object-ops/SKILL.md) | 域、数据元素、表、结构、表类型的建与改 | 531 行 |
| [sap-cua-gui-status-functions](sap-cua-gui-status-functions/SKILL.md) | 批量登记 GUI 状态功能码（绕开 SE41） | 329 行 |
| [sap-s4hana-cloud-adt-connect](sap-s4hana-cloud-adt-connect/SKILL.md) | S/4HANA 公有云的 ADT 连接与限制 | 294 行 |
| [sap-json-interface-mapping](sap-json-interface-mapping/SKILL.md) | 接口报文的键名命中契约、`compress` 丢空值、三形态探针 | 174 行 |
| [sap-tcode-create](sap-tcode-create/SKILL.md) | 建事务码（含参数事务） | 161 行 |
| [sap-dump-to-excel-cell](sap-dump-to-excel-cell/SKILL.md) | 从 dump 定位到具体代码行 | 144 行 |

## BAPI 索引怎么用

`sap-abap-bapi-usage` 是个**索引技能**，正文都在 `references/` 下，一个 BAPI（或一个专题）一个文件：

```
sap-abap-bapi-usage/
├── SKILL.md                        三张查找表（132 行）
└── references/
    ├── _通用调用规范.md              任何 BAPI 都适用
    ├── _静默失效清单.md              16 条「返 S 但值没变」
    ├── _语言与数据格式.md            会话语言 / ALPHA / MATNR / 金额日期
    ├── _模板.md                     新增时照抄，含登记清单
    ├── bapi-acc-document-post.md    FI 过账
    ├── bapi-acc-document-rev-post.md FI 冲销
    ├── fi-document-change.md        改已过账凭证
    ├── posting-interface-fb01.md    POSTING_INTERFACE 兜底
    ├── bapi-prodord-complete-tech.md PP 技术完成
    ├── prodord-teco-reset-bdc.md    取消 TECO（无 BAPI，只能 BDC）
    ├── bapi-prodord-user-status.md  PP 用户状态
    ├── sd-salesdocument-create.md   SD 建单
    ├── sd-salesdocument-change.md   SD 改单
    ├── sd-extensionin.md            SD 增强字段
    ├── sd-schedule-line-qty.md      SD 计划行与数量
    ├── sd-long-text.md              SD 长文本
    ├── sd-reference-doc-return.md   参考单据与退货单
    └── bdc-fallback.md              确认无标准接口后的最后一段
```

查法三条路径，都从 SKILL.md 进：

| 你想的 | 查哪张表 |
|---|---|
| 「我要做过账 / 订单 / TECO」 | 按任务查，给出多文件读序 |
| 「这个 BAPI 怎么用」 | 按 BAPI 名查，一句话结论 + 文件 |
| 「报这个错是什么原因」 | 按症状查，直连文件和小节 |

### 加一个新 BAPI（不改任何已有文件）

```bash
cd skills/sap-abap-bapi-usage/references
cp _模板.md bapi-goodsmvt-create.md
# 填模板 → SKILL.md 接口名表加一行，完事
```

命名规则：BAPI 全名小写、`_` 转 `-`；跨多个 BAPI 的专题用 `<域>-<主题>`；通用规则用 `_` 前缀。单文件超 250 行就再拆。

## 结构原则

**一个事实只有一个权威版本。** 同一件事不在两个技能里各写一遍，只留指路。

| 内容类型 | 归属 |
|---|---|
| BAPI / 标准函数的**通用规则** | `sap-abap-bapi-usage/references/_*.md` |
| 某个 **BAPI 的用法与坑** | `sap-abap-bapi-usage/references/bapi-*.md` |
| **非 BAPI** 类的坑（语法、激活、ALV、DDIC） | `sap-abap-pitfalls` |
| 报表的**推送 / 运行 / 诊断 / 测试** | `sap-abap-prog-push-run` |
| ADT 写入铁律、脚本用法 | 仓库 `docs/02`、`docs/04` |
| **项目私有**：环境、请求号、命名规范、对象清单、封装接口签名 | 各项目自己的总纲，**不进本仓库技能**；写法参照 [`examples/project-ops-template.md`](../examples/project-ops-template.md) |

## 什么内容不进技能库

技能库只收「**换个项目照样成立**」的东西。判断三条：

1. **是不是一次性任务** —— 是，就归位到对应技能或文档，不单独建技能；
2. **是不是只对某个项目成立** —— 是，就只放项目自己的总纲；
3. **去掉会不会丢知识** —— 三条都不满足才独立成一个技能。

据此清掉过的两个技能：`sap-bdc-to-bapi-migration`（一次性任务，内容并入 bapi-usage 与 prog-push-run）、`sap-abap-project-ops`（项目私有，降级为 `examples/` 示例档案）。

## 已做的脱敏与泛化

原始技能是按具体客户项目写的，发布前整体替换了可识别信息，技术判断与结构一条未改：

| 类型 | 原值 | 替换为 |
|---|---|---|
| 客户名 | 实际客户 | `示例客户` |
| 系统 ID | 实际 SID 与第二套环境名 | `DEV` / `DEV-B` |
| 传输号 | 实际请求号 | `DEVK9xxxxx` |
| 主机名 | 内网地址 | `sapdev.example.com` |
| 账号 | 实际用户名 | `devuser` |
| 人名 / 工号 | 实际人员 | `张三` / `G000001` |
| 本地路径 | 实际工作区 | `~/ABAP-AI` |
| 程序 / 对象名 | 客户命名空间对象 | 保留（去掉后「参照实现」类引用会失去落点） |

客户专属的**封装接口签名表**（甲方业务逻辑）已从公开版本移除，只保留在作者本机。
