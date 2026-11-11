---
name: sap-dump-to-excel-cell
description: 从 SAP short dump 反查「上传 Excel 是哪一行哪一列出错」。适用于 ALSM_EXCEL_TO_INTERNAL_TABLE 类上传程序报 CONVT_NO_NUMBER / CX_SY_CONVERSION_NO_NUMBER（例如 "CNY" cannot be interpreted as a number），需要给出可操作的 Excel 行列坐标时。含 dump 解法（LS_EXC_DATA 变量、ROW 与 Excel 行号的偏移规律）+ 用 local-office MCP 复现 ALSM 读取顺序按 sy-tabix 精确定位的做法。
agent_created: true
---

# 从 SAP short dump 定位上传 Excel 的出错单元格

## 适用场景

上传类报表（`ZFICOB_*` 这类批导程序）在 `MOVE ls_exc_data-value TO <ls_value>` 处 dump，
报 `CX_SY_CONVERSION_NO_NUMBER`（典型：`"CNY" cannot be interpreted as a number`）。

用到的标准结构：

```abap
DATA: BEGIN OF iexcel OCCURS 0.
        INCLUDE STRUCTURE alsmex_tabline.   " ROW / COL / VALUE
DATA: END OF iexcel.
CALL FUNCTION 'ALSM_EXCEL_TO_INTERNAL_TABLE'
  EXPORTING filename = p_file i_begin_col = 1 i_begin_row = 2
            i_end_col = 100 i_end_row = 65535
  TABLES    intern = lt_exc_data.

SORT lt_exc_data BY row col.
LOOP AT lt_exc_data INTO DATA(ls_exc_data).
  ASSIGN COMPONENT ls_exc_data-col OF STRUCTURE gw_export TO <ls_value>.
  MOVE ls_exc_data-value TO <ls_value>.        " <<< dump 在这里
  AT END OF row. APPEND gw_export TO gt_export. CLEAR gw_export. ENDAT.
ENDLOOP.
```

要点：`ls_exc_data-col` 既是 **Excel 列号**，也是 **gw_export 的组件序号**，
所以 gw_export 的字段顺序 = Excel 列顺序（1:1），可由 `GT_EXPORT` 里的值反推列含义。

## 步骤

### 1. 解压 dump

zip 里通常有 `dump_full_ZH.txt`（中文可读版）和 `details/dump_raw.txt`（原始变量区）。

### 2. 从 dump 抓三个数

在 `dump_full_ZH.txt` 的「已选择的变量」区找：

```
LS_EXC_DATA
    {0933;0018;CNY}          <- ROW ; COL ; VALUE
<LS_VALUE>
    0.00000                  <- 目标字段当前值（数字型 => 类型不符才报错）
```

同时记下 `SY-TABIX`（本条的排序后位置，如 43567）与工作表 `LT_EXC_DATA` 的 `fill`（总条数）。

> ⚠️ 别只看 raw dump 的 `N0 LS_EXC_DATA-COL / V0 0018`——ROW 往往不在那里，
> ZH 版的 `{ROW;COL;VALUE}` 一行最省事。raw 里 `LS_EXC_DATA-VALUE` 的 hex
> 行末段（如 `43004E00590020...` = UTF-16 "CNY "）可做交叉验证。

### 3. 换算 Excel 行号

`ALSM_EXCEL_TO_INTERNAL_TABLE` 的 ROW **不是** Excel 物理行号：因为 `i_begin_row = 2`
（第 1 行是表头），第一条数据记录记为 `ROW = 1`。

**规律：`Excel 行 = ROW + 1`**（前提是文件第 1 行是表头，数据从第 2 行开始）。

本例 `ROW=0933` → **Excel 第 934 行**。

### 4. 拿到 Excel 文件，定位到具体单元格

用 `tencent-local-office-edit` skill 的本地 editor_sdk MCP 通道读文件：

```bash
cd "/Applications/WorkBuddy.app/Contents/Resources/app.asar.unpacked/resources/plugins/workbuddy-builtin/skills/tencent-local-office-edit"
python3 edsdk.py call open_file file_path="/abs/x.xlsx"
python3 edsdk.py call sheet_get_sheet_info file_id="/abs/x.xlsx"   # 拿 sheet_id 与行数
python3 edsdk.py call sheet_get_cell_data file_id="..." sheet_id=000004 \
  start_row=0 start_col=0 end_row=0 end_col=51 return_csv=true      # 表头
```

注意 sheet 工具行/列都是 **0-based**，而 dump 的 COL 是 **1-based**：

**`0-based 列 = COL - 1`**，即 COL=18 → `start_col=17`。

### 5. 精确定位（最硬的一招）：复现 ALSM 的读取顺序

不要靠肉眼数行。直接模拟 `ALSM_EXCEL_TO_INTERNAL_TABLE` + `SORT BY row col`：

```python
# 读取整表 -> 收集所有非空单元格 (excel_row_1based, excel_col_1based, value)
# 按 (row, col) 升序排序 -> 取第 SY-TABIX 条
```

- 若第 `SY-TABIX` 条落在 `(Excel 行, Excel 列)`，即 100% 确认定位；
- 同时把该行全部非空单元格打印出来，作为交给业务/用户的认行依据。

### 6. 交叉验证（强烈建议）

- **表头核对**：读表头行，确认该列的业务含义（例：第 18 列 = 汇率，数字列 → 填 `CNY` 必报错）。
- **总条数核对**：本表非空单元格总数应 ≈ dump 里 `LT_EXC_DATA` 的 `fill`。差几十个以内属正常
  （CSV 解析口径差异）。
- **GW_EXPORT 核行**：dump 里 `GW_EXPORT` 的当前值就是**出错行已填好的部分**（`AT END OF row`
  还没执行，所以没被 CLEAR）。把它的字段与 Excel 表头 1:1 对上，就能报出「公司代码/单据编号/日期」
  等业务标识，用户可直接搜。

> dump 显示字段值时会截断长字段（如 `SAC SAC A 73918` 截自 `SAC SAC A 73918706 274317178`），
> 所以别用 gw_export 的值去做精确字符串匹配，只用它认行。

## 坑

0. **★ 单元格里的 TAB 会让列号整体右移 —— 报错列 ≠ Excel 列**
   `ALSM_EXCEL_TO_INTERNAL_TABLE` **把单元格文本里的 TAB（0x09）当列分隔符**：
   一格被拆成两条 `intern` 记录，第二条的 COL = 原 COL + 1，
   并且**从拆分点起，该行后续真实单元格的 COL 全部 +1**。

   实例：Excel 第 934 行「日记帐行说明」(COL 14) 值里含 TAB，`lt_exc_data` 里得到
   `(ROW=934, COL=14)` + `(ROW=934, COL=15)`；于是原本第 17 列的「原币币种 CNY」
   被记成 **COL=18**，第 18 列「汇率」被记成 COL=19。
   程序 `ASSIGN COMPONENT ls_exc_data-col OF STRUCTURE gw_export` 取到 gw_export 第 18 个
   字段（汇率，数字型），`MOVE 'CNY'` → `CX_SY_CONVERSION_NO_NUMBER`。

   ⇒ 看到 dump 的 `LS_EXC_DATA-COL` 时，**必须回 Excel 核对那一行有没有 TAB**；
   有 TAB 就要把 COL 减去"该行拆分次数"才是真实列号。
   ⇒ 复现 ALSM 读取顺序时也要模拟这个拆列行为，否则定位差一位。

   排查套路：用 `sheet_get_cell_data`（structured 模式）扫该 sheet 全表，统计
   `chr(9)` / `chr(10)` / `chr(13)` 出现的 (行,列)。这类"脏字符"通常只集中在少数几行，
   一眼就能锁定。

1. **中文字段的值在 dump 里是转义/截断的**——`V0` 行可读但会截短；要精确值看 hex 行（UTF-16）。
2. **字段类型差异**：`MOVE '2026-09' TO NUMC(7)` 这类字符→数字文本的赋值会**静默变形**
   （去掉非数字后右对齐补零 → `0202609`），所以 gw_export 里出现 `0202609` 时不要以为文件里
   真是这个值——它只是 MOVE 的结果。
3. **NULL vs 空串**：`ALSM` 会跳过空单元格，所以 `gw_export` 里某个字段为空可能是「根本没读到」，
   而非「读到空值」。
4. **文件可能已被改过**：报错时间 vs 文件 mtime。本例 dump 15:59、xlsx mtime 16:41，
   出错格现值已是 `1` 而非 `CNY`——定位结论仍成立，但要向用户点明"这份文件在报错后被改过"。
5. **多 sheet 文件**：`ALSM` 只读**一个**工作表（第一个/活动 sheet）。先用第一条数据的公司代码、
   行数、非空单元格总数判断读的是哪张 sheet，不要默认读的是第一张。

## 修复建议（给业务/开发的收尾）

1. 把该单元格改回正确数字（本例：汇率填 `1`）。
2. 程序侧别裸 `MOVE`：用 `CATCH CX_SY_CONVERSION_NO_NUMBER` 或先做字符校验，
   把「第 N 行第 M 列值 X 不是数字」作为消息抛给用户，而不是直接 short dump。
