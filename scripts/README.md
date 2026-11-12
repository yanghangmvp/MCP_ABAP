# scripts/ · ADT 直连作业脚本

不依赖 MCP Server，直接走 ADT REST 接口。独立会话、可指定集团，补 MCP 工具「不能带 client」的短板。

## 前置

```bash
# 1. 连接配置（从模板复制后填真实值，不要提交）
cp portable/env/dev.env.example portable/env/dev.env && chmod 600 portable/env/dev.env

# 2. 依赖（releases/ 的整包已含 node_modules，源码部署需装一次）
cd portable && npm install --omit=dev && cd ..

# 3. 冒烟
node scripts/adt.js query "SELECT bukrs, butxt FROM t001"
```

所有脚本都认这三个环境变量：

| 变量 | 作用 |
|---|---|
| `SAP_ENV_FILE` | 指定另一份连接配置（切环境/切集团最常用） |
| `SAP_CLIENT_OVERRIDE` | 临时改集团号。**写对象时不要带**，见 `docs/02` 铁律 |
| `SAP_LANGUAGE_OVERRIDE` | 改会话语言，验证文本元素时必须 `zh` |

## 收录的 17 个

### 取数与运行

| 脚本 | 用途 |
|---|---|
| `adt.js` | 主力工具。`query` / `table` / `run` / `dumps` / `dump` 五个子命令 |
| `get_source.js` | 读源码：`PROG` / `INCL` / `FM` / `CLAS` / `TABL` / `STRU` / `DTEL` |
| `call-adt-tool.js` | 直接调单个 MCP 工具名，用来绕过 MCP 封装做底层验证 |

### 推送与激活

| 脚本 | 用途 |
|---|---|
| `push_prog_source.js` | 推 REPORT 源码（`SRC_FILE` / `PROGS` 批量） |
| `push_fm_source.js` | 推函数模块（`TARGET_GROUP` / `TARGET_FM`） |
| `push_include_source.js` | 推 INCLUDE |
| `push_table_ddl.js` | 推表 DDL |
| `push_textelements.js` | 推文本元素（`TE_FILE` 指向 JSON） |
| `read_textelements.js` | 回读文本元素做备份/比对 |
| `check_activation.js` | 单独查激活状态 |
| `_act_dbg.js` | 激活失败时打印 SAP 原始响应 |
| `act_dump_prog.js` | 只做激活并打印原始报文，**带消息行号**，用来钉死语法错误位置 |
| `delete_prog.js` | 删程序（含 inactive 残留） |

### 对象与结构

| 脚本 | 用途 |
|---|---|
| `adt_ddic.js` | DDIC 直连诊断：`probe` / `unlock` / `delete` / `activate`，绕开 MCP 的「假锁」提示 |
| `set_fm_rfc.js` | 打开/关闭函数模块的 RFC 标记 |

### 两个带配置的工具

| 脚本 | 配置目录 | 说明 |
|---|---|---|
| `gen_cua.js` | `scripts/cua/config/<PROG>.json` + `scripts/cua/ZCUA_APPLY.tpl.abap` | GUI 状态功能码登记。配置驱动，`pfno` 自动挑号，重跑幂等。仓库给了一份 `ZMY_PROG.json` 作样例，照抄改按钮即可 |
| `gen_e2e_harness.js` | `scripts/harness/<PROG>.json` | 把生产报表复制成 `$TMP` E2E 探针，切开「ALV 渲染限制」与「真实转储」。配置含 `src` / `out` / `replace` / `dumpForm` 四段 |

`gen_e2e_harness.js` 的配置没有通用样例可给（`dumpForm` 是按业务造的测试数据），结构看脚本头注释；`dumpForm` 的写法参照 `sap-abap-prog-push-run` §8.0.2 的三段式探针范式。

## 技能里提到但本仓库未收录的 13 个

这些都绑定了具体客户对象或具体业务，收进来对别人没有意义。技能正文保留了对它们的**做法描述**，按范式自己写即可：

| 脚本 | 做什么 | 可参照的收录脚本 |
|---|---|---|
| `create_isp014_objects.js` | 一次建整套 DDIC 对象（表+结构+数据元素） | `adt_ddic.js` + `sap-ddic-object-ops` §1 |
| `create_ztepicbcde.js` | 批量建域+数据元素+多张表 | 同上 |
| `add_ztepic01_fields.js` | 给已有表追加字段 + 配套数据元素 | 同上 |
| `add_ztepic07_fields.js` | 按外部数据字典复刻整张表 | 同上 |
| `recreate_ztepic_tables.js` | 从 abapGit XML 还原表 | `push_table_ddl.js` |
| `create_fee_tables.js` | 某套费用报销表的完整定义 | 同上 |
| `create_ziflog_dtel.js` | 给某张日志表补数据元素 | `adt_ddic.js` |
| `probe_dtel_validate.js` | 直探 ADT `dataelements/validation` 真实响应 | `adt_ddic.js` |
| `gen_zfid001x.js` | 某程序族的源码+文本+配置生成器 | `gen_cua.js` |
| `upd_zsfii006_out_v11.js` | 结构改字段的锚点替换范式 | `adt_ddic.js` |
| `s4cloud-sso.js` | S/4 公有云 SSO 换会话 | `sap-s4hana-cloud-adt-connect` |
| `s4cloud-adt-proxy.js` | 公有云会话注入代理 | 同上 |
| `s4cloud-write-class.js` | 公有云写类（含重试） | 同上 |

## 约定

- 路径自适应：所有脚本以 `REPO_ROOT`（= `scripts/` 的上一级）为根，`MCP_ROOT` 默认 `portable/`。换目录放也能跑，或用 `MCP_ABAP_ROOT` 显式指定。
- 脚本里的对象名、传输号、集团号都是**占位示例**（`ZMY_*` / `DEVK9xxxxx`），跑之前换成自己的。
- 新增脚本照这个写：顶部 `require` 之后先放路径自适应三行，再接业务逻辑；用法写在文件头注释里。
