# skills/ · 可自动加载的 Agent Skill

这些技能是**一个人跑完整套 ERP 实施项目后沉淀的操作手册**，按「一个事实只有一份权威版本」组织。

安装：

```bash
cp -r skills/sap-* ~/.workbuddy/skills/
```

装完在对话里提到「推报表」「调 BAPI」「建数据元素」等场景会自动匹配加载。

## 清单

| 技能 | 内容 | 体量 |
|---|---|---|
| [sap-abap-bapi-usage](sap-abap-bapi-usage/SKILL.md) | ★ **调 BAPI 之前先看这个**。索引式：`SKILL.md` 只有三张查找表（按 BAPI 名 / 按任务 / 按症状），正文在 `references/` 一个 BAPI 一个文件 | 131 行 + 18 册 1465 行 |
| [sap-abap-pitfalls](sap-abap-pitfalls/SKILL.md) | ★ **踩坑库**。约 120 条「现象 → 根因 → 解法」+ 症状速查表 + 五阶段开工 checklist | 282 行 + 569 行 |
| [sap-abap-prog-push-run](sap-abap-prog-push-run/SKILL.md) | 报表推送 / 激活 / 无头运行 / 测试报告；500 根因定位；文本元素；CUA 按钮；批导双按钮状态机；E2E 探针纪律 | 1201 行 |
| [sap-ddic-object-ops](sap-ddic-object-ops/SKILL.md) | 域 / 数据元素 / 表 / 结构 / 表类型的建与改；主体语言被强制成 EN、MCP 假锁、建表两段式、E071 传输登记 | 531 行 |
| [sap-export-column-mapping](sap-export-column-mapping/SKILL.md) | 导出 Excel 列 ↔ 源码字段的映射判定（「比值对撞 + 总量二次确认」四步法），不靠列标签猜 | 705 行 |
| [sap-cua-gui-status-functions](sap-cua-gui-status-functions/SKILL.md) | GUI 状态功能码自动登记（`gen_cua.js` 配置驱动），绕开 SE41 人工操作 | 329 行 |
| [sap-s4hana-cloud-adt-connect](sap-s4hana-cloud-adt-connect/SKILL.md) | 接 S/4HANA Cloud 公有云：SSO→reentrance ticket→会话注入；公有云写对象的坑 | 294 行 |
| [sap-json-interface-mapping](sap-json-interface-mapping/SKILL.md) | 接口 JSON 键名命中契约：`name_mappings` 大小写、`compress` 丢空值、三形态探针 | 174 行 |
| [sap-tcode-create](sap-tcode-create/SKILL.md) | 批量建事务码：`RPY_TRANSACTION_INSERT` + `ststc_c_type_report` 常量 | 161 行 |
| [sap-dump-to-excel-cell](sap-dump-to-excel-cell/SKILL.md) | 从 short dump 反查「上传 Excel 哪一行哪一列出错」，给出可操作的 Excel 行列坐标 | 144 行 |

## 结构：BAPI 为什么是「索引 + 一文件一册」

原来 BAPI 经验散在四个技能里，同一个坑（如 `EXTENSIONIN` 标识字段必须 `CHAR1`）在三处各写一遍。
现在按「一个事实只在一处有权威版本」重排：

| 内容类型 | 归属 |
|---|---|
| BAPI / 标准函数的**通用规则**（调用、参数结构、静默失效、语言、对账） | `sap-abap-bapi-usage/references/_*.md` |
| **单个 BAPI** 的签名、坑、对账点 | `sap-abap-bapi-usage/references/<bapi-名>.md` |
| **跨多个 BAPI 的专题**（如 SD 增强字段承载链） | `sap-abap-bapi-usage/references/sd-*.md` |

新增一个 BAPI：

```bash
cp skills/sap-abap-bapi-usage/references/_模板.md \
   skills/sap-abap-bapi-usage/references/bapi-goodsmvt-create.md
# 填完，在 SKILL.md 的三张表里各加一行
```

不改任何已有文件。命名规则：BAPI 全名小写、`_` 转 `-`；专题用 `<域>-<主题>`；通用规则用 `_` 前缀。单文件超 250 行考虑再拆。

## 什么内容不进技能库

判断一个东西该不该独立成技能，看三条：

1. **是不是一次性任务** —— 是的话归位到某份文档，不建技能（例：BDC→BAPI 迁移，改完就结束）
2. **是不是只对某个项目成立** —— 是的话属项目档案，放 `examples/`（例：某项目的命名规范、系统拓扑）
3. **去掉会不会丢知识** —— 不会的话说明它与别处重复，删掉只留一处

三条都不满足（可复用 + 跨项目 + 有独有知识）才独立成技能。

## 与仓库其余部分的分工

| 内容 | 在哪 |
|---|---|
| ADT 写入六铁律（跨项目确定的硬约束） | [`docs/02-ADT写入铁律.md`](../docs/02-ADT写入铁律.md) |
| 脚本用法与环境变量 | [`docs/04-作业脚本手册.md`](../docs/04-作业脚本手册.md) 与 [`scripts/README.md`](../scripts/README.md) |
| 新项目开工到交付的检查清单 | [`docs/05-交付流程与检查清单.md`](../docs/05-交付流程与检查清单.md) |
| 一个真实项目的作业总纲长什么样 | [`examples/project-ops-template.md`](../examples/project-ops-template.md) |

**技能只放「换个项目也成立」的方法与判据。** 环境地址、请求号、甲方命名规范、对象清单属项目私有，一律不进 skills。

## 脱敏

技能原文写于真实客户项目，本目录是脱敏后的发布版：

| 原文 | 替换为 |
|---|---|
| 客户名 | `示例客户` |
| 系统 SID | `DEV` / `DEV-B` |
| 客户端号 | `100` / `300` |
| 内网地址 | `sapdev.example.com` |
| 账号 | `devuser` |
| 传输号 | `DEVK9xxxxx` |
| 本地路径 | `~/ABAP-AI` |
| 人名 / 工号 | `张三` / `G000001` |

对象名保留 `ZMY_*` / `ZBPM_*` 这类形式作为示例锚点——去掉后「参照实现」类引用会失去落点。

生成脚本见仓库维护者本机 `/tmp/sanitize_skills.py`（含 frontmatter 修复与路径适配，重跑幂等）。
