\---  
name: sap-cua-gui-status-functions  
description: 用 ABAP 宿主 API（RS_CUA_INTERNAL_FETCH / WRITE / GENERATE）批量登记 SAP GUI 状态（CUA）的自定义功能码，绕开 SE41 人工操作。\*\*标准入口是 \`scripts/work/gen_cua.js\`（配置驱动：按程序一份 JSON 定义按钮，pfno/but_no 自动挑号、重跑幂等、图标配对校验、写回后回读+RS_CUA_GET_FUNCTIONS 双复核）\*\*。当需要给 REPORT 程序的 STANDARD 状态加工具栏按钮功能码、遇到「ADT 没有 GUI 状态资源」「SE41 只能人工」「按钮点了但不显示」这类判断时加载。含登记点（set/fun/but/pfk 四张表）、基线整份写入解法、GENERATE 必报 rc=3/EC801 的环境固有现象、CUA 随 R3TR PROG 传输的实证、以及 EUDB 跨集团落库等事实。  
agent_created: true  
\---

# SAP GUI 状态（CUA）功能码：自动化登记

适用项目：示例客户 SAP ERP（`~/ABAP-AI`，系统 DEV，ADT 通道）。

## 0. 一句话结论

**「ADT 没有 GUI 状态资源，功能码只能人工在 SE41 里加」是错的。** GUI 状态的功能码可以像 TCODE 那样用 **`$TMP` ABAP 报表调宿主 API** 自动批量写。与技能 `sap-tcode-create` 同构（那个是调 `RPY_TRANSACTION_INSERT`）。

## 1. 标准做法：配置驱动，一条命令（新程序一律走这条）

| 文件                                        | 作用                                                                                                                               |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/work/gen_cua.js`                 | **唯一入口**：读配置 → 注入模板 → 推送 → 运行 → 校验。任一环节不过就 `exit 1`                                                                              |
| `scripts/work/cua/ZCUA_APPLY.tpl.abap`    | ABAP 模板，含 `*{{TARGET}}` / `{{DO_WRITE}}` / `{{BASELINE}}` / `{{PFNO_START}}` / `{{PFNO_POOL}}` / `{{NO_PFK}}` 占位符 —— **要改逻辑改这个** |
| `scripts/work/cua/config/<PROG>.json`     | 每个程序一份按钮定义                                                                                                                       |
| `scripts/work/ZTEST_CUA_SLOT.abap`        | $TMP 只读探针：打 4 个付款平台程序的 `pfk` 已占槽位 + Z 功能码落点，改池子前后都用它核验                                                                           |
| `scripts/work/ZTEST_CUA_STD.abap`         | $TMP 只读探针：扒标准程序（`SAPLSLVC_FULLSCREEN` 等）的 `but`/`pfk` 原样数据 —— 「哪种槽位号合法」的取证工具                                                     |
| `scripts/work/cua/_build/ZCUA_APPLY.abap` | 注入后的生成物，不手改                                                                                                                      |

```bash
node scripts/work/gen_cua.js                   # 处理 config/ 下全部程序
node scripts/work/gen_cua.js ZFID001B ZFID001C # 只处理指定程序
node scripts/work/gen_cua.js --dry             # 只预演分配结果，不写 SAP
```

配置格式（**`pfno` / `but_no` 不用配**，ABAP 侧自动分配）：

```json
{
  "prog": "ZFID001B",
  "baseline": "ZFID001A",
  "pfnoStart": 13,
  "pfnoPool": [13, 14, 16, 17, 20],
  "buttons": [
    { "code": "ZEXEC", "text": "执行处理",
      "iconId": "@15@", "iconName": "ICON_EXECUTE_OBJECT",
      "iconText": "执行处理", "infoText": "对选中行执行本功能的处理逻辑" }
  ]
}
```

**`pfnoPool`（推荐填）—— 优先占用的功能键槽位**：按顺序挑第一个未被占用的号，  
池子用尽才退到 `pfnoStart` 起顺序找。

> ⚠️ **槽位号只能填 01~48**（外加标准自带的 `71` / `80`~~`86` 这几个特殊号）。  
> `49` 以上不在生成的 CUA 功能键表里：按钮**画得出来、点了必报「无效脚本标识」**  
> （WebGui 的 RAL 报错）。**2026-09-18 实锤**：ZFID001A~~D 原起点 49（按钮落在 49~56）  
> 全部踩坑，改到 `13/14/16/17/20/36/38/09` 后正常。  
> 参照物：手工在 SE41 建的 ZFIR005，其自定义按钮 SAP 自己就放在 **13/14**；  
> 标准 ALV 状态（SAPLSLVC_FULLSCREEN）的 `pfk` 里也**从来看不到 49~70**。

**`noPfk`（保留开关，别用）** —— 曾试图让按钮「可点但无快捷键」：写 `ls_but-pfno='S'`  
且不写 PFK 表。**实测失败**：`'S'` 在 CUA 里是**工具栏分隔符**，开了之后  
ZFID001A 状态里的按钮**全部消失**。原因是 `RSMPE_BUT` 没有自己的功能码字段，  
按钮完全靠 `pfno` 去 PFK 表取功能码，所以「无快捷键的按钮」在 CUA 模型里**做不到**。  
遇到快捷键相关报错，走 `pfnoPool` 换槽位这条路。

脚本自带的校验（任一不过 → 非零退出，不会静默通过）：

- 字段长度按域上限：`code`≤20 / `text`≤40 / `iconId`≤4 / `iconName`≤30 / `iconText`≤40 / `infoText`≤60
- 功能码格式、同程序内不重复、`iconId` 形如 `@XX@`
- ABAP 侧逐个校验 `iconId ↔ iconName` 与 `ICON` 表配对，配不上就打 `!! 图标校验失败，跳过` → 脚本据此失败
- 写回后**回读 4 张表 + 调 `RS_CUA_GET_FUNCTIONS` 运行时复核**，全 Y 才算过。  
  注：若同一轮里开了 `noPfk`（已废弃），回读的 `but`/`pfk` 两列会误报 —— 别再用那个开关。

### pfno / but_no 自动分配规则（不需人工挑号）

- `pfno`：**先按 `pfnoPool` 顺序挑第一个空位**（`'S'` 是分隔符，不算占用），  
  池子用尽才从 `pfnoStart` 起递增兜底。**槽位必须 ≤ 48**（见上）。  
  兜底路径跨度是 01~99，**个位数要补零**（`lv_n(2) TYPE n` → `'09'`），  
  否则 `'9 '` 匹配不上标准数据里的 `'09'`。
- `but_no`：接 `lt_but` 现有 `no` 最大值递增。基线被剔除自定义码后最大值通常是 25，所以新按钮从 **26** 起。
- **重跑幂等**：先按 `code` 在现有 `pfk` 里找回旧 `pfno`、按 `pfno` 找回旧 `but_no`，沿用不重排。  
  但**改了池子要重排**：`strip_zcodes` 会先删掉旧 Z 码的 `but`+`pfk`，所以换槽位后新号会被重新分配。  
  实测 2026-09-18：ZFID001A 8 个按钮 49~~56 → `09/13/14/16/17/20/36/38`，`but_no` 仍是 26~~33。

### 基线怎么选（决定会不会丢别人的功能码）

`ZCUA_APPLY` 的顺序是：

1. **先 FETCH 目标程序自己**（`state='A'`）。`rc=0` 就用它当基线。
2. `rc=1`（程序从没在 GUI 打开过、无 CUA 记录）→ 退回 FETCH `baseline` 配置的程序。

> **★ 两个分支拿到基线后都要 `strip_zcodes`（2026-09-17 修正）** —— 一律先剔除  
> 所有以 `Z` 开头的功能码（系统标准码都不是 Z 开头），再按配置重加。
>
> 早期版本只在"退回全局基线"分支剔，于是**程序改造后废弃的旧功能码会残留**：  
> `ZFID001B` 由框架版（`ZEXEC`/`ZBACK`）改为审批版  
> （`ZAPPROVE`/`ZREJECT`/`ZCONFIRM`）后重跑 `gen_cua.js`，  
> `RS_CUA_GET_FUNCTIONS` 列出 **5 个**码，其中 `ZEXEC`/`ZBACK` 是源码里已无分支的  
> 死按钮（点了不报错、只是没反应）。改成两个分支都剔后重跑，只剩正确的 3 个。
>
> 前提：本项目的自定义功能码**一律由 `gen_cua.js` 管理**；手工在 SE41 加的 Z 码会被清掉。
>
> 老版工具是"按 `LT_TARGET` 里归基线名下的 code 去剔"，只有基线正好在配置表里才正确。  
> 新版按"code 首字母 Z"剔，与配置表解耦 —— 用 `ZFID001A` 当基线写别的程序时不会再残留 A 的 8 个按钮。
>
> **★ 只从 `lt_fun` 收码有盲区（2026-09-22 修正）** —— `fun` 表里已无定义、但 `set` 表里  
> 仍挂着 `function=Zxxx` &#x7684;**「僵尸功能码」**&#x6309;上面的逻辑永远收不到，会一直留在状态里  
> 污染 `RS_CUA_GET_FUNCTIONS` 复核结果（`ZFIB001` 的 `ZSUM`：`set` 有，`fun`/`pfk`/`but` 全无）。  
> `ZCUA_APPLY.tpl.abap` 已补：再扫一遍 `lt_set` 收 Z 码，与 `lt_fun` 的结果合并去重后再删。  
> 判据：dry run 打印的 `剔除基线自有自定义码 = N`，N 应等于"该程序历史上加过的全部 Z 按钮数"，  
> 而不是"现在还活着的按钮数"。
>
> **★ 配置文件必须把该程序现存的全部 Z 按钮都写进去** —— 流程是"先全剔、再按配置重加"，  
> 漏写一个就等于把那个按钮删掉。给已投产程序加按钮时（例：`ZFIB001` 加 `ZTEST`），  
> 配置里要同时写 `ZLOAD` + `ZTEST`。  
> 另注意"**沿用号**"的来源是 `lt_pfk`/`lt_but` 里**残留**的行，而 `strip` 已把旧 Z 码的  
> `pfk`/`but` 行删掉 → 老按钮实际也会**重新分配**号，只是恰好落在同一个槽位  
> （`ZFIB001` 实测：`ZLOAD` 复得 `pfno=13`、`but_no` 由 26 重算回 26；`ZTEST` 得 `14`/`27`）。  
> 想保住原号，把老号写进 `pfnoPool` 的前排。

**实测基线分支**（2026-09-17，`ZTEST_CUA_FRESH` 空白报表）：  
`基线来源 = 全局基线 ZFID001A` / `剔除基线自有自定义码 = 8` → `set 103 / fun 60 / but 25 / pfk 44`，  
自动分配 `ZEXEC/ZBACK/ZDETAIL → pfno 49/50/51，but_no 26/27/28`，`write rc=0`，四项回读全 Y，  
`RS_CUA_GET_FUNCTIONS` 列出 3 个码且图标正确；`EUDB` 独立查询确认新记录  
（`RELID='CU' NAME='ZTEST_CUA_FRESH' AUTOR=DEVUSER`）。

### 接进"生成程序"的流程

`scripts/work/gen_zfid001x.js`（付款平台子程序族生成器）现在**同时产出**  
`scripts/work/cua/config/<PROG>.json`，所以标准四步是：

```bash
node scripts/work/gen_zfid001x.js                 # 1. 源码 + 文本元素 + CUA 配置
SRC_FILE=$PWD/FICO/ZFID001B_付款审批.abap SAP_ENV_FILE=$PWD/env/dev.env \
  node scripts/work/push_prog_source.js           # 2. 推源码并激活
SAP_ENV_FILE=$PWD/env/dev.env PROGS=B,C,D node scripts/work/push_textelements.js   # 3. 文本元素（推完必须单独激活，见技能 sap-abap-prog-push-run §6.0）
SAP_ENV_FILE=$PWD/env/dev.env node scripts/work/gen_cua.js                          # 4. GUI 状态
```

**新程序交付清单里必须有第 4 步** —— 不做这一步，程序能跑但工具栏一个自定义按钮都没有。

### 只读勘察用的探针（都是 `$TMP`、不传输）

| 文件                                   | 作用                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------- |
| `scripts/work/ZTEST_CUA_READ.abap`   | dump 某程序 CUA 全部表（`TAB\|字段=值` 格式，便于本地 diff）                                  |
| `scripts/work/ZTEST_CUA_GEN.abap`    | 用 `RS_CUA_GET_FUNCTIONS` 批量列自定义功能码（程序清单写死在源码里）                              |
| `scripts/work/ZTEST_CUA_EXPORT.abap` | 验传输归属：`RS_GET_KEY_FOR_CLM_TOOL_LOG` 取对象标识 + `RS_CUA_VERSION_EXPORT` 走传输导出入口 |
| `scripts/work/ZTEST_CUA_WRITE.abap`  | 初版手写工具（`LT_TARGET` 写死在 ABAP 里，`C_DO_WRITE` 控开关）。仍可用，但新程序走 `gen_cua.js`      |

```bash
SAP_ENV_FILE=$PWD/env/dev.env node scripts/work/adt.js run ZTEST_CUA_GEN
```

**`ZCUA_APPLY` 本身已内置 `RS_CUA_GET_FUNCTIONS` 复核**（第 7 步），所以日常不需要另外跑 `ZTEST_CUA_GEN`。

> 集团：CUA 数据跨集团（`EUDB` 无 MANDT），所以在 100 里跑 `gen_cua.js` 登记，300 同样生效。  
> 但 `ZCUA_APPLY` / `ZTEST_CUA_*` 这些 `$TMP` **程序对象**是按集团的 —— 要换集团跑得先按  
> `awk '{if($0~/^SAP_CLIENT=/)print "SAP_CLIENT=300"; else print}' env/dev.env > /tmp/sap300.env && chmod 600 /tmp/sap300.env` 生成环境文件再推。

## 2. 登记一个自定义功能码 = 往 4 张表各加 1 行

以已在用的 ZFIR005（`ZTECO` / `ZUNTECO`）为样板 diff 得出：

| 表     | 行类型          | 关键字段                                                                                                                                   |
| ----- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `set` | `rsmpe_staf` | `status='STANDARD'` + `function=<FCODE>` + `active_view=''`                                                                            |
| `fun` | `rsmpe_funt` | `code` + `textno='001'` + `fun_text` + `text_type='S'` + `icon_id='@XX@'` + `text_name`(图标技术名) + `icon_text`(图标文本) + `info_text`(信息文本) |
| `but` | `rsmpe_but`  | `pfk_code='000001'` + `code='0001'` + `no=<工具栏序号>` + `pfno=<功能键号>`                                                                     |
| `pfk` | `rsmpe_pfk`  | `code='000001'` + `pfno=<功能键号>` + `funcode=<FCODE>` + `funno='001'`                                                                    |

要点：

- **`text_name` 是图标的技术名**（如 `ICON_COMPLETE`），不是文本！**必须与 `icon_id` 成对**，见下节。
- **三个文本字段的长度域**：`fun_text` = `GUI_TEXT` = **CHAR 40**；`icon_text` = `GUI_ICTEXT`（域同 `GUI_TEXT`）= **CHAR 40**；  
  `info_text` = `GUI_INFO` = **CHAR 60**。  
  SE41 手工建的功能码（ZTECO/ZUNTECO）这三栏填的是**同一个值**；本项目做法是  
  `fun_text` = 按钮文字、`icon_text` = 按钮文字、`info_text` = 更详细的一句话说明。  
  （注意数据元素名是 `GUI_ICTEXT`，写成 `GUI_ICTXT` 激活会报 `Type "GUI_ICTXT" is unknown`。）
- `text_type='S'` = 静态文本，按钮文字取自 `fun_text`。
- `000001` 指向状态头 `rsmpe_stat` 的 `butcode` / `pfkcode`（查出来照用）。
- `but.no` = 应用工具栏上的**排列序号**，接现有最大值递增；`but.pfno` = `pfk.pfno` = 分配的**功能键号**。`but` 里 `pfno='S'` 是分隔符。
- **`act`（应用工具栏）不需要动** —— ZFIR005 的 `ZTECO` 就不在里面。

### 功能键号（pfno）挑号规则 —— **只碰 01~48**

编号名义上 01–99，实测有效段（对照标准 ALV `SAPLSLVC_FULLSCREEN` + 手工建的 ZFIR005）：

| 段          | 含义                                   | 能否自用          |
| ---------- | ------------------------------------ | ------------- |
| 01–12      | F1–F12（04 是 F4 帮助，必避）                | 慎用，实质是抢标准 F 键 |
| 13–20      | 自由段 —— **SAP 在 SE41 里给新建按钮自动分的就是这里** | ✅ 首选          |
| 21–24      | `P--`/`P-`/`P+`/`P++` 翻页             | 占用            |
| 25–36      | Ctrl+F1–F12（ALV 标准功能占多数）             | 捡漏可以          |
| 37–48      | Ctrl+Shift+F 段（ALV 标准功能占多数）          | 捡漏可以          |
| **49–70**  | **生成出来的 CUA 里没有这些槽 —— 填了必报「无效脚本标识」** | ❌ 禁用          |
| 71 / 80–86 | 系统特殊号（`%SC`、`%SC+`、`&RNT`、`P--` 等）   | 占用            |

**做法**：先 dump 一遍目标程序的 `pfk` 取差集（探针 `scripts/work/ZTEST_CUA_SLOT.abap` 直接打空位），  
再把空闲号按优先级写进 `pfnoPool`。本项目 ZFID001A~D 用的池子是 `13, 14, 16, 17, 20, 36, 38, 09`。

### 怎么挑图标（`icon_id` + `text_name` 必须成对）

图标都在 **`ICON` 表**里，`ID`（`@XX@`）与 `NAME`（技术名）成对：

```sql
SELECT id, name, button FROM icon
 WHERE name LIKE 'ICON_SUM%' OR name LIKE 'ICON_TRANSFER%' OR name LIKE 'ICON_CHANGE%'
```

- **挑 `BUTTON='X'` 的**（适合做按钮图标）。
- **配对写错不报错** —— SAP 只是不显示图标。所以写入前**必须校验**（`ZCUA_APPLY` 已内置）：
  ```abap
  SELECT SINGLE name FROM icon INTO lv_iname WHERE id = ls_t-icon_id.
  IF sy-subrc <> 0 OR lv_iname <> ls_t-icon_name.   " 跳过该条，不写
  ```
  实测（2026-09-17）：`@4B@` 是**真实存在**的图标代码，但它对应的技术名是 `ICON_SELECT_ALL`  
  —— 写成 `ICON_DISPLAY` 就会被拦下。这正是"配错不报错"的典型场景，所以别凭记忆配。
- 本项目 ZFID001A~D 实际用的图标（本次已逐个校验配对）：

| 功能       | icon_id | name                  |
| -------- | ------- | --------------------- |
| 提交审批     | `@DF@`  | `ICON_COMPLETE`       |
| 推送CBS付款  | `@KB@`  | `ICON_TRANSFER`       |
| 更改状态     | `@0Z@`  | `ICON_CHANGE`         |
| 更改付款银行项目 | `@JL@`  | `ICON_PAYMENT`        |
| 更改收款银行项目 | `@AZ@`  | `ICON_MONEY`          |
| 获取回单/票据  | `@48@`  | `ICON_IMPORT`         |
| 勾选金额汇总展示 | `@3Z@`  | `ICON_SUM`            |
| 通讯日志     | `@DH@`  | `ICON_PROTOCOL`       |
| 执行处理     | `@15@`  | `ICON_EXECUTE_OBJECT` |
| 撤销/回退    | `@0W@`  | `ICON_CANCEL`         |

**本系统不存在的图标名（别猜）**：`ICON_SEND`、`ICON_UNDO`、`ICON_ROLLBACK`、`ICON_BANK`、`ICON_DOWNLOAD`、`ICON_INVOICE`、`ICON_BILL`。  
改图标只需改 `scripts/work/cua/config/<PROG>.json` 的 `iconId`/`iconName` 后重跑 `gen_cua.js`（幂等，不用先清）。

## 3. 流程（顺序不可颠倒）

`ZCUA_APPLY.tpl.abap` 已经把下面五步封装好，这里是原理：

```abap
" ① 读（adm 必须一起取，WRITE 要求原样传回）
CALL FUNCTION 'RS_CUA_INTERNAL_FETCH'
  EXPORTING program = <prog> state = 'A'
  IMPORTING adm = ls_adm langu = lv_lang
  TABLES sta/fun/men/mtx/act/but/pfk/set/doc/tit/biv = ...   " 11 张表全是必输，少一个就
                                                             " dump「Missing parameter in CALL FUNCTION」
" ② 追加 4 张表的行（幂等：同 code / 同 pfno 先 DELETE 再 APPEND）
" ③ 写回激活版本
CALL FUNCTION 'RS_CUA_INTERNAL_WRITE'
  EXPORTING program = <prog> language = lv_lang
            tr_key  = ls_trkey      " obj_type='PROG' obj_name=<prog>
                                    " sub_type='CUAD' sub_name=<prog> devclass=<TADIR 里的包>
            adm     = ls_adm
            state   = 'A'
  TABLES <同上 11 张表>
" ④ ★ 必须 COMMIT，否则 GENERATE 读不到刚写的数据
COMMIT WORK AND WAIT.
" ⑤ 生成 load
CALL FUNCTION 'RS_CUA_INTERNAL_GENERATE' EXPORTING program = <prog> ...
```


## 4. 三个必须知道的坑

### ① `RS_CUA_INTERNAL_GENERATE` 必然回 `rc=3` / `EC/801` —— 环境固有，不是失败

消息：`EC 801 生成 &1 已终止 (请参阅长文本)。返回代码 &2`，v1 = 程序名，v2 = 4。

**对照实验（2026-09-17）**：手工在 SE41 建的、一直正常工作、按钮正常显示的 `ZFIR005` **同样返回 rc=3 / EC/801**。所以这个失败与写入无关（推测是 LTAB 快速通道在无 GUI 会话下生成不了，运行时回退到 EUDB）。

**不要为它折腾，不要据此判断失败。**

### ② 判定成功的唯一依据 = `RS_CUA_GET_FUNCTIONS`

这是运行时真正读 CUA 的接口（内部也走 `RS_CUA_INTERNAL_FETCH`）。`ZCUA_APPLY` 第 7 步已内置调用，  
`gen_cua.js` 会检查每个配置的功能码是否都出现在 `[RT]` 行里：

```abap
CALL FUNCTION 'RS_CUA_GET_FUNCTIONS'
  EXPORTING program = 'ZXXX'
  TABLES    function_list = lt_funl     " 行类型 rsmpe_funl
  EXCEPTIONS menu_not_found = 1 program_not_found = 2 OTHERS = 3.
" lt_funl 字段：fcode / text / icon_id / icon_text / info_text / pfno / but_seq / active / internal / texttype
" 注意该表不含 pfno 与 but_seq 的实际值（要看这两个字段得用 FETCH 的 but/pfk 表）
```

能列出功能码且 `text` 正确 = 成功。

### ③ 程序没有 CUA 记录时，用**基线整份写入**

`FETCH` 返回 `rc=1`（NOT_FOUND）= 该程序**压根没有 CUA 记录**（从没在 GUI 里打开过、也没被 SE41 碰过），此时无法"追加"，只能整份写。

依据（实测 diff）：**REPORT 程序的 `STANDARD` 基线在各程序间完全一致** —— `ZFID001A` 与手工建的 `ZFIR005`，除各自的自定义功能码外**逐字段相同**。

做法见 §1「基线怎么选」：优先用程序自身，无记录时 FETCH 基线程序并**剔除其所有 `Z` 开头功能码**，再加目标程序要的功能码 → 写到目标程序。

实测记录：

| 场景               | 程序                                                                 | 结果                                                                                                               |
| ---------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 有记录、纯追加          | ZFID001A~D（2026-09-17 初版手写工具）                                      | 全部成功                                                                                                             |
| 无记录、基线整份写入       | ZTEST_CUA_FRESH 空白报表 → 基线 ZFID001A                                 | 剔除 8 个基线自有码 → `set 103 / fun 60 / but 25 / pfk 44`，自动分配 pfno 49/50/51、but_no 26/27/28，`write rc=0`，回读 + 运行时复核全通过 |
| **改造后重跑（清理废弃码）** | ZFID001B：框架版 `ZEXEC`/`ZBACK` → 审批版 `ZAPPROVE`/`ZREJECT`/`ZCONFIRM` | 剔除 5 个自有码 → `set 103 / fun 60 / but 25 / pfk 44`，`pfno 49/50/51`、`but_no 26/27/28`，运行时复核只剩 3 个正确码                |
| 重复跑（幂等）          | ZFID001A~D 用 `gen_cua.js` 重跑                                       | `RS_CUA_GET_FUNCTIONS` 输出与改前**逐字符一致**                                                                            |

> 想复现"基线分支"，找任意**从没在 GUI 打开过的 REPORT 程序**即可（`FETCH rc=1`）—— 比如新建一个空 `$TMP` 报表。

### ④ ABAP 侧的三个编译/运行陷阱（写模板时踩过）

- **`FIELD-SYMBOL` 声明在 FORM 里是局部的**：`LOOP AT x ASSIGNING FIELD-SYMBOL(<t>)` 在 FORM A 里声明，FORM B 里用 `<t>` 会报  
  `Field "<T>" is unknown`。**声明成全局** `FIELD-SYMBOLS <t> TYPE ty_xxx.`，各 FORM 里只用 `ASSIGNING <t>`。
- **别把结构体当内表参数传**：`vadm_40` 要 `TYPE TABLE OF rsmpe_adm`（`rsmpe_adm` 是结构）。
- **`CONCATENATE` 会吃掉操作数的尾部空格**：`CONCATENATE '   [RT] ' ls-fcode ...` 得到的是 `   [RT]ZBACK` 而不是 `   [RT] ZBACK`。  
  下游正则解析输出时要么用 `SEPARATED BY space`，要么正则写成 `\[RT\]\s*`。
- 组件名别用 ABAP 关键字：`skip` → 改 `flg_skip`（`LOOP ... WHERE skip IS INITIAL` 有歧义风险）。

## 5. 其它事实

- **传输**：CUA **不是独立对象**，是 `PROG` 的**子对象 `CUAD`**，随 `R3TR PROG` 一起走，**不需要另外挂请求**。三条实测证据（2026-09-17）：
  1. `RS_GET_KEY_FOR_CLM_TOOL_LOG( object=<prog>, object_class='SCUA' )` → `obj = PROG <prog>` / `sub = CUAD`。这就是它的传输身份。
  2. `TADIR` 里**全局 0 条 CUAD**（`ZFIR005`/`ZFID001A` 只有 `R3TR PROG`，另加 `R3TR TRAN`）；`E071(DEVK900007)` 24 种对象类型里也没有 CUAD。
  3. `RS_CUA_VERSION_EXPORT( objectname=<prog>, state='A' )` 走传输导出入口，`rc=0` 且实取到数据：ZFID001A → fun 68 / set 111 / but 33 / pfk 52（含 8 个自定义 Z 码）；ZFIR005 → fun 62（含 ZTECO/ZUNTECO）。`vautor/vdatum` = 写入者与日期。
- `E071` 里确实会出现 `LIMU CUAD <程序名>`，但**只出现在 SAP 自己的 `SAPK-*` 补丁包里**（SAP 只动状态不动源码时用它做部分传输）；本系统 `DEVK*` 请求 0 条。原因在源码里：`RS_CUA_INTERNAL_WRITE` 末尾 `IF state NE 'A'` 才调 `RS_INSERT_INTO_WORKING_AREA` 把 CUAD 塞进对象列表——我们走 `state='A'` 直写激活版，所以不产生该行，**不影响传输**。
- **可逆 / 备份**：写入是纯追加，要回退就把这些 code 从 4 张表里删掉重写。**这就是备份**，不必额外存档。
- **`CONCATENATE` 不收 `TYPE i`**：报 `"LV_RC" must be a character-like data object`，先转 `TYPE char<n>` 再拼。`WRITE: / ... , lv_i.` 不受限。
- **`inactiveobjects` 的 XML 命名空间前缀是 `ioc:`** 而不是 `adtcore:`，正则写错会得到"0 条"的假象。
- **落库位置 = `EUDB` 簇表**：`RELID='CU'`（激活版）/ `'IA'`（非激活版），键 `NAME`(程序名) + `SPRSL='D'` + `SRTF2=0`，内容在 `CLUSTD`，SQL 读不出内容。**`EUDB` 没有 MANDT 字段 → CUA 定义在存储层是跨集团的**（宿主 API 也没有集团参数），所以在 100 里登记一次，300 同样生效。（"`$TMP` 按集团"只约束程序对象本身，不约束 CUA。）
- `RSMPE_*` 系列（`RSMPE_FUN/STA/BUT/PFK/ADM/STAF/FUNT`…）在 `DD02L` 里 `TABCLASS='INTTAB'`，是**结构**不是表；只有 `EUDB` 是 `TRANSP`。写 probe 时 `vadm_40` 要 `TYPE TABLE OF rsmpe_adm`，写成 `TYPE rsmpe_adm` 会报 `"LT_ADM40" is not an internal table`。
- **`D020S` 与 GUI 状态无关**（那是 dynpro 屏幕头表）。
- 最终的**视觉确认**（按钮是否真的出现在工具栏、图标是否合适）仍需用户在 SAPGUI 里看一眼 —— ADT 驱动不了 dynproc。
