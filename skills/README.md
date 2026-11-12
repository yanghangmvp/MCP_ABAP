# Skills — 可复用的 ABAP 作业技能包

这 12 个技能是**一个人做完整套 ERP 实施项目后沉淀下来的操作手册**：不是教程，是「下次遇到同样情况，照这个顺序做」的判据集合。

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
| [sap-abap-bapi-usage](sap-abap-bapi-usage/SKILL.md) | ★ **调 BAPI 之前看这个**。**索引型技能**：一个 BAPI 一个文件，SKILL.md 只有查找表 | 133 行索引 + 1422 行分册 |
| [sap-abap-project-ops](sap-abap-project-ops/SKILL.md) | ★ **新项目先看这个**。项目作业总纲**模板**：环境与集团切换、速查命令、六铁律、项目硬性约定、接口范式、对象清单骨架、交付脚本约定 | 627 行 |
| [sap-abap-pitfalls](sap-abap-pitfalls/SKILL.md) | ★ **排障先查这个**。约 120 条「现象 → 根因 → 解法」+ 症状速查表 + 开工 checklist | 285 + 570 行 |
| [sap-abap-prog-push-run](sap-abap-prog-push-run/SKILL.md) | 报表推送 / 激活 / 无头运行 / 取回结果 / 出测试报告的全流程；500 根因定位、集团切换、嵌套结果集 | 1119 行 |
| [sap-ddic-object-ops](sap-ddic-object-ops/SKILL.md) | 域 / 数据元素 / 表 / 结构 / 表类型的建与改；MASTERLANG、DD03T 文本、E071 请求登记 | 531 行 |
| [sap-json-interface-mapping](sap-json-interface-mapping/SKILL.md) | 接口报文键名精确命中契约：`name_mappings`、`compress` 丢空值、三形态探针 | 175 行 |
| [sap-bdc-to-bapi-migration](sap-bdc-to-bapi-migration/SKILL.md) | 把 BDC 录屏批导改造成标准函数 / BAPI 的五步法，含「正式导入 + 测试导入」双按钮范式 | 241 行 |
| [sap-cua-gui-status-functions](sap-cua-gui-status-functions/SKILL.md) | 用宿主 API 批量登记 GUI 状态功能码，绕开 SE41 人工操作 | 330 行 |
| [sap-tcode-create](sap-tcode-create/SKILL.md) | 批量建事务码（ADT 无 TCODE 资源，走 `RPY_TRANSACTION_INSERT`） | 160 行 |
| [sap-dump-to-excel-cell](sap-dump-to-excel-cell/SKILL.md) | 从 short dump 反查上传 Excel 是哪一行哪一列出错 | 145 行 |
| [sap-export-column-mapping](sap-export-column-mapping/SKILL.md) | 判定自建导出 Excel 的列 ↔ 源码字段映射（比值对撞法，不按标签猜） | 705 行 |
| [sap-s4hana-cloud-adt-connect](sap-s4hana-cloud-adt-connect/SKILL.md) | 把 ADT 接到 S/4HANA Cloud 公有云：SSO → reentrance ticket → 复用会话；云上写对象的坑 | 295 行 |

## 结构说明：BAPI 为什么是「一个文件一件事」

BAPI 经验会一直长——每个项目都会用到新的 BAPI。所以结构必须满足一个条件：**新增不碰旧的**。

```
sap-abap-bapi-usage/
├── SKILL.md                    133 行，只有查找表（按 BAPI 名 / 按任务 / 按症状）
└── references/
    ├── _通用调用规范.md          ┐
    ├── _静默失效清单.md          ├ 通用三册：任何 BAPI 都适用
    ├── _语言与数据格式.md        ┘
    ├── _模板.md                 新增时照抄
    ├── bapi-acc-document-post.md           过账
    ├── bapi-acc-document-rev-post.md       冲销
    ├── fi-document-change.md               改已过账凭证
    ├── posting-interface-fb01.md           票据类 UMSKZ
    ├── bapi-prodord-complete-tech.md       TECO
    ├── prodord-teco-reset-bdc.md           取消 TECO（只能 BDC）
    ├── bapi-prodord-user-status.md         用户状态
    ├── sd-salesdocument-create.md          建单
    ├── sd-salesdocument-change.md          变更
    ├── sd-extensionin.md                   增强字段
    ├── sd-schedule-line-qty.md             计划行与数量
    ├── sd-long-text.md                     长文本
    ├── sd-reference-doc-return.md          参考单据与退货
    └── bdc-fallback.md                     BDC 兜底
```

**新增一个 BAPI 的成本**：

```bash
cd references && cp _模板.md bapi-goodsmvt-create.md   # 填模板
# 然后 SKILL.md 的接口名表加一行，完事
```

不改任何已有文件，不会冲突，不用判断「该塞进哪个大册」。

**为什么切成这么细**：原来 SD 一个册 737 行，查「计划行为什么数量是 0」要翻半天无关内容；现在直接进 `sd-schedule-line-qty.md`。一个文件只讲一件事，超过 250 行就该再拆。

**文件名规则**：BAPI/FM 全名小写、下划线转连字符（`BAPI_ACC_DOCUMENT_POST` → `bapi-acc-document-post.md`）；跨多个 BAPI 的专题用 `<域>-<主题>`（`sd-extensionin.md`）；通用规则用 `_` 前缀。

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

坑位这种东西，写在别人文档里是知识，写在自己项目里才是资产。每个 BAPI 文件末尾都有「坑」和「对账点」两节，本轮新踩的坑按「现象 → 根因 → 解法」一行补进去即可。`sap-abap-pitfalls/references/casebook.md` 就是这么长到 120 条的。
