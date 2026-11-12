# 无头运行报错定位（§3 / §8.1 / §8.1.1）

> 主册：[`../SKILL.md`](../SKILL.md)。三条线：
> ① 接口只回一句拼接消息 → 定消息号 + 场景表驱动诊断报表；
> ② 500 有短文本 → 短文本反查运行时错误名；
> ③ 500 短文本为空 → 用 `$TMP` E2E 副本切开「ALV 渲染限制」与「真实转储」。

## 3. 排查「只回一句拼接消息」的报错

FM 常把 `BAPIRET2` 拼成 `/msg1/msg2/…` 返回，信息量不足。做法：

1. **先定消息号**：`SELECT arbgb, msgnr, sprsl, text FROM t100 WHERE text LIKE '%关键字%'`（`sprsl='1'` 中文 / `'E'` 英文），拿到 MSGID+MSGNO 才知道是哪类检查。
2. **再写场景表驱动的诊断报表**：`TYPES BEGIN OF ty_scen … END OF ty_scen` + `lt_scen = VALUE #( ( … ) ( … ) )`，循环调用 `BAPI_ACC_DOCUMENT_CHECK` 等接口，**逐条打印 `MSGTYP/MSGID/MSGNO/MESSAGE_V1..V4`**（不要只看拼接后的文本）。
3. **一次只改一个变量**（换业务伙伴 / 去某行 / 换记账码 / 去成本中心 / 加纯总账对照组），用「哪组通过」把范围夹死。
4. 怀疑主数据就**逐字段 diff 两个业务伙伴**：`SELECT lifnr, ktokk, name1, sperr, loevm FROM lfa1 WHERE lifnr IN (...)` + `lfb1` 同查。

**已踩过的实例**：FI 过账失败只回 `Error in document: BKPFF $ …/Account 100001 5000 is blocked for posting`。消息号定位到 `F5 351`（总账科目过账冻结，参数=科目+公司代码），但该科目在科目表里根本不存在——因为 `100001` 其实是业务伙伴号 `0000100001` 去前导零后的显示值。逐字段 diff 发现根源是 **`LFA1-SPERR = 'X'`（业务伙伴集中冻结）**，接口代码无缺陷。**教训：消息里的"科目"不一定是科目，先换算 ALPHA=OUT 再判断。**

## 8.1 ★ 无头运行返回 500：先用「短文本 → 运行时错误名」反查根因

`adt.js run` 遇到运行时错误会返回 **HTTP 500 + 一个 HTML 错误页**，此时**程序里所有 `WRITE` 输出全部丢失**
（拿不到任何中间进度），页面里只有一句短文本，例如：

```
Error in ABAP statement while processing an internal table. (Message 20260920150104gsdcs4dev01_DEV_00 ...)
```

**正确姿势（比二分法快得多）**：把这句短文本丢给 WebSearch，命中 `sapfixhub.com/dumps/...` 就能拿到运行时错误名与「Error analysis」原文。

| 短文本 | 运行时错误名 | 触发条件 |
|---|---|---|
| `Error in ABAP statement while processing an internal table` | **`TABLE_INVALID_INDEX`** | `MODIFY/INSERT/DELETE ... INDEX n` 的 **n ≤ 0**（或 `FROM/TO n` 越界）。**直接转储，不是 sy-subrc=4** |
| `Illegal component access in internal table operation` | `ITAB_ILL_COMPONENT` | `ASSIGN COMPONENT` 的字段名/序号在行结构里不存在 |
| `No more storage space available for extending an internal table` | `TSV_TNEW_PAGE_ALLOC_FAILED` | 无 `UP TO n ROWS` 的大结果集 |
| `Field symbol has not been assigned yet` | `GETWA_NOT_ASSIGNED` | 访问未赋值的字段符号 |

**别试图读这次转储**：ADT 的 ST22 列表（`adt.js dumps`）**不包含**由 `programrun` 无头接口产生的转储
（今天 15:01 的转储在 `dumps` 的 20 条里完全不见），按 dump id 直读 `/runtime/dump/<id>/formatted` 返回 **404**。
**所以只能靠短文本反查 + 二分法**：把可疑 FORM 调用整段注释掉再跑，先确认边界。

## 8.1.1 ⭐ 短文本**为空**时：用「$TMP E2E 副本」一刀切开「ALV 限制」与「真实转储」

带 ALV 的报表无头运行可能 500 —— 但**不是必然**（2026-10-12 更正，见 §2）：
只有「ALV 调用之前有 `WRITE`」的程序必炸 `Screen output without connection to user`；
干净的 ALV 报表会降级成清单输出并正常返回 200。
麻烦的是它和真实转储**长得一样**：`HTTP 500` + `Application Server Error` 页。区分标志：

| 页面短文本 | 含义 |
|---|---|
| 有文字（如 `工厂 1000 未在 T001K 维护公司代码…`） | 程序里的 `MESSAGE ... TYPE 'E'`，正常终止 |
| **空的** ` (Message 00  001)` | 转储 **或** ALV 渲染失败 —— **光看这里分不出来** |

判据（实测可靠）：**同一次运行里，如果之前的分支本该先报 `MESSAGE` 却没报，就说明程序已经走过了那个分支**。
本例 `ZFID003`：集团 100 跑出 `工厂 1000 未在 T001K 维护…`，而集团 300 的 `T001K` 同样没有工厂 1000
（`SELECT bwkey, bukrs FROM t001k` 只有 0001/0003/5000/5099）却回了**空短文本** —— 说明它在别处先炸了。此时必须坐实。

**做法（推荐，一次搞定）**：`scripts/gen_e2e_harness.js` —— 把生产源码整份复制成 `$TMP` 新程序，**只做三处外科手术**：

```bash
HARNESS_JSON=scripts/harness/ZFID003.json node scripts/gen_e2e_harness.js --push
SAP_ENV_FILE=/tmp/sap300.env SAP_CLIENT_OVERRIDE=300 node scripts/adt.js run ZTEST_ZFID003_E2E
```

1. 改 `REPORT` 程序名；2. 改选择屏幕默认值（默认工厂往往不是有测试数据的工厂）；3. 把最后那行
`PERFORM frm_show_alv.` 换成自动追加的 `frm_e2e_dump`（用 `WRITE` 打印取数/汇总/字段目录/布局结果，并**反向再跑一次另一条视图分支**）。
配置见 `scripts/harness/<PROG>.json`（`replace` 是字符串替换表，`dumpForm` 是追加的 FORM 源码）。

**结论判读**：`frm_e2e_dump` 能跑完 = `frm_init_period` → 取数 → 汇总 → `frm_build_fcat` → `frm_layout` **全程无转储**，
即「500 是 ALV 限制」成立；若它自己 500，就是真缺陷，且已缩小到那条链路。

**两个必须知道的坑**：

- **新建 $TMP 程序的推送顺序**：先把源码推上去（程序对象才存在），**否则推文本元素报
  `Resource REPT ZTEST_XXX does not exist`（primer GET 404）**。本系统实测 `$TMP` 程序即使文本符号还没建，
  源码激活也会回 `final version => active`；稳妥起见仍按「推源码 → 推文本元素 → 再推一次源码」三步走。
- `gen_e2e_harness.js` 会顺带把 `scripts/textelements/<原程序>.json` 复制成新程序名的 JSON
  （`teSource` 字段），不然 `TEXT-nnn` 引用在新程序里没有符号池。
- **原程序没有独立文本元素对象时**（`teSource` 留空，如 `ZFIB001`）：把 `TEXT-nnn` 引用在
  `replace` 里**内联成字面量**（`|{ TEXT-001 }-{ sy-datum }|` → `|E2E-{ sy-datum }|`），
  并在 `dumpForm` 里用 `WRITE` 直接输出。`gen_e2e_harness.js` 早期版本在 `teSource` 缺省时
  仍会 `TE_FILE=null` 调 `push_textelements.js` → **ENOENT 崩溃**（2026-09-22 已修：无文本元素时跳过该步）。
- **动态内表的程序也能做 harness**：把取数 FORM 整段替换成自建造数 FORM，
  `lvc_t_fcat` 手写列名 + `cl_alv_table_create=>create_dynamic_table` 建表，
  再用 `ASSIGN COMPONENT` 按列名填值。列名必须与接口结构字段名一致
  （程序用 `MOVE-CORRESPONDING <fs_data> TO ls_item` 取值）。
  实测 `ZFIB001`：`scripts/harness/ZFIB001.json` → `ZTEST_ZFIB001_E2E`。
