# MCP_ABAP — SAP ABAP ADT MCP 快速部署套件

> 从一个真实 ERP 实施项目里沉淀出来的「开箱即用 + 少踩坑」方案。
> 目标：换个项目、换个人，**5 分钟把 ABAP ADT MCP 跑起来**，并且不重复踩已经踩过的坑。

## 这是什么

| 层次 | 内容 | 位置 |
|---|---|---|
| MCP Server | 上游 `mcp-abap-adt` v7.0.3 的 On-Premise 便携构建，`readonly,high` 下 210 个工具（含写操作） | `portable/` |
| 离线整包 | 含 `node_modules`，免 `npm install`、免外网，解压即用 | `releases/*.zip` |
| 一键安装 | 生成 env（权限 600）+ 合并 `~/.workbuddy/mcp.json`（改动前自动备份） | `portable/install.mjs` |
| 自检 | 验证 server 启动 / 工具数量 / 到 SAP 的端到端 SQL | `portable/verify.mjs` |
| 作业脚本 | 13 个 ADT 直连脚本：回读源码、推源码、推文本元素、激活、查 dump、删探针 | `scripts/` |
| 经验文档 | 写入铁律、踩坑清单、脚本手册、交付检查清单 | `docs/` |
| 技能包 | 10 个可自动加载的 Agent Skill：BAPI **索引**（一个 BAPI 一个文件）、120 条踩坑库、报表推送、DDIC、CUA、TCODE、接口 JSON 等 | `skills/` |
| 示例档案 | 一份真实项目作业总纲的脱敏版：开工前必问的 8 件事 + 填好的样例 | `examples/` |

**适用范围**：On-Premise ECC / S/4HANA + Basic Auth + ADT（S_ADT_RES 权限）+ Node.js >= 22；客户端以 WorkBuddy 为主，stdio 配置同样适用于其他 MCP 客户端。

**不适用范围**：BTP / ABAP Cloud 的 JWT、service key 认证（上游支持，本包未随包验证）；Kerberos SSO（为压缩路径深度已移除可选原生依赖，可 `npm i kerberos` 补回）。

---

## 路线 A：只要 MCP，最快上线（推荐）

1. 下载 `releases/mcp-abap-adt-portable-v7.0.3-20261023.zip`（约 10 MB）。
2. 解压到**固定的短路径**，解压后不要再挪动（配置里写的是绝对路径）：
   - Windows：`C:\tools\mcp-abap-adt\`
   - macOS / Linux：`~/tools/mcp-abap-adt/`
   > Windows 不要放在「下载」或多层中文目录下，会撞 260 字符路径上限；用 7-Zip 解压更稳。
3. 在解压目录里执行：

```bash
node install.mjs --name=dev \
  --url=https://your-s4-host:44300 \
  --client=300 \
  --user=YOUR_USER \
  --pass=YOUR_PASSWORD
```

   也可以直接 `node install.mjs` 交互式填写（密码不回显）。脚本会生成 `env/dev.env` 并把 `adt-dev` 合并进 `~/.workbuddy/mcp.json`。
4. **完全退出并重启** WorkBuddy，到连接器/MCP 管理页对 `adt-dev` 点「信任」。只关窗口不生效。
5. 自检：

```bash
node verify.mjs --name=dev                                  # 只验证 server 与工具集
node verify.mjs --name=dev --sql="SELECT mandt, mtext FROM t000"   # 端到端连通
```

详细参数、排错表见 [docs/01-部署指南.md](docs/01-部署指南.md)，包内原始说明见 `portable/INSTALL.md`。

---

## 路线 B：clone 仓库，连作业脚本一起用

```bash
git clone https://github.com/yanghangmvp/MCP_ABAP.git
cd MCP_ABAP
```

`portable/` 是可读源码（**不含** `node_modules`）。作业脚本通过 `require.resolve` 复用 MCP 包的依赖，需要补上依赖，二选一：

```bash
# 离线：把 zip 里的 mcp-abap-adt/node_modules 解压到 portable/node_modules
# 在线：
cd portable && npm install --omit=dev
```

然后在 `portable/` 里跑一次 `install.mjs --name=dev ...`。生成的 `portable/env/dev.env` 同时供 MCP Server 和 `scripts/` 使用；脚本默认读它，也可用 `SAP_ENV_FILE` 指向别的环境文件。

```bash
# 回读现网源码（改任何既有对象前的第一步）
node scripts/get_source.js PROG ZMY_PROGRAM --out=/tmp/before.abap

# 查数 / 运行程序 / 看短转储
node scripts/adt.js query "SELECT bukrs, butxt FROM t001"
node scripts/adt.js dumps
```

脚本清单与全部环境变量见 [docs/04-作业脚本手册.md](docs/04-作业脚本手册.md)。

---

## 三个必须记住的配置要点

1. **`NO_PROXY=*`（`no_proxy=*`）别删**。本机/公司代理指向 `127.0.0.1` 时，ADT 请求会 `socket hang up`，表象和「连不上 SAP」一样。`install.mjs` 已自动写入。
2. **`--exposition` 里 `high` 与 `low` 互斥**，只能二选一。`readonly,high` = 只读 + 写操作（建对象、改源码、激活），日常开发用这个。
3. **MCP 工具不能指定集团**，连哪个集团由 env 里的 `SAP_CLIENT` 决定。要切集团就配多套：`node install.mjs --name=qas ...`，互不覆盖。

`~/.workbuddy/mcp.json`（**没有点前缀**）手动配置示例：

```json
{
  "mcpServers": {
    "adt-dev": {
      "command": "/absolute/path/to/node",
      "args": [
        "/absolute/path/to/mcp-abap-adt/bin/mcp-abap-adt.js",
        "--env-path=/absolute/path/to/env/dev.env",
        "--exposition=readonly,high"
      ],
      "env": {
        "NODE_TLS_REJECT_UNAUTHORIZED": "0",
        "NO_PROXY": "*",
        "no_proxy": "*"
      },
      "disabled": false
    }
  }
}
```

---

## 经验文档（这才是复用价值所在）

| 文档 | 解决什么问题 |
|---|---|
| [01 · 部署指南](docs/01-部署指南.md) | 多系统/多集团、手动配置、报错对照表、自检排错 |
| [02 · ADT 写入铁律](docs/02-ADT写入铁律.md) | 六条硬约束 + 「返回成功但数据没变」的判定手法 |
| [03 · 踩坑清单](docs/03-踩坑清单.md) | 约 40 条「现象 → 根因 → 解法」，覆盖语法 / DDIC / FM / JSON 接口 / F4 / 探针 |
| [04 · 作业脚本手册](docs/04-作业脚本手册.md) | 13 个脚本的用途、参数、示例与前置条件 |
| [05 · 交付流程与检查清单](docs/05-交付流程与检查清单.md) | 新项目开工到交付的五阶段 checklist |

---

## 技能包（Skills）— 把「怎么做」交给 AI 自动加载

`docs/` 是给人读的，`skills/` 是给 AI 读的：每个目录一个 `SKILL.md`，把「遇到 X 就按 Y 顺序做」写成可自动匹配加载的技能，不需要每次重新解释上下文。

```bash
cp -r skills/sap-* ~/.workbuddy/skills/     # 装进 WorkBuddy
```

| 技能 | 解决什么问题 |
|---|---|
| `sap-abap-bapi-usage` | ★ **BAPI 索引**：一个 BAPI 一个文件（15 个接口册 + 3 个通用册 + 新增模板），SKILL.md 只有三张查找表；新增一个 BAPI = 加一个文件 + 索引加一行 |
| `sap-abap-pitfalls` | ★ 约 120 条「现象 → 根因 → 解法」+ 症状速查表 + 五阶段开工 checklist |
| `sap-abap-prog-push-run` | 报表侧全流程：推送 / 激活 / 无头运行 / 500 定位 / ALV 按钮与 GUI 状态 / 文本元素 / **批导双按钮状态机** / **E2E 探针纪律** / 测试报告 |
| `sap-ddic-object-ops` | 域 / 数据元素 / 表 / 结构 / 表类型的建与改 |
| `sap-json-interface-mapping` | 接口报文键名命中契约、`compress` 丢空值、三形态探针 |
| `sap-cua-gui-status-functions` | 批量登记 GUI 状态功能码，绕开 SE41 |
| `sap-tcode-create` | 批量建事务码 |
| `sap-dump-to-excel-cell` | 从 short dump 反查 Excel 出错单元格 |
| `sap-export-column-mapping` | 导出列 ↔ 源码字段映射（数据对撞，不按标签猜） |
| `sap-s4hana-cloud-adt-connect` | ADT 接 S/4HANA Cloud 公有云的认证链路与写对象坑 |

技能原文写于真实客户项目，发布版已做**客户名 / 内网地址 / 账号 / 传输号 / 人名 / 本地路径**的泛化替换，技术判断与结构未改。对照表见 [skills/README.md](skills/README.md)。

### 什么内容不进技能库

技能只收「**换个项目照样成立**」的东西。系统拓扑、请求号、命名规范、对象清单、项目封装的接口签名 —— 这些是甲方和团队定的，换项目全变，**不进技能库**。

想看一份合格的「项目作业总纲」长什么样，见 [**examples/project-ops-template.md**](examples/project-ops-template.md)：一份真实项目总纲的脱敏版，第 0 节列出了**开工前必须问清的 8 件事**（这部分任何项目都能直接用），1~10 节是填好的样例 —— 抄结构，别抄命名和约定。

---

## 安全与合规

- `portable/env/*.env` 含明文凭据，**已在 `.gitignore` 中排除**，权限 600；不要提交、不要贴进 issue、不要写进交付物。
- 写 SAP 前先查锁、先留 backup；能 dry-run 就 dry-run。生产系统慎用写类工具。
- 本仓库**不含**任何客户业务源码、功能说明书、测试报告或真实连接信息。作业脚本已做路径自适应与对象名泛化。
- 源码基于 MIT 协议的 [`fr0ster/mcp-abap-adt`](https://github.com/fr0ster/mcp-abap-adt) v7.0.3。上游已迭代到 19.x，本包**锁版本不跟随升级**（升级需重跑工具集回归）。溯源与改动清单见 [NOTICE.md](NOTICE.md)、[LICENSE](LICENSE)。

---

## 目录结构

```
MCP_ABAP/
├── README.md                 本文件
├── NOTICE.md                 上游溯源 / 版本 / 改动清单
├── LICENSE                   上游 MIT 许可（保留原版权声明）
├── portable/                 便携包可读源码（bin / dist / install / verify / env 模板 / 文档）
├── releases/                 离线整包 zip（含 node_modules）
├── scripts/                  13 个 ADT 直连作业脚本
├── skills/                   10 个可自动加载的 Agent Skill（BAPI 索引含 18 个分册、120 条踩坑库）
├── examples/                 项目作业总纲示例档案（脱敏，抄结构不抄约定）
└── docs/                     部署、铁律、踩坑、脚本、交付流程
```
