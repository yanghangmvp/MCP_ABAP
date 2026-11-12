---
name: sap-json-interface-mapping
description: 让 ABAP 出向/入向接口的 JSON 报文字段名精确命中对方契约的完整手法——用 /ui2/cl_json 的 name_mappings 强制大小写（serialize 按 abap 键查、deserialize 按 json 键查，请求与返回必须各备一张表）、compress 置 X 会丢掉取值为空的必选字段、唯一键 abap 导致跨层级同名字段无法分别映射（改名化解）、以及用 $TMP 探针做「基线 / 有映射 / 无压缩」三形态对照 + 逐键断言 + 文档返回样例反序列化的验证套路。当接口报文出现 userId 与 JSFPH 这类混合大小写、或对方要求「字段必须存在（允许为空）」、或怀疑 pretty_name='X' 生成的名字对不上契约时加载。
agent_created: true
---

# ABAP 接口 JSON 报文字段名与空值控制（/ui2/cl_json）

适用项目：示例客户 SAP ERP（`~/ABAP-AI`，系统 DEV）。参照实现：`ZBPM_ISC012`（函数组 `ZFG_BPM012`）、探针 `scripts/ZTEST_ISC012_JSON.abap`。

## 1. 结论先行：`pretty_name` 解决不了大小写，必须用 `name_mappings`

`/ui2/cl_json=>serialize( pretty_name = 'X' )`（`pretty_mode-camel_case`）的算法是：
**整体转小写 → 按 `_` 切 token → 从第 2 个 token 起首字母大写**。

| ABAP 组件名 | `pretty_name='X'` 产出 | 期望 |
|---|---|---|
| `USERID`（单 token） | `userid` | `userId` |
| `USAGEDESC` | `usagedesc` | `usageDesc` |
| `JSFPH` | `jsfph` | `JSFPH` |
| `KPRQ_H` | `kprqH` | `kprq` |
| `PROCESS_INST_ID` | `processInstId` | `processInstId` ✅ |

⇒ 只有「多 token 下划线名」才碰巧正确。**混合大小写（小写驼峰 + 全大写）的报文只能逐字段指定。**

## 2. `name_mappings` 的语义（读 `/UI2/CL_JSON` 源码实证）

```abap
TYPES: BEGIN OF name_mapping,
         abap TYPE abap_compname,     " ABAP 组件名（构造时 TRANSLATE ... TO UPPER CASE）
         json TYPE string,            " 目标报文键名
       END OF name_mapping.
TYPES: name_mappings TYPE HASHED TABLE OF name_mapping WITH UNIQUE KEY abap.
```

- **查表键是原始 ABAP 组件名**，不是 pretty 之后的串：
  `pretty_name` 方法内 `READ TABLE mt_name_mappings WITH TABLE KEY abap = in ASSIGNING <cache>`，
  命中即 `out = <cache>-json`，未命中才走大小写转换。所以映射表键写**组件名大写**。
- **方向不同、表不同**：
  - `serialize` → `mt_name_mappings`，**键 `abap`**（填 ABAP 组件名）；
  - `deserialize` → `mt_name_mappings_ex`（`WITH UNIQUE KEY json`），**键 `json`**（填报文键名，
    反序列化的 `get_fields` 会把映射名加进候选键里）。
  ⇒ **请求体、返回体各备一张表**，别硬塞一张（也正好避开 `ERRORCODE`/`ID` 在两个结构里重名的唯一键冲突）。
- `name_mappings` 非空时，构造函数会把 `pretty_name=''` 自动升为 `'U'(user)`；传 `'X'` 则保持不变。
  **实测两种模式下映射都生效**，保持原来传 `'X'` 即可。

## 3. 标准写法

```abap
  DATA: lt_map_req TYPE /ui2/cl_json=>name_mappings,
        lt_map_res TYPE /ui2/cl_json=>name_mappings.

  "请求体：ABAP 组件名 -> 目标报文键名
  lt_map_req = VALUE #(
    ( abap = 'USERID'       json = 'userId'      )
    ( abap = 'SUPPLIERCODE' json = 'supplierCode' )
    ( abap = 'KPRQ_H'       json = 'kprq'        )
    ( abap = 'ITEMS'        json = 'items'       )
    ( abap = 'JSFPH'        json = 'JSFPH'       )   " 全大写也要显式登记，否则被压成 jsfph
    ( abap = 'SE'           json = 'SE'          ) ).

  "返回报文：报文键名 -> ABAP 组件名（方向相反）
  lt_map_res = VALUE #(
    ( abap = 'MSG'           json = 'msg'           )
    ( abap = 'ERRORCODE'     json = 'errorCode'     )
    ( abap = 'PROCESSINSTID' json = 'processInstId' )
    ( abap = 'FORMNO'        json = 'formNo'        ) ).

  "★ compress 必须为空 —— 见 §4
  lv_data = /ui2/cl_json=>serialize( data          = is_data
                                     compress      = ''
                                     pretty_name   = 'X'
                                     name          = ''
                                     name_mappings = lt_map_req ).

  /ui2/cl_json=>deserialize( EXPORTING json          = lv_response
                                       pretty_name   = 'X'
                                       name_mappings = lt_map_res
                             CHANGING  data          = es_data ).
```

## 4. ★ `compress` 置 `'X'` 会丢掉「取值为空的必选字段」

`serialize` 的 `compress` 默认就是 `false`，一旦传 `'X'` 就会**省略所有初始值字段**。

接口文档常把某些字段标为**必选 Y 却允许为空**（BPM 538 的 `zckph`，报样例里明确写着 `"zckph": ""`）。
压缩后该键直接消失，对方可能判报文非法。

⇒ **接口报文的 `compress` 一律传空**。要缩体积也不能靠它，否则必选空字段丢失。

## 5. 跨层级同名字段的冲突（唯一键 `abap` 的硬限制）

`name_mappings` 唯一键是 `abap`，所以**同一个 ABAP 组件名只能映射到一个报文名**。
抬头 `KPRQ` 要 `kprq`、明细 `KPRQ` 要 `KPRQ` —— 无解，必须**改一方的组件名**。

处置（`ZBPM_ISC012` 实例）：把抬头字段改名 `KPRQ_H`，再映射成 `kprq`。

```bash
# 结构改名走 UpdateStructure（UpdateTable 对 INTTAB 回 "PUT not supported"）
# 步骤：lock → check_new_code → update → unlock → check_inactive → activate
echo '{"structure_name":"ZBPM_ISC012_HEAD","ddl_code":"<完整 DDL>","transport_request":"DEVK900006","activate":true}' > /tmp/args.json
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/call-adt-tool.js UpdateStructure @/tmp/args.json
```

改完必须同步调用方程序里的字段引用（本例 `ZFID004` 的 `ls_in-kprq` → `ls_in-kprq_h`），
**即使该字段当前恒为空，赋值语句也要改**，否则激活报 `component not found`。

> 反例：返回体里 `ERRORCODE` / `ID` 同时出现在 `_OUT` 与 `_OUT_DATA` —— 但目标名相同，
> 只登记一次即可，不构成冲突。

## 6. 验证套路：`$TMP` 三形态探针（不要凭源码推断）

`format_name` 是类 include 里的宏，ADT 读 `GetClass` 拿不到（`GetIncludesList` 也常回 "No includes found"）。
**别在源码上考古，直接跑探针**。范式 `scripts/ZTEST_ISC012_JSON.abap`：

1. **三形态对照**（同一份样例数据）：
   - `[1]` 无映射 + `compress='X'`（基线，证明"不改会错"）
   - `[2]` 有映射 + `compress='X'`
   - `[3]` 有映射 + `compress=''`（目标形态）
2. **逐键断言**：把所有目标键（带引号与冒号，如 `` `"userId":` ``）放进 `STANDARD TABLE OF string`，
   循环 `IF lv_js CS lv_key.` 统计缺失项，**打印缺失条数 + 明细**，不要只肉眼看 JSON。
3. **返回侧**用文档给的返回样例字符串 `deserialize`，逐字段 `WRITE` 出 `MSG/RESULT/ERRORCODE/ID/DATA-*`。
4. **打印完整 JSON 时分块**：`WRITE` 单行会被列表宽度折行，用
   `lv_take = lv_len - lv_off. IF lv_take > 120. lv_take = 120. ENDIF. WRITE: / lv_js+lv_off(lv_take).` 循环。
5. **探针里不要定义 `FORM`**（激活报 `Statement is not accessible`，而 `CheckProgram` 零错误）——全部内联。

实测结果（`ZBPM_ISC012`，33 个键）：

| 形态 | 缺失键 |
|---|---|
| 无映射 + `compress='X'` | `zckph` 1 项（且大小写全错） |
| 有映射 + `compress='X'` | `zckph` 1 项 |
| 有映射 + `compress=''` | **0 项** |

## 7. 收尾：证明「探针证据 = 生产代码行为」

探针里的映射表是复制的，必须证明它与落库后的函数**逐条一致**，否则证据不成立。
用脚本把两边 `abap = '...' json = '...'` 抽出来做**集合差**（零差集才算过）：

```bash
# 1) 回读 SAP 端函数源码
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/get_source.js FM ZBPM_ISC012 ZFG_BPM012 --out=/tmp/after.abap
# 2) 提取两侧 VALUE #( ... ) 里的 ( abap = ... json = ... ) 对，做差集
#    见本次实现：Node 正则 /abap\s*=\s*'([^']+)'\s+json\s*=\s*'([^']*)'/g
```

同时确认：`serialize` 调用含 `name_mappings = lt_map_req` 且 `compress = ''`；
`deserialize` 含 `name_mappings = lt_map_res`。

## 8. 交付检查清单

```bash
SAP_ENV_FILE=$PWD/portable/env/dev.env CORR_NR=DEVK900006 TARGET_GROUP=ZFG_BPM012 TARGET_FM=ZBPM_ISC012 \
  SRC_FILE=$PWD/scripts/ZBPM_ISC012.abap node scripts/push_fm_source.js
SAP_ENV_FILE=$PWD/portable/env/dev.env CORR_NR=DEVK900006 PKG=ZFICO SRC_FILE=$PWD/scripts/ZFID004.abap \
  node scripts/push_prog_source.js
echo '{"function_group_name":"ZFG_BPM012","function_module_name":"ZBPM_ISC012"}' > /tmp/fm.json
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/call-adt-tool.js CheckFunctionModule @/tmp/fm.json
```

- [ ] 映射表：请求/返回分开；全大写字段也显式登记；无重复 `abap` 键
- [ ] `compress = ''`
- [ ] 结构改名后调用方同步改
- [ ] `CheckFunctionModule` active / 0 错 0 警；`CheckProgram` 0 错（原有警告不算）
- [ ] `check_activation.js` 无相关未激活对象
- [ ] 映射表与探针逐条一致（零差集）
- [ ] 改前备份落 `backup/`

## 9. 环境坑

- **BSD grep 不支持 `\|`**：`grep -n "kprq_h\|ls_in-kprq"` **静默无输出**，会被误读成"改动没落地"。
  多关键字一律 `grep -E`，或直接 `grep -i kprq`。
- `/UI2/CL_JSON` 的 `format_name` / `format_list_output` 是宏，不在 ADT 返回的类主源码里；
  `GetIncludesList` 对该类回 "No includes found"。**不要靠源码考古定行为，跑探针。**
