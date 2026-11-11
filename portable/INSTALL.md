# mcp-abap-adt 绿色版 · 安装说明（WorkBuddy）

> 首次使用请先读本文件（INSTALL.md）。
> 本包版本 **v7.0.3**，打包日期 **2026-10-23**。已剔除开发依赖（tsx / biome / @types）与可选的 kerberos 原生包，
> 并对 node_modules 做了扁平化：**包内最长相对路径由 250 字符降到 130 字符**，Windows 解压不再报「名称太长」。
> 打包后已实测：210 个工具可列出、`GetSqlQuery` 端到端连通、stdio 与 http 两种传输均正常。

免安装、免 `npm install`、不需要外网。解压即用。

---

## 一、前置条件

| 项目 | 要求 | 检查命令 |
|---|---|---|
| Node.js | **>= 22**（脚本会校验） | `node -v` |
| 网络 | 能直连 SAP 的 ICM 端口（HTTP 50000 / HTTPS 44300） | `curl -k https://<主机>:44300/sap/public/ping` |
| SAP 账号 | 有 ADT（S_ADT_RES）权限，通常是开发账号 | — |

> 没有 Node 22：去 https://nodejs.org/ 装 LTS。装完重开终端再执行下面的命令。

---

## 二、三步装好

### 第 1 步：解压到固定目录

解压后**不要再挪动位置**（MCP 配置里写的是绝对路径）。
路径建议**纯英文、无空格、无中文、尽量短**，例如：

- Windows：`C:\tools\mcp-abap-adt\`
- macOS：`~/tools/mcp-abap-adt/`

> **Windows 必读：不要解压到「下载」文件夹或桌面上的多层中文目录。**
> 本包内含 node_modules，即使已扁平化，深层目录 + 长解压前缀仍可能触发 Windows 的 260 字符路径上限
> （报错形如「文件名过长 / 路径过长 / 无法创建文件」）。两种做法任选：
> 1. 解压到短路径，例如 `C:\tools\`（推荐，最省事）；
> 2. 用 7-Zip 解压（右键 → 7-Zip → 提取到此处），7-Zip 不依赖资源管理器的路径限制。
>
> 解压后正确的目录结构是 `C:\tools\mcp-abap-adt\bin\mcp-abap-adt.js`。
> 若你的解压工具多套了一层（变成 `...\mcp-abap-adt-portable\mcp-abap-adt\`），把里层目录整体上移一层即可。

### 第 2 步：填 SAP 连接信息

在本目录打开终端，执行（把值换成你自己的）：

```bash
node install.mjs --name=dev \
                 --url=https://10.0.0.1:44300 \
                 --client=300 \
                 --user=YOUR_USER \
                 --pass=YOUR_PASSWORD
```

也可以直接 `node install.mjs` 按提示交互式填写（密码输入不回显）。

脚本会做两件事：

1. 生成 `env/dev.env`（权限 600，只有你可读）
2. 把条目合并进 `~/.workbuddy/mcp.json`（**改动前自动备份**为 `mcp.json.bak.<时间戳>`）

想接多套系统（dev / qas / prd），换个 `--name` 再跑一次即可，互不覆盖。

### 第 3 步：重启 WorkBuddy 并信任

1. **完全退出** WorkBuddy 应用再打开（只关窗口不生效，配置是启动时读的）
2. 打开「连接器 / MCP」管理页，对新出现的 `adt-dev` 点「**信任**」
3. 新开一个会话，回复顶部出现 `adt-dev connected` 即成功

---

## 三、自检

```bash
# 只验证 MCP 能起来、工具集正确（不需要 SAP 可用）
node verify.mjs --name=dev

# 连到 SAP 真跑一条 SQL，验证端到端
node verify.mjs --name=dev --sql="SELECT mandt, mtext FROM t000"
```

正常输出示例：

```
[OK] server 已启动：mcp-abap-adt 1.0.0
[OK] 工具数量：210（exposition=readonly,high）
[OK] SAP 链路连通
```

---

## 四、手动配置（不想用脚本时）

编辑 `~/.workbuddy/mcp.json`（注意是 `mcp.json`，**没有点前缀**），加入：

```json
{
  "mcpServers": {
    "adt-dev": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": [
        "C:\\tools\\mcp-abap-adt\\bin\\mcp-abap-adt.js",
        "--env-path=C:\\tools\\mcp-abap-adt\\env\\dev.env",
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

`command` 也可以直接写 `node`，但填绝对路径更稳（避免客户端找不到 node）。

---

## 五、七个已知坑（照做能省两小时）

1. **`--exposition` 里 `high` 与 `low` 互斥**，只能二选一。写 `readonly,high,low` 会直接启动失败。
   - `readonly,high` = 只读 + 写操作（建对象、改源码、激活），日常开发用这个
   - `readonly,low` = 只读 + 系统管理类（跑程序、看 dump）
2. **`NO_PROXY=*` 别删**。公司代理指向 127.0.0.1 时，SAP 请求会 `socket hang up`，表象和"连不上 SAP"一样。
3. **改完配置必须重启 WorkBuddy 应用**，且要到连接器管理页点「信任」，否则一直显示未连接。
4. **MCP 工具不能指定集团**，连哪个集团由 env 文件里的 `SAP_CLIENT` 决定。要切集团就配多套 `--name`。
5. **用户名大小写要和 SU01 里一致**（通常大写），否则创建对象会报 `PAK049`。
6. **不要解压到长路径**（Windows）。本包已把最长相对路径压到 130 字符，但若解压前缀过长（下载目录 + 多层中文文件夹）
   仍可能撞上 260 上限。固定放 `C:\tools\` 一劳永逸。
7. **Kerberos SSO 不受支持**。为压缩路径深度，本包移除了可选的 `kerberos` 原生依赖（2.3MB，其嵌套依赖是最长路径的来源）。
   `authType=basic` 完全不受影响；若强行配置 `SAP_AUTH_TYPE=kerberos`，会收到明确报错「requires the optional kerberos package」，
   届时在包目录执行 `npm i kerberos` 即可补回。

---

## 六、目录说明

```
mcp-abap-adt/
├── bin/mcp-abap-adt.js   ← MCP 入口（stdio 传输）
├── dist/                 ← 编译产物
├── node_modules/         ← 依赖（已扁平化打包，无需联网安装）
├── env/dev.env.example   ← 配置样例
├── install.mjs           ← 一键写入 WorkBuddy 配置
├── verify.mjs            ← 自检
└── TOOLS.md              ← 暴露的 ADT 工具名列表
```

其他命令：

```bash
node install.mjs --uninstall --name=dev   # 从 WorkBuddy 移除该条目
node install.mjs --env-only --name=dev    # 只生成 env，不碰 mcp.json
```

---

## 七、能力边界

- 这是 **On-Premise S/4HANA（basic auth）** 配置。ABAP Cloud / BTP 的 JWT、service key 方式见上游文档，本包未配置。
- 默认 `readonly,high` 暴露 210 个 ADT 工具：读源码、查表（`GetSqlQuery`）、建/改/激活 ABAP 对象、查包内容、搜索对象等。
- 源码基于 MIT 协议的开源项目 [`mcp-abap-adt`](https://github.com/fr0ster/mcp-abap-adt)，本包由 v7.0.3 构建，打包日期 2026-10-23。
- 本包为 On-Premise 场景定制，只验证过 basic auth；ABAP Cloud / BTP 未随包验证。
- 上游已迭代至更高主版本（19.x），本包**不随之升级**；如需升级须重跑工具集回归。
