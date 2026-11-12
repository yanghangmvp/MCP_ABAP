# 删对象 / 传输请求登记（E071）

> 主册：[`../SKILL.md`](../SKILL.md)。两件事都容易「以为做完了」：
> 删对象后 `TADIR` 仍有条目（`DELFLAG='X'`），要查 `DD02L`/`DD40L`/`DD04L` 才准；
> 建完对象**必须单独核 `E071`**，`R3TR TTYP` 会被静默丢弃，得手工补行。

## 删除 DDIC 对象（2026-10-10 实测）

**工具（MCP，经 `scripts/call-adt-tool.js` 调用）**：

```bash
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/call-adt-tool.js DeleteStructure '{"structure_name":"ZBPM_ISP016_HEAD_S","transport_request":"DEVK900006"}'
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/call-adt-tool.js DeleteTableType '{"table_type_name":"ZBPM_ISP016_ITEM_T","transport_request":"DEVK900006"}'
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/call-adt-tool.js DeleteTable      '{"table_name":"ZTEPIC07","transport_request":"DEVK900006"}'
```

- 参数名**各不相同**：结构 `structure_name` / 表类型 `table_type_name` / 表 `table_name` / 域 `domain_name`。
- **可传输对象必传 `transport_request`**（`$TMP` 对象可省），传**父请求号**（与写对象一致）。
- 成功返回 `{"success": true, "message": "... deleted successfully."}`；被引用时会带回 SAP 自己的拒绝原因（不许静默失败）。

**★ 删前必须查引用**：

```sql
-- 谁把它当「字段类型」（含 .INCLUDE 内嵌，此时 FIELDNAME = '.INCLUDE'）
SELECT TABNAME, FIELDNAME, ROLLNAME FROM DD03L WHERE ROLLNAME LIKE 'ZXXX%'
-- 谁把它当「表类型的行类型」
SELECT TYPENAME, ROWTYPE FROM DD40L WHERE ROWTYPE LIKE 'ZXXX%'
```

**★ 删除顺序 = 依赖逆序**：引用者先删（实例：`INPUT` 引用了 `ITEM_T`/`SCHED_T`/`HEAD_S` ⇒ 先删 `INPUT`，再删表类型，最后删被引用的结构）。

**★ 验证不能看 `TADIR`**：DDIC 对象删除后 **TADIR 条目仍然在**（置 `DELFLAG = 'X'`，随请求传输到后续系统后才清除），拿它判断会误以为没删掉。要看真实存在性：

```sql
SELECT TABNAME  FROM DD02L WHERE TABNAME  LIKE 'ZXXX%'   -- 表与结构
SELECT TYPENAME FROM DD40L WHERE TYPENAME LIKE 'ZXXX%'   -- 表类型
SELECT ROLLNAME FROM DD04L WHERE ROLLNAME LIKE 'ZXXX%'   -- 数据元素
```

**★ 沙箱 2 分钟超时会打断批量删除**（每次 `call-adt-tool.js` 都要冷启一个 MCP server，单次约 30~40 秒）⇒ **每批 ≤ 2 个对象**，删完核对已删清单再续下一批。

**留档**：删前把 `DD03L` / `DD40L` 全量导出到 `backup/<日期>_delold/`，并写明清单、引用核查结论、执行顺序与验证结果。

---

## ★ 传输请求登记（E071）——`TR_OBJECTS_INSERT` 不可用，TTYP 还会被静默丢弃（2026-10-12 实测）

**背景**：建完 DDIC 对象后**必须单独核 E071**，不能假定 ADT 一定登记上了。
实测 `TABL ZBPM_ISC002_ITEM` 与 `TTYP ZBPM_ISC002_ITEM_T` 建对象时**两个都没进请求**，
而同批的 FUGR / `_I` / `_O` 登记了。留下的是「传输过去缺对象、目标系统激活失败」。

```sql
-- 核：该请求/任务下到底有哪些条目
SELECT trkorr, as4pos, pgmid, object, obj_name, lockflag FROM e071
  WHERE trkorr = 'DEVK900007' ORDER BY as4pos
-- 注意 E071 主键是 TRKORR + AS4POS（NUMC6，非 0），字段只有 10 个、无 MANDT（跨集团）
```

**ADT 侧独立复核（推荐，比读表更权威）**：`GetTransport` 会带出 `wbtype` / `position` / 描述：

```bash
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/call-adt-tool.js GetTransport \
  '{"transport_number":"DEVK900006","include_objects":true,"include_tasks":true}'
```

### 坑 1：`TR_OBJECTS_INSERT` 在无头环境必炸

它把 **`iv_with_dialog` 硬编码为 `'X'`**（FM 源码里写死的），于是内部会弹
`TRINT_POPUP_EDIT_CANCEL_SHOW`，无头运行（`adt.js run` / RFC）直接短转储
**`DYNPRO_SEND_IN_BACKGROUND`，终止程序 `SAPLSTRD`**。传 `iv_no_standard_editor='X'`
和 `iv_no_show_option='X'` **都挡不住**。

### 正解：改调内部 FM，把 `iv_with_dialog` 置 `'D'`

`TR_OBJECTS_INSERT` 只是转调 `TRINT_OBJECTS_CHECK_AND_INSERT`。后者源码里：

```abap
IF iv_with_dialog CA ' D'.        " 'D' 或空 ⇒ 抑制对话
  ls_g-dialog = ' '.  ls_g-suppress_dialog = 'X'.
ELSE.                             " 'X' ⇒ 开对话
  ls_g-dialog = 'X'.  ls_g-suppress_dialog = ' '.
ENDIF.
```

所以**直调内部 FM + `iv_with_dialog = 'D'`** 即可无对话插入：

```abap
DATA: lt_ko TYPE tredt_objects, lt_e071k TYPE tredt_keys, ls_ko TYPE ko200.
ls_ko-pgmid = 'R3TR'. ls_ko-object = 'TABL'. ls_ko-obj_name = 'ZBPM_ISC002_ITEM'.
APPEND ls_ko TO lt_ko.

CALL FUNCTION 'TRINT_OBJECTS_CHECK_AND_INSERT'
  EXPORTING
    iv_order              = 'DEVK900007'   " 传任务号；回传 ev_order=父请求 ev_task=任务
    iv_with_dialog        = 'D'            " ★ 关键：'D' = 插入但不对话
    iv_send_message       = ''
    iv_no_show_option     = 'X'
    iv_no_standard_editor = 'X'
  IMPORTING
    ev_order              = lv_order
    ev_task               = lv_task
  CHANGING
    ct_ko200              = lt_ko            " KO200: PGMID/OBJECT/OBJ_NAME 三个就够
    ct_e071k              = lt_e071k
  EXCEPTIONS
    OTHERS                = 99.
```

`KO200` 其余字段（TRKORR/AS4POS/OBJFUNC/LOCKFLAG/…）**由 FM 自己填**，调用方不用给。
`ct_ko200` 是 CHANGING，返回后**行数不变不代表都插进去了**——必须回查 E071。

### 坑 2：`R3TR TTYP` 会被静默丢弃

同一个 FM 批量里，`TABL` 插进去了，**`TTYP` 悄无声息地没插**（`subrc = 0`、无异常、
单条重试也一样）。原因未在 SAP 侧查明。而系统里 `R3TR TTYP` 的既有条目有 **42 万条**，
证明类型本身合法（`SELECT ... FROM e071 WHERE object = 'TTYP'` 可自证）。

⇒ **兜底：按既有条目样式直接补写 E071 行**（与 SAP 自己写的内容等价，可验证、可回滚）：

```abap
SELECT MAX( as4pos ) FROM e071 INTO lv_pos WHERE trkorr = c_trkorr.
lv_pos = lv_pos + 1.                    " 续号，避免撞主键
CLEAR ls_e071.
ls_e071-trkorr = c_trkorr.  ls_e071-as4pos = lv_pos.
ls_e071-pgmid  = 'R3TR'.    ls_e071-object = 'TTYP'.
ls_e071-obj_name = 'ZBPM_ISC002_ITEM_T'.
ls_e071-lockflag = 'X'.                 " 与 ADT 写入的行一致；OBJFUNC/GENNUM/LANG/ACTIVITY 留空
INSERT e071 FROM ls_e071.  COMMIT WORK.
```

补完**必须**再用 `GetTransport` 复核一遍对象清单，别只看自己的 INSERT 返回值。

### 相关：短转储排查三板斧

`adt.js dump <id>` 常报 404；走 MCP：

```bash
node scripts/call-adt-tool.js RuntimeListFeeds '{"feed_type":"dumps","max_results":25}'
node scripts/call-adt-tool.js RuntimeGetDumpById '{"dump_id":"<最后一段>"}'
```

- `dump_id` **不能含 `/`**，只传 id 的最后一段（带 `%20` 也照传）。
- 看 `terminatedProgram` + 错误章节里的 `adt://.../fmodules/<弹窗FM>/source/main#start=<行>`，
  即可直接定位到是哪个弹窗函数在炸——本次就是这样揪出 `TRINT_POPUP_EDIT_CANCEL_SHOW` 的。
