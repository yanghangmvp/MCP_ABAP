# Skills — 可复用的 ABAP 作业技能包

这 13 个技能是**一个人做完整套 ERP 实施项目后沉淀下来的操作手册**：不是教程，是「下次遇到同样情况，照这个顺序做」的判据集合。

每个技能是一个目录，里面一个 `SKILL.md`（YAML frontmatter + 正文），部分带 `references/` 明细。

## 怎么用

**方式一：装进 AI 客户端（推荐）**

支持 Agent Skills 协议的客户端（Claude Code / WorkBuddy 等）识别 `~/.workbuddy/skills/<name>/SKILL.md` 这类结构。把需要的目录拷进去即可，技能会按 `description` 自动匹配加载：

```bash
mkdir -p ~/.workbuddy/skills
cp -r skills/sap-* ~/.workbuddy/skills/
```

**方式二：当文档读**

`SKILL.md` 就是普通 Markdown。新项目开工前把 `sap-abap-project-ops` 和 `sap-abap-pitfalls` 各通读一遍，比事后 debug 划算得多。

## 技能清单

| 技能 | 什么时候用 | 体量 |
|---|---|---|
| [sap-abap-bapi-usage](sap-abap-bapi-usage/SKILL.md) | ★ **调 BAPI 之前看这个**。BAPI / 标准函数调用总纲：调用规范、四条参数结构硬约束、16 条静默失效清单、会话语言、按业务域选型、落库对账口径 | 194 行 |
| [sap-abap-project-ops](sap-abap-project-ops/SKILL.md) | ★ **新项目先看这个**。项目作业总纲**模板**：环境与集团切换、速查命令、六铁律、项目硬性约定、接口范式、对象清单骨架、交付脚本约定 | 627 行 |
| [sap-abap-pitfalls](sap-abap-pitfalls/SKILL.md) | ★ **排障先查这个**。约 120 条「现象 → 根因 → 解法」+ 症状速查表 + 开工 checklist | 285 + 570 行 |
| [sap-abap-prog-push-run](sap-abap-prog-push-run/SKILL.md) | 报表推送 / 激活 / 无头运行 / 取回结果 / 出测试报告的全流程；500 根因定位、集团切换、嵌套结果集 | 1119 行 |
| [sap-ddic-object-ops](sap-ddic-object-ops/SKILL.md) | 域 / 数据元素 / 表 / 结构 / 表类型的建与改；MASTERLANG、DD03T 文本、E071 请求登记 | 531 行 |
| [sap-json-interface-mapping](sap-json-interface-mapping/SKILL.md) | 接口报文键名精确命中契约：`name_mappings`、`compress` 丢空值、三形态探针 | 175 行 |
| [sap-sd-sales-order-bapi](sap-sd-sales-order-bapi/SKILL.md) | SD 订单参数全表：增强字段 `EXTENSIONIN`、参考单据三件套、退货单、计划行数量双通道 | 741 行 |
| [sap-bdc-to-bapi-migration](sap-bdc-to-bapi-migration/SKILL.md) | 把 BDC 录屏批导改造成标准函数 / BAPI 的五步法，含「正式导入 + 测试导入」双按钮范式 | 241 行 |
| [sap-cua-gui-status-functions](sap-cua-gui-status-functions/SKILL.md) | 用宿主 API 批量登记 GUI 状态功能码，绕开 SE41 人工操作 | 330 行 |
| [sap-tcode-create](sap-tcode-create/SKILL.md) | 批量建事务码（ADT 无 TCODE 资源，走 `RPY_TRANSACTION_INSERT`） | 160 行 |
| [sap-dump-to-excel-cell](sap-dump-to-excel-cell/SKILL.md) | 从 short dump 反查上传 Excel 是哪一行哪一列出错 | 145 行 |
| [sap-export-column-mapping](sap-export-column-mapping/SKILL.md) | 判定自建导出 Excel 的列 ↔ 源码字段映射（比值对撞法，不按标签猜） | 705 行 |
| [sap-s4hana-cloud-adt-connect](sap-s4hana-cloud-adt-connect/SKILL.md) | 把 ADT 接到 S/4HANA Cloud 公有云：SSO → reentrance ticket → 复用会话；云上写对象的坑 | 295 行 |

## 结构说明：BAPI 经验为什么单独成册

原来 BAPI 经验散在四处：`pitfalls` 的「返 S 但值没变」、`prog-push-run` 的会话语言与生产订单 BAPI 选型、`project-ops` 的接口落位约定、`sd-sales-order-bapi` 的订单参数。同一个坑（如 `EXTENSIONIN` 标识字段的数据元素必须是 `CHAR1`）在三个文件里各写了一遍——改一处漏两处。

现在按「**一个事实只在一个地方有权威版本**」重排：

| 内容类型 | 归属 |
|---|---|
| BAPI / 标准函数的**通用规则**（调用规范、参数结构约束、静默失效、语言、对账） | `sap-abap-bapi-usage`（唯一权威） |
| 某一域的**参数全表**（SD 订单：`BAPISDITM` / `BAPISCHDL` / 长文本 / 伙伴 / 条件） | `sap-sd-sales-order-bapi` |
| **项目封装接口**的签名与调用口径（过账 / 冲销 / 拆分） | `sap-abap-project-ops` §4 |
| BDC **改造路径**（不是 BAPI 用法） | `sap-bdc-to-bapi-migration` |

其余技能里原来的 BAPI 段落已删除，只留一行指路。查一个坑只有一条路径，不会读到过期版本。

## 已做的脱敏与泛化

技能原文是在**真实客户项目**里写的，发布版做了如下替换（结构与技术判断一句未改）：

| 类别 | 原文 | 发布版 |
|---|---|---|
| 客户 / 项目名 | 实际公司名 | `示例客户` |
| 系统地址 | 内网 IP + 端口 | `sapdev.example.com:44300` |
| 系统 ID | 实际 SID 与第二套环境名 | `DEV` / `DEV-B` |
| 账号 | 实际用户名 | `devuser` / `DEVUSER` |
| 传输请求号 | 实际请求 / 任务号 | `DEVK9xxxxx` |
| 人员姓名 | 真实姓名、工号 | `张三` / `G000001` |
| 本地路径 | 开发者绝对路径 | `~/ABAP-AI` |
| 云租户 | 实际子账号域名 | `my000000.s4hana.sapcloud.cn` |

**仍保留**：Z 命名空间下的开发对象名（`ZBPM_ISP0xx`、`ZCBS_ISC0xx`、`ZFID001` 等）。它们是示例引用的锚点——去掉后「参照实现 `ZBPM_ISP016`」这类话就没有落点了；单独一个 Z 对象名不构成可识别的客户信息。若你介意，整体替换成 `ZDEMO_*` 也不影响阅读。

## 补一条

坑位这种东西，写在别人文档里是知识，写在自己项目里才是资产。每个技能末尾都留了回流入口：本轮新踩的坑，按「现象 + 根因 + 解法」一句话补进对应分节即可。`sap-abap-pitfalls/references/casebook.md` 就是这么长到 120 条的。
