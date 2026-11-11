# 02 · ADT 写入铁律

> 这一份是「改 SAP 对象」的硬约束。违反任何一条，典型后果是：**接口返回 200，但系统里什么都没变**。
> 全部来自真实实施项目的联调纠错，不依赖具体客户系统。

## 一、六条铁律

### 1. 一律 `proxy: false`（并 `NO_PROXY=*`）

本机或公司代理指向 `127.0.0.1` 时，ADT 请求会被代理拦下，表现为 `socket hang up` / `ECONNRESET` / CSRF 校验失败（DELETE 上必现）。脚本层统一用 `axios.create({ proxy: false })` 并剥掉 `HTTP(S)_PROXY` 环境变量；MCP 配置层写 `NO_PROXY=*`、`no_proxy=*`。

### 2. 可传输对象的 `CORR_NR` 传**父请求号**

请求（request）与任务（task）是两层，E071 记在任务下属属正常。ADT 写入要的是父请求号。**请求号由项目方提供，不自行创建、不臆测编号**；缺号就停手。

- 例外：事务码 `RPY_TRANSACTION_INSERT` 的 `transport_number` 传**任务号**，与 ADT 相反。

### 3. 改可传输对象**不带** `SAP_CLIENT_OVERRIDE`

集团由请求所属集团决定。习惯性加 `SAP_CLIENT_OVERRIDE=300` 去改挂在 100 的请求，会报「对象在任务 xxx 中锁定、未为此客户端指定」，且换请求号/任务号都无效——**唯一解法是换回请求所属集团**。该变量只用于 `$TMP` 探针或跨集团查数。

### 4. HTTP 200 ≠ 激活成功

必须看激活返回里 `final version => active`。`activationExecuted="false"` 且无消息 = 静默无效（常见于用父对象 `PROG/P` 去激活本应单独激活的文本元素 `PROG/PX`）。

### 5. 顺序不可颠倒：`LOCK → PUT → UNLOCK → ACTIVATE`

LOCK handle 绑定 ADT 会话，所有请求必须带**同一个** `sap-adt-connectionid` 和合并后的会话 cookie，否则 PUT 报 `Resource ... is not locked (invalid lock handle)`。cookie jar 要存整段 `name=value`，只存 value 会让 Cookie 头退化成裸值，直接报 CSRF 令牌验证失败。

### 6. 异常只打印 `e.message`

axios 错误对象会把 Basic Auth 凭据、请求头一起打到终端/日志。所有脚本统一 `e.message`，不要 `console.error(e)`。

---

## 二、「返回成功但数据没变」判定手法

| 现象 | 根因 | 判定 / 解法 |
|---|---|---|
| 激活报 200，SE80 里还是旧版本 | 只写了 inactive 版本 / 激活对象类型选错 | 看完整激活报文（脚本 `_act_dbg.js`），确认 `final version => active`；`href="...#start=行,列"` 直接给语法错误坐标 |
| `GetInactiveObjects` 列出 `FUGR/F`、`FUGR/I SAPLxxx` | 函数组主程序的固有形态，不是真未激活 | 以 `ActivateObjects` + `ENLFDIR.ACTIVE='X'` 为准 |
| 403 被 MCP 翻成「locked / CSRF 失败」 | 403 有多种含义，翻译层会误判 | 看原始报文（下一条） |
| `User XXX is currently editing Z...` | 有人真在 SE80 开着对象 | 等对方关闭，别强推 |
| `Object R3TR PROG ... locked in task ... not specified for this client` | **集团不对**，与「谁在编辑」无关 | 换回请求所属集团重试 |
| 文本元素推完前台看不到 / 显示黄色未激活 | 文本元素是独立可激活对象 `PROG/PX`，PUT 只写 inactive | 必须单独调 ACTIVATE；激活父程序 `PROG/P` 不会连带激活 |
| 覆盖式推文本元素后，别人在前台改的文案消失 | 拿陈旧 JSON 直接推，代码 diff 完全看不出 | **推送前先 `read_textelements.js` 回读激活版并逐行人工合并**，见下节 |
| 新建 FM 后调用侧看不到参数 | 只激活了 FM，没激活函数组 | `ActivateFunctionGroup` + `ActivateFunctionModule` 双激活 |
| 新建 DDIC 结构后引用它的表类型失效 | 依赖对象未复活 | `ActivateObjects` 复活表类型 |
| 改了源码但现网和归档对不上 | 有人直接在 SE80 改了生产对象且没回写归档 | 以现网为唯一基线，见下节 |

## 三、改既有对象的第一步：回读现网

**禁止凭记忆或凭本地归档直接打补丁。** 归档只作比对，不作基线。

```bash
# 1) 回读源码（get_source 只取源码，不含文本池）
node scripts/get_source.js PROG ZMY_PROGRAM --out=backup/before.abap

# 2) 回读文本元素激活版（symbols / selections 各一次）
node scripts/read_textelements.js ZMY_PROGRAM symbols   --active > backup/te_symbols.json
node scripts/read_textelements.js ZMY_PROGRAM selections --active > backup/te_selections.json

# 3) diff：换行先规范化（\r\n -> \n、去 BOM），否则整文件全红是假差异
# 4) 以现网为基线打补丁；改完反向覆盖归档
```

> 源码、GUI 状态、文本池都**跨集团**（相关底表无 `MANDT`），在请求所属集团改一次即全集团生效；在别的集团推文本元素报「未为此客户端指定」可直接忽略。

## 四、语言与命名纪律

- 文本一律走文本元素，语言强制 **ZH**（含 DDIC 主语言）；`MESSAGE TEXT-xxx TYPE 'S' WITH n.` 不合法，用辅助 FORM 包一层。
- 新建对象主语言由 `SAP_LANGUAGE` 决定；通过 MCP 创建时该变量不在上游白名单内，必须显式注入子进程环境（`scripts/call-adt-tool.js` 已处理），否则会被强制补 `sap-language=EN`。
- **命名先给方案、请求号由项目方给**：给出「对象类型 + 建议名 + 同前缀已占用清单（TADIR 查重，LIKE 带 `ESCAPE '#'`）+ 编号延续理由」，确认后再建。
- 已挂请求号的既有对象，后续改动复用原请求号。

## 五、并发与会话

- 并行预取（源码 + 文本元素 + TADIR + 请求归属）时，**每个任务必须用独立 ADT 会话**（独立 connectionid + cookie + CSRF）。共用一个 stateful 会话并发会被 403。
- 批量建对象按小分批（每批 ≤ 5 个），长脚本被超时打断会留下半成品与残留锁。

## 六、交付四步与收尾

1. 生成源码 →
2. 推源码（`push_prog_source.js` / `push_fm_source.js`）→
3. 推文本元素（**先回读合并**，且 `PROG/PX` 必须单独激活）→
4. 生成 GUI 状态（按项目的 CUA 模板批量登记；该脚本与客户 GUI 配置强绑定，本仓库未收录）

收尾：本轮自己建的 `$TMP` 测试程序、探针、临时类/表**测完即删**（先 `get_source` 留档 → 再 `delete_prog.js` → 回查 `TADIR`/`TRDIR` 确认清零）。他人创建的对象、仍在工作台使用的 DEMO 一律不动。生产源码里不得出现 `ZTEST_*` 引用。

## 七、提交前自检

- [ ] `proxy: false` / `NO_PROXY=*` 已设置
- [ ] 集团与请求所属集团一致，未误用 `SAP_CLIENT_OVERRIDE`
- [ ] `CORR_NR` 是项目方给的父请求号
- [ ] 现网源码 + 文本元素已回读并 diff
- [ ] 激活返回里看到 `final version => active`
- [ ] 异常只打印 `e.message`，日志里无凭据
- [ ] 测试探针已清理，`TADIR` 无残留
