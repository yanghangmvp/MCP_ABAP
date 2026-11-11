# NOTICE — 溯源、版本与改动清单

## 上游

- 项目：[`fr0ster/mcp-abap-adt`](https://github.com/fr0ster/mcp-abap-adt)
- 作者：Oleksii Kyslytsia
- 许可：**MIT**，原始版权声明完整保留在 [LICENSE](LICENSE)
- 本包所基于的版本：**`@mcp-abap-adt/core` 7.0.3**（On-Premise / ABAP Cloud 双支持的上游发行版）
- 便携包打包日期：2026-10-23

## 本仓库做了什么

在上游 v7.0.3 构建产物之上，为一个 On-Premise ERP 实施场景做了「可分发 + 可自检」的工程化。改动集中在部署层，**未修改上游 ADT 协议实现**：

| 改动 | 原因 |
|---|---|
| 剔除开发依赖（tsx / biome / @types）与可选 `kerberos` 原生包 | 缩小体积；Kerberos 的嵌套依赖是最长相对路径的来源 |
| `node_modules` 扁平化，最长相对路径由 250 → 130 字符 | Windows 解压不再报「名称太长」；建议解压到 `C:\tools\` |
| 新增 `bin/mcp-abap-adt.js`（stdio 入口）、`package.json`（运行期依赖清单） | 免构建、免 `npm install` |
| 新增 `install.mjs` | 生成 env（600 权限）+ 合并 `~/.workbuddy/mcp.json` 并自动备份，支持多系统 `--name`、交互式填写、`--uninstall`、`--env-only` |
| 新增 `verify.mjs` | 离线验证 server 启动与工具数量，`--sql` 做端到端链路验证 |
| 新增 `env/dev.env.example`、`INSTALL.md`、`TOOLS.md` | 配置模板、安装说明、210 个工具清单 |
| 新增 `scripts/` 13 个 ADT 直连脚本 | 补 MCP 工具的能力缺口（指定集团、跑 SQL、看 ST22、文本元素回读、批量激活等） |
| 新增 `docs/` | 把实施过程中踩过的坑与作业约定沉淀成可复用的清单 |

打包后实测：210 个工具可列出、`GetSqlQuery` 端到端连通、stdio 与 http 两种传输均正常。

## 版本策略

**锁定 7.0.3，不跟随上游 19.x 升级。** 理由是这批作业脚本与现场的 ADT 行为（CSRF、锁、激活报文、文本元素资源）做过成体系的联调验证；升级主版本会一并改变工具名、入参与内部会话行为，必须重跑工具集回归后才能切。需要升级时，按下列顺序：

1. 在新分支上替换 `portable/dist` 与依赖清单；
2. 用 `verify.mjs` 跑工具集与端到端连通；
3. 逐脚本回归 `scripts/` 里的 ADT 直连流程（尤其 LOCK / PUT / UNLOCK / ACTIVATE）；
4. 更新 `TOOLS.md` 与本文档的版本记录。

## 许可说明

上游代码与其编译产物适用 MIT（见 LICENSE）。本仓库新增的 `install.mjs`、`verify.mjs`、`scripts/`、`docs/` 及配置模板同样按 MIT 许可提供。`releases/` 中的 zip 内含第三方 npm 依赖，各依赖自带其许可文件。

## 不包含什么

客户业务源码、功能说明书（FS）、测试报告、真实主机名/IP、账号、密码、传输请求号，以及任何项目专属对象名。作业脚本里的示例对象名统一为 `ZMY_*` / `ZFG_MY` 占位。
