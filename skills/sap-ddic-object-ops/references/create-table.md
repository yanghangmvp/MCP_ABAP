# 建表：从建壳到激活

> 主册：[`../SKILL.md`](../SKILL.md)。一条铁律先记住：**`CreateTable` 建空壳（顺手建好 DD09L 技术设置）
> → `UpdateTable` 写全量 DDL 并激活**。手工/半途建出来的表壳没有 DD09L，激活必报「维护和保存技术设置」，
> 那时**不要打补丁，删了重建**。

## 建表的正确起点：CreateTable 建壳 → UpdateTable 填字段（2026-09-29 定案）

**必须用 `CreateTable`（空壳）起头**，它落地时**顺手建好 DD09L 技术设置**；
`UpdateTable` 只负责写 DDL + 激活。步骤与验证：

```bash
node scripts/call-adt-tool.js CreateTable '{"table_name":"ZTEPIC07","description":"票据信息表","package_name":"ZFICO","transport_request":"DEVK900006"}'
node scripts/call-adt-tool.js UpdateTable "$(cat /tmp/xxx_update.json)"   # 完整 DDL + activate:true
# 验证：DD02L.AS4LOCAL='A' / DD09L 有行且与同族表一致 / TADIR.MASTERLANG=1
#   SELECT tabname, as4local, tabkat, tabart, pufferung, protokoll FROM dd09l WHERE tabname IN ('ZTEPIC01','ZTEPIC07')
```

**手工（或半途）建出来的表壳没有 DD09L 技术设置**，激活必报 `[E] 维护和保存 <表> 的技术设置`。
此时**不要去打补丁**：

- `GetTableTechnicalSettings` 报 *Table X has no technical settings object*
- `SetTableTechnicalSettings` 报 **404 + `从数据库导入对象 X 时出错`**（表没有激活版本，ADT 的设置资源根本读不出来，且 handler 先 GET 后 PUT，连写的机会都没有）
- `DDIF_TABT_PUT/DDIF_TABT_ACTIVATE`（$TMP 调 DDIC API 硬写 DD09L）能绕过，但要手填 `DD09V`、还和 DDL 源混用，**不推荐**

⇒ **正解：`DeleteTable` → `CreateTable` → `UpdateTable`**（表无数据、无引用时零风险；重建后 `TADIR`/`E071` 自动回到同一包与同一任务下）。

## S/4 建表的两个硬校验（激活直接取消，不是警告）

1. **`@AbapCatalog.deliveryClass` 必填** —— 缺了报
   `Mandatory annotation "AbapCatalog.deliveryClass" for structure X is missing`。
   原表 `DD02V-CONTFLAG` 是空白的，看 abapGit XML 也看不出该填什么；自建业务数据表取 **`#A`**。
2. **CURR 字段必须带币种引用**：`@Semantics.amount.currencyCode : '表名.币种字段'`，
   且被引用的 CUKY 字段必须在**同一张表内**，否则报
   `Annotation with reference to currency code for field X is missing`。
   **表里没有币种字段时 CURR 根本建不出来** —— 改用**同长度** `abap.dec( n, d )`
   （ABAP 层同为 P 类型、长度小数一致，程序读写零差别，只是 DDIC 少了币种语义）。
   ECC 老系统无此校验，从原系统照搬的旧表定义最容易撞上这一条。
   **引用标准 CURR 数据元素同样被拦**（`zpjje : awkgr;` → 同一条报错），不是只有 `abap.curr(...)` 会撞；
   反过来说，只要表内真有 CUKY 字段，引用 CURR 数据元素才是首选写法（见 `ZTEPIC01` 的 `zfkje : dbtrg;` 配 `waers`）。
   字典里写了 CURR 但表内无币种字段 ⇒ 直接降级 `abap.dec(n,d)` 并在交付里说明（ZTEPIC02、ZTEPIC07 先例）。
3. **激活报「无法生成表 X 的名称表」(D0 408) —— 头号原因是 DDL 引用了不存在的数据元素**
   （或域）。报错文案完全不提示是哪个字段，必须自己找：
   - 用 `adt_ddic.js probe dtel <名>` 逐个核（不存在返回 **404「从数据库导入对象 <名> 时出错」**）；
   - 批量：`grep -oE ': [a-z_][a-z0-9_]*( not null)?;' DDL.txt | sed -E 's/: //; s/( not null)?;//' | tr a-z A-Z | sort -u`
     与 `SELECT rollname FROM dd04l WHERE as4local='A'` 的结果 `comm -23` 对比；
   - **二分法最快**：保留主键 + 按顺序递增非主键字段，逐个 `UpdateTable`，第一个 FAIL 的 n 就指向坏字段
     （照 §4 范式二写个「递增保留字段数」的循环即可）。本次实测 n=1 即命中。
   - 参考：**主键长度 >120 只是 WARNING**（`activation_warnings` 里会出现「键值长度 > 120（受限功能）」），
     不是失败原因。真正的硬上限是 **255**（≤16 个主键字段、键长 ≤255、字段总长 ≤1962）。

## 从原系统 abapGit XML 还原表（DDIC 已被删时唯一的救法）

DDIC 表被删后 **没有任何系统内痕迹可挖**：`DD02L`/`DD03L`（含未激活版本）、`DDDDLSRC`(DDL 源)、
`VRSD`(版本管理)、`D010TAB`(程序引用) 全部为空，物理表也已 DROP（可用 ADBC 查 `SYS.TABLES` 复核），
`TADIR` 只剩 `DELFLAG='X'`。**唯一出路是从原/源系统导 abapGit XML**：

```bash
# 1) 解析 .tabl.xml（DD02V = 表属性；每个 DD03P = 一个字段：POSITION/KEYFLAG/ROLLNAME/DATATYPE/LENG/DECIMALS）
#    生成 DDL：字段顺序按 POSITION，主键字段前置并加 not null，类型统一用 ROLLNAME（数据元素）
# 2) 先核对所有 ROLLNAME 是否在本系统存在：
#    SELECT rollname, datatype, leng, decimals FROM dd04l WHERE rollname LIKE 'Z%'   # 一次拉全量再本地比对
#    注意 XML 里的 DATATYPE/LENG/DECIMALS 是**表字段**的实际值，
#    可能与该数据元素在本系统的定义不一致（本次就撞到 ZBCSQFKJE：原系统 CURR13,2 / 本系统错建成 CHAR13）
# 3) CreateTable → UpdateTable(activate=true)，范式见 §4 范式二
# 4) 验证：逐字段比对 dd03l vs XML（位置/主键/ROLLNAME/类型/长度/小数），并 SELECT COUNT(*) 试读
```

- 表名在 `TADIR` 带删标记不影响新建 —— `CreateTable` 会把删标记清掉，`MASTERLANG` 正确落 1(ZH)。
- 若对象上一轮已建过一半（inactive），**`CreateTable` 会报 CSRF/已存在，但 `UpdateTable` 照样能落地激活** → 脚本里 create 失败要**继续**走 update。

## ADBC 取证：直接查 HANA 系统视图（绕过 DDIC）

```abap
" $TMP ZZTEST_TAB_META —— 只读，无选择屏幕，adt.js run 可直接跑
lo_con  = cl_sql_connection=>get_connection( ).
lo_stmt = lo_con->create_statement( ).            " cl_sql_statement=>create( ) 不存在
lo_res  = lo_stmt->execute_query( `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE_NAME, LENGTH, SCALE, POSITION FROM SYS.TABLE_COLUMNS WHERE ...` ).
lo_res->set_param_table( lr_tab ).  lo_res->next_package( ).
```
- `next_package( )` **不要传参数**（`package_size` / `row_count` 在这个系统上都不认，报 "formal parameter does not exist"）。
- **statement / connection 的 `close( )` 在这个系统上不存在**（报 `Method "CLOSE" is unknown`）—— 去掉才能激活；读完用 `lv_cnt = lines( lt )` 自己数行。
- 报错会**连锁**：只要一个方法签名不对，后面所有方法都跟着报 unknown，别被后面的假报错带偏。
