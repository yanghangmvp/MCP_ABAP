# 改结构 / 嵌套组件 / 删字段连带

> 主册：[`../SKILL.md`](../SKILL.md)。结构（`INTTAB`）只能走 `UpdateStructure` 且必须传**完整 DDL**；
> 加嵌套表类型组件是实现「行包含在抬头里」的唯一 DDIC 侧动作。
> 删字段前先做连带检查 —— 函数组 include 里没人调用的残留 FORM 照样参与编译。

## 改结构：删/加字段（`UpdateStructure`）

```bash
# 1) 取当前 DDL 备份（结构变更前必做）
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/call-adt-tool.js GetStructure '{"structure_name":"ZSFII003_H"}'
# 2) 用脚本删掉目标字段行，产出新 DDL，封装参数文件
# 3) 提交（activate=true 一步到位）
SAP_ENV_FILE=$PWD/portable/env/dev.env node scripts/call-adt-tool.js UpdateStructure "$(cat /tmp/xxx_update.json)"
#    参数：{structure_name, ddl_code, transport_request, activate}
```

**`transport_request` 必须传「请求号」，不能传它下面的「任务号」。** 传错会被 SAP 拒成
「对象已被 <请求号> 锁住」，看着像死锁其实是参数问题。
父子关系查 `E070-STRKORR`：`SELECT trkorr, trfunction, strkorr FROM e070 WHERE trkorr IN (...)`，
`trfunction` 为 `K`/`S` 的是请求，`strkorr` 指向父请求的那个是任务。
先查 `E071`（对象挂哪个号）容易误导——`E071` 里出现的可能是**任务号**。

## 结构内嵌表类型组件（实现接口「行包含在抬头里」的嵌套返回）

对接方要求返回体像 `ZBPM_ISP005` 那样——**行项目挂在抬头结构里、计划行挂在行项目里**，
一个出参 `ET_DATA` 就是一棵树。DDIC 侧只需给结构**追加一个 TTYP 类型组件**：

```ddl
define structure zbpm_isp014_head_s {
  vbeln : vbeln_va;
  ...
  item  : zbpm_isp014_item_t;   // ← 组件类型写成「表类型名」，小写
}
define structure zbpm_isp014_item_s {
  vbeln : vbeln_va;
  posnr : posnr_va;
  ...
  sched : zbpm_isp014_sched_t;  // ← 行项目里再嵌一层
}
```

- **合法且无循环**：链式引用 `HEAD_S → ITEM_T → ITEM_S → SCHED_T → SCHED_S` 是单向的；
  ABAP 侧直接 `APPEND ls_item TO ls_head-item.` / `APPEND ls_sched TO ls_item-sched.`，
  `lines( ls_head-item )` 取值，无需手工定义嵌套类型。
- **通道与改字段完全相同**：`UpdateStructure` 传**完整 DDL**（保留原有全部字段，
  末尾追加该组件）→ `{structure_name, ddl_code, transport_request, activate}`，往返 `activated:true`。
  TTYP（`ZBPM_ISP014_ITEM_T`）必须**先用 `CreateTableType` 建好**，否则激活报找不到类型。
- **备份命名要换后缀**：同一结构做多轮改造时，若沿用 `${名称}_${日期}.ddl` 会**静默覆盖**改造前的
  基线 DDL（本次差点丢 `HEAD_S` 加组件前的版本）。范式：`backup/${n}_20260929${suffix}.ddl`，
  首次加组件传 `_nest`（**备份后缀必须逐轮不同**，同后缀会静默覆盖改造前的基线 DDL，见 §4 范式三）。
- **验证组件确实落库**（`dd03l`）：
  ```sql
  SELECT tabname, fieldname, position, rollname, datatype
    FROM dd03l
   WHERE tabname IN ('ZBPM_ISP014_HEAD_S','ZBPM_ISP014_ITEM_S') AND datatype = 'TTYP'
  ```
  实测返回 `HEAD_S / ITEM / 0059 / ZBPM_ISP014_ITEM_T`、`ITEM_S / SCHED / 0047 / ZBPM_ISP014_SCHED_T`。
- ★ **子结构不冗余存放父键**（`ZBPM_ISP014` 2026-10-09 确立）：行项目结构不放 `VBELN`、计划行结构不放 `VBELN`/`POSNR`，归属由层级本身表达。**连带的实现约束**：子结构缺父键 ⇒ 扁平行项目表无法在 FORM 间归位，而自定义「带父键工作结构」又要放**函数组 TOP**（FORM 形参类型跨 FORM 不可见）⇒ 正解是**查询时就地嵌入**：`APPEND INITIAL LINE TO <fs_head>-item ASSIGNING <fs_item>` + `MOVE-CORRESPONDING`，父键直接读 `<fs_head>-vbeln`；跨结构落库（`vbep` → `SCHED_S`）必须 `MOVE-CORRESPONDING` 中转，**`APPEND <不同结构> TO <内表>` 类型不兼容**。副作用：整个「组装 FORM」可删，耗时反而下降。
- 出参用**表类型**（`VALUE(et_data) TYPE zbpm_isp014_head_t`），函数体内一次性组装好整棵树再返回。
- **中间件消化能力需确认**：结构内含内表，RFC 序列化后是嵌套 JSON；对接方中间件不一定能吃。
  交付时在报告里列为待确认项。

## 删字段的连带检查（血泪）

删完必须验三处，否则函数组激活会失败：

1. **接口源码**是否引用了被删字段（`grep` 本地 + `GetInclude` 拉远端对照）；
2. **底表 DDL** 是否有同名列；
3. **函数组 include 的残留 FORM** —— 这次的真凶：`LZFG_BPM002F01` 里有 4 处
   `is_head-partner` 活引用，来自两个从别的模块（SD `ZBPM_ISP007`）复制过来的 FORM，
   **在本函数组内没有任何调用方，却参与编译**。改法：注释停用（或删 include），
   推送工具 `scripts/push_include_source.js`（LOCK → PUT → UNLOCK → 激活）。
   函数组 include 是**跨集团**的仓库对象，一个集团改了两端都变。
