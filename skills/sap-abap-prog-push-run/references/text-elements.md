# 文本元素 TEXT-xxx / 消息类 T100（§6）

> 主册：[`../SKILL.md`](../SKILL.md)。写界面文案、ALV 列标题、消息文本时读这一份。
> 核心：**文本元素是独立可激活对象（`PROG/PX`），PUT 完必须单独激活**；增删符号的顺序相反。

## 6. 文本元素（TEXT-xxx）：块标题、ALV 列标题、消息 —— 推送 / 激活 / 排查

**`SELECTION-SCREEN ... WITH FRAME TITLE <x>` 的操作数只接受文本符号名（≤8 字符）**，既不能写中文字面量、也不能写变量。

- 写变量 `TITLE gv_title_b1` 报的是 EU 消息 **`The name of the comment can be up to eight characters long.`**（文案极具误导性，行号指向 TITLE 后面的操作数）。`act_dump_prog.js` 会用 `href="...#start=行,列"` 给出精确坐标，**别靠消息文案猜**。
- 正确写法：`WITH FRAME TITLE text-001.`，且**必须先推文本元素再激活源码**（激活时语法检查会校验符号存在）。

推送文本元素（`scripts/push_textelements.js`，JSON 见 `scripts/textelements/<PROG>.json`）：

```bash
SAP_ENV_FILE=$PWD/portable/env/dev.env CORR_NR=DEVK900006 TE_FILE=$PWD/scripts/textelements/ZFIR005.json node scripts/push_textelements.js
```

**★ 增删符号的顺序不一样，别背成一条口诀**

- **新增**符号（源码要引用新 `TEXT-nnn`）→ **先推文本元素并激活，再推源码**（否则语法检查报符号不存在）。
- **删除**符号（源码去掉了某参数的文案，如删掉「测试运行」时连带删 `TEXT-021`）→ **先推源码，再推文本元素**。
  原因：文本元素 `PUT symbols` 是**整块覆盖**，删符号会立刻让 SAP 端 *当前 active 的* 源码变成"引用了不存在的符号"；
  先推源码就没有这个中间态。（顺序反了也不会立刻报错，但中间窗口做任何语法检查都会挂。）
- 删符号**一般用不着写探针**：PUT 是覆盖语义 → 从 JSON 里删掉重跑，看回读行数即可。
  实测：148 个符号回读 443 行、157 个回读 470 行（每符号 `@MaxLength` + `KEY=TEXT` + 空行 = 3 行）；
  `selections` 8 条 = 15 行、9 条 = 17 行。
  **但 `push_textelements.js` 的回读只打印前几行预览 + 总行数** —— 要确认**某一个符号**是否真没了，行数不够、
  得拉全文：`node scripts/read_textelements.js <PROG> symbols | grep -E "^T6[0-9]="`。
  （只读脚本，已进本仓库；要点：primer GET 用 `Accept: '*/*'`，后续请求必须带 `x-sap-adt-sessiontype: stateful`。）
- 清理时顺手做一次**一致性比对**（比人眼可靠）：源码里所有 `text-xxx` 引用集合 vs JSON 配置集合，
  双向差集都应为空。`SELECTION-SCREEN` 块里只剩一个元素时**整块删掉**（保留空块会留一个空白框）。

### 6.0 ★ 文本元素是独立可激活对象，PUT 完必须单独激活（曾漏掉，导致人工返工）

**`PUT /textelements/.../source/<sub>` 只写入 inactive 版本。** 文本元素在 ADT 里是**独立对象**，`adtcore:type = "PROG/PX"`，uri 就是文本元素自身（`/sap/bc/adt/textelements/programs/<prog>`），**必须再调一次 ACTIVATE**：

```bash
POST /sap/bc/adt/activation?method=activate&preauditRequested=true&version=inactive
Content-Type: application/vnd.sap.adt.activation.v1+xml
body: <adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">
        <adtcore:objectReference adtcore:uri="/sap/bc/adt/textelements/programs/zfid001b"
                                 adtcore:type="PROG/PX" adtcore:name="ZFID001B"/>
      </adtcore:objectReferences>
```

三条实测结论（2026-09-17 踩到，ZFID001B/C/D 文本元素挂在未激活状态、用户手工激活时发现）：

1. **激活父程序 `PROG/P` 不会连带激活它**。传 `PROG/P` 时 SAP 若认为无内容可激活，会返回 `activationExecuted="false"` **且不带任何 `<msg>`** —— 静默无效，别把它当成功。
2. **激活接口不接受 `corrNr`**（带了 400）。对象归属由自身已挂的请求决定，无需传。
3. 反过来，**当程序本身也有 inactive 版本时**，一次 `PROG/P` 激活会把 `PROG/PX` 一起带上 —— 所以"先推文本元素、紧跟着推源码激活"能碰巧成功。**但这是隐式捷径，不可依赖**；程序已 active 时再推文本元素就漏掉了。

**判据 —— 三步自查（都比看 HTTP 200 可靠）**：

```bash
# ① inactive 清单里有没有 PROG/PX（命名空间是 ioc:，不是 adtcore:，正则写错会得到"0 条"的假象）
GET /sap/bc/adt/activation/inactiveobjects
#   → <ioc:ref adtcore:type="PROG/PX" adtcore:name="ZFID001B" adtcore:parentUri=".../programs/zfid001b"/>
#   注意：PROG/P 也会出现在清单里（父对象有未激活子对象时），别据此判断程序源码未激活。

# ② 比对 active / inactive 两个版本的内容
GET /sap/bc/adt/textelements/programs/<prog>/source/symbols?version=active
GET /sap/bc/adt/textelements/programs/<prog>/source/symbols            # 默认 = inactive
#   → active 为空、inactive 有内容 = 未激活（本次 ZFID001B/C/D 的原始状态）

# ③ 激活后确认 active 非空 + activationExecuted="true"
```

**推荐执行顺序（每次改文本元素都走全）**：推文本元素（含激活）→ 推源码（含激活）。`push_textelements.js` 已内置 [5] 激活 + [6] active 版本回读校验，激活失败会 `exit 1`。

协议要点（实测）：
1. **primer GET 不要带 `Accept: application/vnd.sap.adt.textelements.v1`** —— 会 406。discovery 声明的对象媒体类型是 `application/vnd.sap.adt.textelements.v1+xml`；最稳是不指定 Accept 或用通配 Accept。
2. 返回 406 时先看响应里的 `Accepted content types:` 列表，别自己猜。
3. **LOCK handle 绑定 ADT 会话**：所有请求必须带同一个 `sap-adt-connectionid`（`randomUUID()`）+ 合并的会话 cookie，否则 PUT 报 `Resource REPT xxx is not locked (invalid lock handle)`。
4. LOCK/PUT 都带 `corrNr`；PUT 需要 `If-Match: <etag>`（GET `/source/<sub>` 取）；资源尚不存在时 GET 404，改用 `If-None-Match: *`。
5. 子对象 GET/PUT 的媒体类型分别是 `application/vnd.sap.adt.textelements.<symbols|selections>.v1`。
6. 序列化格式：symbols 为 `@MaxLength:<n>\nKEY=TEXT\n`（块间空行，n ≈ 字符数，中文按 2 计，非关键校验位）；selections 为 `KEY` 左对齐 8 位 + `=` + 文本。
7. 文本符号池**分语言**：会话 `sap-language` 必须与激活会话一致（本项统一 ZH）。

### 6.1 硬编码中文一律转文本元素（FICO 付款平台 ZFID001A 实践）

JS 的 `MESSAGE` 长文本、ALV 列标题、状态描述表都要走文本元素。命名分段（供参考）：

| 段 | 用途 |
|---|---|
| `001`~`00n` | `SELECTION-SCREEN ... WITH FRAME TITLE` 块标题 |
| `010`~`0nn` | 消息文本（含 `&` 占位符） |
| `T01`~`Tnn` | ALV 列标题 |
| `T60`~`T70` / `T80`~`T93` | 单据状态 / 支付状态描述 |

**ALV 字段目录也能引用文本符号**，但**字段名取决于用哪套 ALV**：

| ALV 形态 | 列目录结构 | 列标题字段 |
|---|---|---|
| **SLIS**（`REUSE_ALV_GRID_DISPLAY`） | `slis_fieldcat_alv` | **`SELTEXT_L` / `SELTEXT_M` / `SELTEXT_S`** —— **没有 `coltext`** |
| **LVC**（`REUSE_ALV_GRID_DISPLAY_LVC`） | `lvc_s_fcat` / `lvc_t_fcat` | `COLTEXT`（`TYPE lvc_txtcol`，CHAR40） |

`SELTEXT_L/M/S` 三个一起赋最稳（ALV 按列宽自动挑用哪一个）：

```abap
LOOP AT gt_fcat ASSIGNING FIELD-SYMBOL(<fs_fcat>).
  CASE <fs_fcat>-fieldname.
    WHEN 'LOGID'.  lv_text = TEXT-T01.
    ...
  ENDCASE.
  IF lv_text IS NOT INITIAL.
    <fs_fcat>-seltext_l = lv_text.
    <fs_fcat>-seltext_m = lv_text.
    <fs_fcat>-seltext_s = lv_text.
  ENDIF.
ENDLOOP.
```

**★ 什么时候必须手写 `SELTEXT_*`**：列标题若走 `REUSE_ALV_FIELDCATALOG_MERGE`（按 DDIC 文本取），
**自建表/结构没有字段文本时列标题就是空的**（`ZIFLOG_VIEW` 实例：`ZIFLOG` 的匿名类型字段
`SELECT … FROM dd03t WHERE tabname='ZIFLOG'` 7 行 `DDTEXT` 全空 ⇒ 用户看到一片空白）。
**造表时字段没给 `@EndUserText.label` 就一定会有这个后果**，两种修法：① 报表里手写 `SELTEXT_*`（本报表做法）；
② 回表定义补 `@EndUserText.label`（SE16/SE11 与其他消费者同时受益，治本）。
把 `TEXT-T01`~`Tnn` 与列顺序一一对齐最省事。不必写 `DDIF_FIELDINFO_GET`。

**`MESSAGE TEXT-xxx TYPE 'S' WITH n.` 语法检查不通过**（`WITH` 只适用于「消息类消息」，文本符号作消息文本的短形式不支持）。解法：加辅助 FORM，先取文本、替换占位符、再 `MESSAGE`：

```abap
FORM frm_msg_count USING pv_text TYPE c pv_num1 TYPE i pv_num2 TYPE i.
  DATA: lv_text TYPE string, lv_num TYPE string.
  lv_text = pv_text.
  lv_num  = pv_num1.  REPLACE '&' IN lv_text WITH lv_num.
  IF pv_num2 > 0.  lv_num = pv_num2.  REPLACE '&' IN lv_text WITH lv_num.  ENDIF.
  MESSAGE lv_text TYPE 'S'.
ENDFORM.
" 调用：PERFORM frm_msg_count USING TEXT-021 lv_count 0.
```

**推送顺序不可颠倒**：先 `push_textelements.js` 推符号 → 再推源码激活（激活时语法检查会校验符号存在）。

### 6.2 用户偏好：CASE 分支直接写功能码字面量

用户明确要求过：`CASE pv_ucomm.` 的按钮分支**不要用 `CONSTANTS` 定义**，直接写 `WHEN 'ZSUBMIT'.` / `WHEN 'ZPUSHCBS'.`。在程序头注释里列一张功能码清单即可（`ZSUBMIT/ZPUSHCBS/ZCHGST/ZCHGFB/ZCHGSB/ZGETDOC/ZSUMAMT/ZLOG`）。后续新建付款平台子程序沿用这种写法。

### 6.3 ★ 消息类（MSAG）的 `T100`：按运行语言**精确匹配**，不 fallback 到主语言

**症状**：`MESSAGE s017(zfi_msg) INTO lv_msg.` 拿到的是 **`S:ZFI_MSG:017`** 这种占位串，
不是消息正文 —— **不 dump、不报错、只静默降级**，很容易被当成"消息类没建好"而白查一轮。

**根因**：ADT 无头运行的语言取自**请求头 `sap-language`**（未显式指定时由会话/集团默认决定）：
`client 100` 实测默认 `sy-langu='1'`（ZH），`client 300` 实测默认 `'E'`（EN）。
只在主语言 `T100-SPRSL='1'` 下维护的消息，在 EN 会话下取不到 —— **SAP 不会退回 `T100A-MASTERLANG`**。
（会话语言可用 `SAP_LANGUAGE_OVERRIDE` 显式指定，见 §2 与 §6.4。）

**对策（新增消息一律照做）**：
```bash
# 1) AddMessage 写入主语言（ZH）
node scripts/call-adt-tool.js AddMessage @args.json
# 2) UpdateMessage 带 language 补 EN 条目，否则 300 无头/EN 登录下显示占位串
node scripts/call-adt-tool.js UpdateMessage \
  '{"message_class_name":"ZFI_MSG","msgno":"017","text":"...","language":"EN","transport_request":"DEVK900006"}'
```
- 本项目的既有惯例就是**双语言**（`ZFI_MSG` 001–007 的 `'1'` 和 `'E'` 都是同一段中文），
  新增消息跟随即可，别只写一个语言。
- 自检：`SELECT sprsl, msgnr, text FROM t100 WHERE arbgb = '<MSG>'` —— 每个新号都该有 `1` 和 `E` 两行。
- `MESSAGE ... INTO` 是**判据**：拿到 `X:CLASS:NNN` 形式就说明该语言下没文本。
- 实测 `T100` 数据在 100/300 **内容一致**（在这个系统里改一处两集团可见），
  但"运行语言"仍然是各集团各算，两件事别混。
- 已知残留（未修，待用户定）：`ZGL01-001` 只有 ZH；`ZFI_MSG` 008–016 只有 EN。

**顺带**：`CONCATENATE ... INTO` **不接受数值型变量**（`DATA lv TYPE i` 会报
*"LV_CNT" must be a character-like data object*）→ 拼接含数字的提示一律用字符串模板
`lv = |通过 { lv_ok } 条|.`。

### 6.4 BAPI / 主数据文本按「会话语言」读取

`SET LOCALE LANGUAGE` 与 `sy-langu` 赋值都改不动它，唯一入口是请求头 `sap-language`。根因、症状与对策见 `sap-abap-bapi-usage` → `references/_语言与数据格式.md`；`T100` 消息文本的同源问题见本节 6.3。
