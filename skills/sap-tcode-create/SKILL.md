---
name: sap-tcode-create
description: 通过 ADT 通道批量创建 SAP 事务码（TCODE）的完整方法——ADT 本身没有事务码资源，必须写 $TMP 报表调用 SE93 宿主函数组 SAPLSEUK 的标准 API `RPY_TRANSACTION_INSERT`，其中 transaction_type 必须用类型池 STSTC 的常量 `ststc_c_type_report`（不要去猜常量值）。含参数全表、S/4 OPEN SQL 的 INTO 硬要求、TCODE 落地后的四表校验法，以及「ADT 环境下 BDC 无法驱动选择屏幕」这一验证陷阱。当需要给新程序配 TCODE、批量建事务码、或验证 TCODE 是否真正可用时加载。
agent_created: true
---

# SAP 事务码（TCODE）创建（ADT 通道）

适用项目：示例客户 SAP ERP（`~/ABAP-AI`，系统 DEV，client 100）。

## 0. 前提：ADT 通道没有 TCODE 资源

先确认再动手：抓 `/sap/bc/adt/discovery`，顶层集合里有 `programs / ddic / functions / classes / textelements / …`，**没有 tcodes**。所以事务码不能像程序、DDIC 对象那样直接 PUT 出来。

可行路径只有两条：

- **A（推荐）**：写 $TMP 报表调标准 API `RPY_TRANSACTION_INSERT`，由 SAP 自身完成一致性登记。
- **B（不推荐）**：直接 INSERT `TSTC`/`TSTCT`。绕过 `RS_CORR_INSERT` 会漏掉 TADIR/E071 登记，留下"表里有事务码、请求里没有"的不一致。

下面只讲 A。

## 1. 找到并确认 API

SE93 的实现程序不是 `SAPLSE93`，而是 **`SAPLSEUK`**（查 `TSTC WHERE tcode='SE93'` → `PGMNA=SAPLSEUK, DYPNO=0390`）。

```sql
SELECT funcname, pname FROM tfdir WHERE pname = 'SAPLSEUK'
```

里面有 `RPY_TRANSACTION_INSERT / DELETE / READ`、`RS_TRANSACTION_ADD / CHECK / LIST` 等。**用 `RPY_TRANSACTION_INSERT`**。

读它的源码（`get_source.js FM RPY_TRANSACTION_INSERT SAPLSEUK`）可确认它内部依次做：  
`SELECT SINGLE tstc` 查重 → `RS_ACCESS_PERMISSION`（锁）→ `RS_CORR_INSERT`（**登记 TADIR + E071**）→ `CASE transaction_type` 写 `TSTC`/`TSTCT`/`TSTCC` → `RS_TREE_OBJECT_PLACEMENT` → 解锁。

## 2. 参数（照抄即可）

```abap
CALL FUNCTION 'RPY_TRANSACTION_INSERT'
  EXPORTING
    transaction       = <TCODE>        " 事务码，必输
    program           = <PROGRAM>      " 目标程序，必输
    transaction_type  = ststc_c_type_report
    shorttext         = <文本>          " TSTCT-TTEXT，中文直接写
    language          = '1'            " 1=ZH。ADT 会话 sy-langu 是 EN，不显式指定会写成英文
    development_class = 'ZFICO'        " 包
    transport_number  = 'DEVK9000xx'   " 请求/任务号，见 §3
  EXCEPTIONS
    cancelled = 1  already_exist = 2  permission_error = 3
    name_not_allowed = 4  name_conflict = 5  illegal_type = 6
    object_inconsistent = 7  db_access_error = 8  OTHERS = 9.
```

### 2.1 `transaction_type` 是最大的坑

`transaction_type` 的类型是 `rglif-docutype`（**CHAR1**），函数体里 `CASE transaction_type` 用常量比较，且**没有 `WHEN OTHERS` 分支**。也就是说：

> 传错值 → CASE 全不匹配 → **什么都不做，函数照样正常返回 sy-subrc = 0**，  
> 但 `RS_CORR_INSERT` 已经在 CASE **之前**跑过了 → **TADIR 里多出一条 TRAN 记录、TSTC 里什么都没有**。

静默失败 + 脏 TADIR，所以**不要靠试错猜值**。这些常量来自**类型池 `STSTC`**（`TADIR` 里 `obj_name=STSTC, object=TYPE, devclass=SEUA_TRAN`），直接引用常量名即可：

```abap
transaction_type = ststc_c_type_report      " 报表事务（程序与选择屏幕），TSTC-CINFO = '80'
```

**无需 `TYPE-POOLS: ststc.` 声明**（ABAP 7.40+ 自动解析类型池组件；SAPLSEUK 自己的 `LSEUKF01` 也没声明）。可用的同族常量：`ststc_c_type_dialog`（对话框，CINFO=`00`，需 dynpro）、`ststc_c_type_report`（报表，CINFO=`80`，dynpro 固定写 1000）、`ststc_c_type_parameters`（参数）、`ststc_c_type_variant`（带变式）、`ststc_c_type_object`（OO 事务）。

对照实测：本系统既有 `ZFI004→ZFID004`、`ZFI005→ZFIR005`，`TSTC-CINFO` 都是 **`80`**。新建后拿这个值对齐。

### 2.2 `language`

不传或依赖默认会沿用会话语言。**ADT 运行会话 `sy-langu = EN`**，务必显式 `language = '1'`，否则 TSTCT 落到 `SPRSL='E'`。

## 3. 请求号传哪个

`transport_number` 一路透传给 `RS_CORR_INSERT` 的 `korrnum`。

先查归属：`SELECT trkorr, pgmid, object, obj_name FROM e071 WHERE obj_name = 'ZXXX'`。  
再判该号是请求还是任务：`SELECT trkorr, trfunction, trstatus, strkorr FROM e070 WHERE trkorr = '…'`（`K`=工作台请求、`W`=定制请求、`S`=开发任务、`Q`=定制任务、`R`=修复任务；任务行的 `STRKORR` 指向其父请求）。

**传与目标程序同一个任务号**（SE93 手工建时弹出的"选择请求"里列的就是任务），这样 TCODE 和程序落在同一任务下，最一致。

> 注意与 ADT 的 `CORR_NR` 规则区分：**ADT LOCK/PUT 传父请求号，`RS_CORR_INSERT` 传任务号**。两者是不同函数的不同要求，别互套。

## 4. S/4 的 OPEN SQL 硬要求

$TMP 校验报表里如果写 `SELECT SINGLE * FROM tstc WHERE tcode = @lv.` 然后用工作区 `tstc-xxx` 读字段，激活会直接失败：

```
[E] A target area must be specified using an INTO clause.
[E] Field "TSTC-TCODE" is unknown.
```

S/4 下必须显式给目标区（或在 `TABLES` 里声明）。正确写法：

```abap
DATA ls_tstc TYPE tstc.
SELECT SINGLE * FROM tstc INTO ls_tstc WHERE tcode = lv_tcode.
IF sy-subrc = 0. WRITE: / ls_tstc-tcode, ls_tstc-pgmna, ls_tstc-dypno, ls_tstc-cinfo. ENDIF.
```

## 5. 落地后的四表校验（缺一不可）

| 表       | 期望                                               |
| ------- | ------------------------------------------------ |
| `TSTC`  | `PGMNA` = 程序、`DYPNO` = `1000`、**`CINFO` = `80`** |
| `TSTCT` | `SPRSL = '1'`，文本为中文                              |
| `TSTCC` | 有记录（分类/属性表，函数内部会建）                               |
| `TADIR` | `R3TR TRAN`，`DEVCLASS` = 目标包                     |
| `E071`  | 挂在预期的请求/任务下                                      |

```sql
SELECT tcode, pgmna, dypno, cinfo FROM tstc WHERE tcode LIKE 'ZXXX%';
SELECT tcode, sprsl, ttext FROM tstct WHERE tcode LIKE 'ZXXX%';
SELECT trkorr, pgmid, object, obj_name FROM e071 WHERE obj_name LIKE 'ZXXX%' AND object = 'TRAN';
SELECT obj_name, devclass FROM tadir WHERE obj_name LIKE 'ZXXX%' AND object = 'TRAN';
```

## 6. 验证"TCODE 真能用"

**别用 BDC 去驱动调用方程序的选择屏幕。** 在 ADT 运行会话（无 GUI）下，`CALL TRANSACTION 'Zxxx' USING bdcdata MODE 'N'` 会直接 500：

```
批输入数据中不存在开始 dynpro (Message 00 378)
```

这是会话环境限制，不是代码问题——排查半天也修不好。

改用**跳过首屏**的调用探针，一次性验完一批：

```abap
LOOP AT lt_item INTO ls_item.
  CLEAR sy-subrc.
  CALL TRANSACTION ls_item-tcode AND SKIP FIRST SCREEN.   " 变量作为事务码合法
  WRITE: / ls_item-tcode, '=> sy-subrc =', sy-subrc.
ENDLOOP.
```

全部 `sy-subrc = 0` 即说明：事务码已落库、无缓冲问题、可被正常调起。  
（还有更直观的一条：给调用方程序配好 TCODE 后，`CALL TRANSACTION <程序同名TCODE> AND SKIP FIRST SCREEN` 也能跑通。）

## 7. 参考：本项目的落地样例

2026-09-17 为「付款平台」入口 `ZFID001` 配 TCODE（程序全在包 `ZFICO`，请求任务 `DEVK900007` / 父请求 `DEVK900006`）：

| TCODE    | 程序       | 短文本         |
| -------- | -------- | ----------- |
| ZFID001  | ZFID001  | 付款平台        |
| ZFID001A | ZFID001A | 付款处理(推送CBS) |
| ZFID001B | ZFID001B | 付款审批        |
| ZFID001C | ZFID001C | 收款认领        |
| ZFID001D | ZFID001D | 付款结算处理      |

执行脚本与程序：

- 创建程序 `scripts/ZTEST_TCODE_CREATE.abap`（$TMP，不传输）
- 验证程序 `scripts/ZTEST_ZFID001_BTN.abap`

### 关于 `RS_TRANSACTION_ADD`

同在 `SAPLSEUK`，但签名是 `objectname + client_warning + data_part + monitor_activate`，内部 `PERFORM wm_init_manager` 走 Workbench Manager 流程（面向交互式编辑器），**不适合无头批量创建**。批量场景一律用 `RPY_TRANSACTION_INSERT`。
