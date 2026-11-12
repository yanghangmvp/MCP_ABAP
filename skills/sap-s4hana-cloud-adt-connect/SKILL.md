---
name: sap-s4hana-cloud-adt-connect
description: 把 ADT / ADT-MCP 接到 SAP S/4HANA Cloud Public Edition 的落地流程。含实测跑通的认证链路：浏览器 SSO(SAML→IAS) → reentrance ticket → HTTP 安全会话，票据用 MYSAPSSO2 头打到 -api 域名，会话 Cookie 可复用；UI 域名与 -api 域名分工、用响应特征反推认证配置、Development Tenant(080) 与 Customizing(100) 的选择、core 只实现 basic/jwt 因而需本地注入代理接入。另含公有云写对象的坑：CreateClass 报 500 但对象已建、泄漏入队锁（EU510）、用 deletion/check 读 lockUser、UNLOCK 对错句柄静默返回 200、云上没有经典 REPORT 只能用 IF_OO_ADT_CLASSRUN。当需要连 S/4HANA Cloud 或 Partner Demo/TDD 环境、判断某云租户能否被 ADT 连、往云上建改 ABAP 对象、或排查云环境 401/403/授权/对象被锁时加载。
agent_created: true
---

# S/4HANA Cloud Public Edition ↔ ADT / ADT-MCP 接入

适用：`~/ABAP-AI`（ADT MCP = `@mcp-abap-adt/core` v7.x）。
实例：`my000000.s4hana.sapcloud.cn`（中国区 Partner Demo TDD，SID `XFC`，client `080`）。

## 0. 结论先行（2026-09-30 实测跑通）

公有云租户接 ADT **零租户配置**：不需要 OAuth client、不需要通信安排、不需要 Communication System。
链路是 **浏览器 SSO → reentrance ticket → HTTP 安全会话 Cookie**。

```
浏览器  https://<tenant>/sap/bc/adt/core/http/reentranceticket?redirect-url=http://localhost:<port>/adt/redirect
          ↓ 返回 SAML 2.0 AuthnRequest 表单，浏览器 POST 到 IAS 租户
IAS      https://<ias>.accounts.sapcloud.cn/saml2/idp/sso/<ias>     用户登录
          ↓ SAMLResponse 回 ABAP 的 ACS
ABAP     重定向回 redirect-url?reentrance-ticket=<票据>              ← 一次性、短时效
          ↓
换会话   GET https://<tenant>-api.<...>/sap/bc/adt/...?sap-client=080
         Header: MYSAPSSO2: <票据>
                 x-sap-security-session: Create
          → set-cookie: sap-usercontext=sap-client=080; SAP_SESSIONID_<SID>_<client>=...
          ↓
后续     带会话 Cookie 即可反复调用（实测可复用）
```

**两个必须踩准的点**（来自 SAP 官方 `open-ux-tools` 的 `getReentranceTicketAuthInterceptor`，
其注释原文：*"Reentrance tickets work with API hostnames."*）：

1. 票据放进 **`MYSAPSSO2` 请求头** —— 不是 `X-Reentrance-Ticket`，不是 URL 参数
2. 必须打 **`-api` 域名** —— UI 域名不认

## 1. 域名分两个，别搞混

| 用途 | 域名形态 | 例 |
|---|---|---|
| Fiori / 浏览器登录 / reentranceticket 入口 | `<tenant>.<region>...` | `https://my000000.s4hana.sapcloud.cn` |
| 通信 / ADT / 机器访问 | **`<tenant>-api.<region>...`** | `https://my000000-api.s4hana.sapcloud.cn` |

探测认证必须先打 `-api` 域名。打 UI 域名只会拿到 SAML 登录页（`200` + `text/html` + 3099 字节 + `sap-authenticated: pending`），
会误判成"连不上"。两者 IP 也可能不同（实测 UI `.99` / API `.98`）。

## 2. 用响应特征反推配置

对 `GET <api-host>/sap/bc/adt/discovery?sap-client=080` 逐个变体探测：

| 响应 | 含义 |
|---|---|
| `200` + `text/html` + `sap-authenticated: pending` | 打的是 **UI 域名**，被 SAML SSO 拦成登录页 |
| `401` + `WWW-Authenticate: Basic realm="...[SID/client][alias]"` | 不带 Authorization 头时先挑战 Basic |
| `401` + `WWW-Authenticate: Bearer realm="...[SID/client]", error="invalid_token"` | **Bearer 已启用**，且挑战里**没有 `scope=`** |
| `200` + `application/atomsvc+xml` + `sap-authenticated: true` | **认证通过**，拿到真正的 ADT discovery |

**ADT 端点的 Bearer 挑战不带 `scope=`** ⇒ ADT 不按 OAuth scope 授权，授权靠用户本身
（`SAP_BR_DEVELOPER` + IAM App `F6093_DEV_OBJ_TRAN`）。

### 2.1 认证打法对照表（实测，别再试错）

| 打法 | 结果 |
|---|---|
| `-api` + `MYSAPSSO2: <票据>` | **200 + 真实 ADT XML** ✅ |
| UI 域名 + `MYSAPSSO2: <票据>` | 200 但 `text/html` 登录页 ❌ |
| `-api` + `X-Reentrance-Ticket` / `?sap-reentrance-ticket=` / `?reentrance-ticket=` | 401 ❌ |
| 同一票据第二次使用 | 401 `Anmeldung fehlgeschlagen` —— **票据一次性** ❌ |
| 会话 Cookie only | 200 ✅ |
| 会话 Cookie + `Authorization: Basic <任意>` | **200** ✅ Basic 头被忽略 |
| 会话 Cookie + `Authorization: Bearer <任意>` | **401** ❌ **Bearer 会抢占** |

最后一行是选型的关键：MCP 若用 `SAP_AUTH_TYPE=jwt` 会发 Bearer 而把会话打掉；
必须用 **basic**，或由代理把 `Authorization` 直接删掉。

## 3. MCP 侧：core v7.0.3 接不了会话 Cookie，用本地注入代理

`@mcp-abap-adt/core` v7.0.3 的 `dist/server/BaseMcpServer.js` 明确只实现两种认证：

```js
// Determine auth type from connection config
const authType = connectionConfig.authType || (username && password ? 'basic' : 'jwt');
// Only basic/jwt are wired into the connection path below. SAP_AUTH_TYPE
// also parses certificate/kerberos/saml, but they are NOT implemented here
if (authType !== 'basic' && authType !== 'jwt') throw new Error(...);
```

`SAP_AUTH_TYPE` 会被 `parseAuthType` 解析成 `basic|jwt|saml|certificate|kerberos`，
但 `saml` 走到上面直接被抛错。`SAP_SESSION_COOKIES_B64` 虽在 `@mcp-abap-adt/auth-stores`
里定义并被 `envLoader` 读取，**core 从头到尾没有把它传给连接层**
（core 的 `dist` 里搜不到 `sessionCookies`）。

**解法：本地注入代理，零改代码。**

```
MCP ──http──> 127.0.0.1:9797（代理：删 Authorization、注入 Cookie）──https──> <tenant>-api...
```

实测通过代理 `GET /sap/bc/adt/discovery` → `200 application/atomsvc+xml 456588B auth=true`。

### 3.1 另一个坑：令牌端点硬编码（历史记录，本方案已绕过）

`@mcp-abap-adt/auth-broker` 把令牌地址拼成 `` `${uaaUrl}/oauth/token` ``（XSUAA 格式），
`mcp-auth --credential`（client_credentials）同样硬编码，**配不出 `/sap/bc/sec/oauth2/token`**。
`mcp-sso` 虽支持 `--token-endpoint`，但其 OIDC flow 白名单不含 client_credentials。
→ 云场景不要走 MCP 自带的取令牌逻辑，直接走代理。

## 4. 选对租户

Partner Demo / TDD 套餐（产品号 8012331）与客户侧 3SL 都是同构的两 client：

- **Development Tenant = client 080** ← ABAP 开发环境在这里，**ADT / MCP 只能连它**
- **Customizing Tenant = client 100** ← 只做配置/演示/key user 低代码，**不提供 ABAP Environment 访问**

用 Customizing tenant 连 ADT，症状是建对象报 `S_DEVELOP` / `S_ABPLNGVS` 授权错误（SAP Note 3237141 CAUSE 1）。

租户侧还需：业务角色基于模板 `SAP_BR_DEVELOPER` **生成**（模板只读、不能直接用），
且 **Write Access = Unrestricted**；IAM App `F6093_DEV_OBJ_TRAN` 在角色中激活；
开发对象建在 `ZLOCAL` / `ZCUSTOM_DEVELOPMENT` 的**子包**下。

### 4.1 授权模型：业务用户，不是通信用户

`Maintain Communication Users` 创建通信用户时**没有权限字段**（只有用户名/描述/密码/登录时间），
这是设计如此。ABAP 开发用的是**业务用户**：SAP Note 3237141 与 SAP Help 均表述为
*"The affected **business user** …"* —— 角色挂在开发者本人的用户上。
这也解释了 Eclipse「只要跳网页登录就行」：登录的就是本人。

## 5. 落地路径（本机已实现）

```
[一次性准备]
  租户侧：开发者本人业务用户 → 基于 SAP_BR_DEVELOPER 生成的业务角色，access type 全 Unrestricted
          IAM App F6093_DEV_OBJ_TRAN 激活
  本机：  scripts/s4cloud-sso.js       浏览器 SSO 换会话
          scripts/s4cloud-adt-proxy.js 会话注入代理（9797）

[每天/会话过期后]
  node scripts/s4cloud-sso.js
    → 打印一条 URL，浏览器打开（建议无痕，用带开发权限的用户登录）
    → 脚本抓到票据后立刻建会话，写出 env/.s4cloud-session
  node scripts/s4cloud-adt-proxy.js 9797 &        # 代理常驻，现读会话文件，刷新无需重启
```

`env/s4cloud.env`（MCP 用的配置）：

```ini
SAP_URL=http://127.0.0.1:9797
SAP_CONNECTION_TYPE=http
SAP_CLIENT=080
SAP_LANGUAGE=ZH
SAP_SYSTEM_TYPE=cloud
SAP_AUTH_TYPE=basic          # ★ 不能是 jwt —— Bearer 会抢占会话
SAP_USERNAME=proxy           # 占位，代理会丢弃 Authorization
SAP_PASSWORD=proxy
```

`~/.workbuddy/mcp.json` 里的 `adt-cloud` 条目指向该 env 文件。
**新增 MCP 后需在连接器管理页右上角的"自定义连接器"入口点"信任"才会生效。**

### 5.1 自检方式

以 stdio 拉起 MCP，走 `initialize` → `tools/list` → `tools/call` 即可验证，不必依赖宿主：

```
GetObjectInfo { parent_type: "DEVC/K", parent_name: "ZLOCAL" }
  → success, 119 个子包（/DMO/FLIGHT、Z11221、Z1564…）
GetPackageContents { package_name: "ZLOCAL" }
```

## 6. 云上工具集会被裁剪

`BaseMcpServer` 按 `available_in` 过滤：`program/*` 全套、`SearchSource` 只支持 `onprem,legacy`；
`RuntimeRunProgram`、Profiler/Dump/GatewayErrorLog 只支持 `onprem`。
即「推 REPORT → 运行取数」这条主线在公有云**不成立**（ABAP Cloud 不允许经典 REPORT）。
实测 `--exposition=readonly,high` 下仍列出约 200 个工具，但上面这些调用会失败。

## 6.1 写对象：入队锁（enqueue lock）的坑 —— 2026-09-30 实测

写对象的正常链路（已实测走通）：

```
CreateClass(class_name, package_name)     → 建对象（初态，空骨架）
UpdateClass(class_name, source_code, activate: true)
                                          → lock → 语法检查(checkruns) → PUT 源码 → unlock → activate
```

⚠️ **`UpdateClass` 的 `activate` 默认是 `false`** —— 不显式传 `true` 就只是留在未激活态。

### 暴露模式（exposition）的合法取值

只有 `readonly` / `high` / `low` / `compact` / `system` / `search` 六个分组，**没有 `write`**。
写工具（`CreateClass` / `UpdateClass` / `DeleteClass` / `ActivateClass`）就在 **`readonly,high`** 里，
所以 `--exposition=readonly,high`（本方案默认值）已经能写。`readonly,low` 则给 `LockClassLow` 等原生单步工具。

### 坑 1：CreateClass 报 HTTP 500，但对象其实建出来了

实测 `POST /sap/bc/adt/oo/classes` 返回 **500 text/html**，代理日志 `auth=-`（500 错误页不带 `sap-authenticated` 头，
**不代表没带 Cookie**）。但 `GetObjectInfo` 立刻能查到该对象、描述与包都对 —— 对象**已创建并激活为空骨架**。

**后果**：那一次异常流程泄漏了一个**入队锁**，之后所有写操作（含 `DeleteClass`）都被拒。
**正确反应**：看到 500 先 `GetObjectInfo` 确认对象是否已存在；**不要盲目重试 CreateClass**
（第二次会走到 "already exists" 校验分支，报 400，掩盖真正问题）。

### 坑 2：怎么"看见"这把锁

ADT **没有**列锁的接口，唯一的窗口是删除检查：

```
POST /sap/bc/adt/deletion/check
<body>
<del:checkRequest xmlns:del="http://www.sap.com/adt/deletion" xmlns:adtcore="http://www.sap.com/adt/core">
  <del:object adtcore:uri="/sap/bc/adt/oo/classes/<name>"/>
</del:checkRequest>
```

返回里直接给出答案：

```xml
<del:object del:isDeletable="false" ...>
  <del:lockUser>CB9980000045</del:lockUser>
  <del:message del:type="E"><del:text>已经在编辑 ZZCL_YHTEST_004</del:text></del:message>
```

（`POST /sap/bc/adt/deletion/delete` 同理会返回 `del:isDeleted="false"` + 同样的消息。）

加锁失败本身的报文也很好认：

```xml
<type id="ExceptionResourceNoAccess"/>
<message>使用者 <USER> 当前编辑 <OBJ></message>   <!-- SAP 消息 EU510 -->
```

### 坑 3：ADT 的 UNLOCK 对不匹配的 lockHandle 静默返回 200

实测把句柄换成 `000…0`、甚至完全不传 `lockHandle`，`?_action=UNLOCK` **一律返回 200**。
所以**拿不到真句柄就清不掉锁**，别指望靠猜/靠空 `UnlockClassLow` 解锁 —— 它只是让你以为成功了。

### 坑 4：锁属主 = 自己，也可能锁死自己

两条读取路径可以确认"是谁"：

| 目的 | 请求 |
|---|---|
| 属主 | `GET /sap/bc/adt/oo/classes/<name>` → `adtcore:responsible="CB9980000045"` |
| 创建者 + 传输请求 | `GET /sap/bc/adt/oo/classes/<name>/includes/main/versions` → `author` / `version`（工作台请求号） |

实测 `responsible` 与 `lockUser` **是同一个用户**（就是我们 SSO 登进来的那个），
对象挂在自动生成的工作台请求（如 `XFCK900761`）下 —— 即**锁是我们自己那次失败创建泄漏的**，
不是被别的同事占用。同一用户来自**另一个会话**的锁，ADT 一样拒（`ExceptionResourceNoAccess`）。

### 处理办法（按优先级）

1. **结束持有它的会话**：锁随 SAP 会话结束而释放。会话空闲超时后重跑 `s4cloud-sso.js` 换新会话最干净。
2. **关掉/断开 Eclipse ADT**（若开着同一系统）。
3. **停止轮询**：反复请求会**保活 SAP 会话**，反而把锁一起留住 —— 想等它自然释放就得先停手。
4. 兜底：**换个对象名重建**。

现成脚本（轮询抢锁，抢到就一次性写入 + 激活）：

```
node scripts/s4cloud-write-class.js <类名> scripts/abap/<类名>.abap [--tries 20] [--interval 15]
```

### 附带发现

- **公有云没有经典 REPORT**：控制台程序 = 全局类实现 `IF_OO_ADT_CLASSRUN`（`out->write( … )`），
  包内命名沿 `ZZCL_<负责人>_<序号>` 习惯。
- `checkSourceOrThrow` 会**针对提交的源码**回行列号
  （实测报了 `line 21,43: Method "GET_CLIENT" is unknown`）—— 是很好的"假写入"验证手段。
- 该租户 `cl_abap_context_info=>get_client( )` **不存在**，取集团用 `sy-mandt`。
- 写新类时**不需要**手工指定传输请求，TDD 租户会自动生成一个工作台请求。

## 7. 走过的弯路（别再重犯）

| 曾经的错误结论 | 真相 |
|---|---|
| 需要注册 OAuth client / 配通信安排 / 找 `SAP_COM_0043` | ADT 在公有云**不需要任何通信安排**；`SAP_COM_0043` 与 ADT 无关。SAP 官方：*"no further back-end preparation is necessary"* |
| 抓 Eclipse 预置的 OAuth `client_id` 来复用 | 不存在这样的 client。Eclipse 走的是 reentrance ticket，不是 OAuth |
| 租户入向 OAuth 走 PKCE public client | 那是给 **OData API** 的（且是按 API 而定），与 ADT 通道无关 |
| 票据通过 `X-Reentrance-Ticket` 头或 query 参数传 | 是 **`MYSAPSSO2` 头**，且只认 `-api` 域名 |
| `SAP_AUTH_TYPE=jwt` + 会话 Cookie | Bearer 会抢占，必 401。用 basic，或让代理删掉 Authorization |

**排查顺序建议**：先确认打的是 `-api` 域名 → 再看 `sap-authenticated` 头 → 再确认头名是 `MYSAPSSO2`
→ 最后才怀疑票据本身（一次性、短时效）。

## 8. 环境注意事项

- **代理**：`mcp.json` 里 `NO_PROXY=*` / `no_proxy=*` 让请求绕过本地代理直连。
  `sapcloud.cn` 国内节点直连通常 0.1s 级可达；脚本里统一用
  `env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy curl` 强制直连。
  先确认本地代理端口是否在监听（实测 Clash 7897 可能根本没起）。
- **TLS**：中国区租户用公共 CA 证书，`ssl_verify_result=0`，**不需要** `NODE_TLS_REJECT_UNAUTHORIZED=0`。
- **会话时效**：`SAP_SESSIONID_*` 会因空闲超时失效，失效后重跑 `s4cloud-sso.js` 即可。
