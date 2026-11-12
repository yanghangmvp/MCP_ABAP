# SD 参考单据与退货订单

**用途**：带参考单据建单（三件套）、退货订单 `Z011` 的项目类别匹配、退货单其它要点。
**一句话坑**：少传 `REF_DOC_CA` 必报 `V2 068`。
**同域**：创建 `sd-salesdocument-create.md` · 变更 `sd-salesdocument-change.md`

> 章号沿用原 SD 分册编号，便于与其它册互引。

---

## 10. ★ 参考单据与退货订单（2026-10-10 实测）

### 10.1 参考单据是「三件套」，少传类别必报 `V2 068`

SD 的参考单据关系在 BAPI 结构里分**三个**字段，缺一不可：

| 层级 | BAPI 字段 | 对应底表 |
|---|---|---|
| 抬头 | `BAPISDHD1-REF_DOC` / `BAPISDHD1-REFDOC_CAT` | `VBAK-VGBEL` / `VBAK-VGTYP` |
| **行项目** | **`BAPISDITM-REF_DOC` / `REF_DOC_IT` / `REF_DOC_CA`** | **`VBAP-VGBEL` / `VGPOS` / `VGTYP`** |

**症状**：只传编号 + 行号、类别留空 ⇒ 标准函数报

```
V2 068  凭证 &1 不含凭证类别 &2 但含 &3
        → 凭证 7000000136 不含凭证类别  但含 C      （&2 空、&3 是凭证的真实类别）
```

**为什么容易漏**：普通销售订单（如 `Z001`）不参考原单，`VGBEL` 为空，三个字段一起空，**从不复现**；**退货订单天然要参考原销售订单**，于是只在退货场景暴露。

**正解**（行项目结构通常没有独立的"类别"字段 ⇒ 查被参考单据）：

```abap
cs_itm-ref_doc    = is_item-vgbel.
cs_itm-ref_doc_it = is_item-vgpos.
IF is_item-vgbel IS NOT INITIAL.
  SELECT SINGLE vbtyp FROM vbak INTO @lv_vbtyp WHERE vbeln = @is_item-vgbel.
  IF sy-subrc = 0.
    cs_itm-ref_doc_ca = lv_vbtyp.          " ★ 取被参考单据自身的凭证类别
  ELSE.
    cs_itm-ref_doc_ca = is_input-vgtyp.    " 兜底：抬头类别
  ENDIF.
ENDIF.
```

> **不要无脑取抬头 `VGTYP`**（早期实现）：那隐含「行项目与抬头参考同一单据」的假设，一旦调用方传了别的单据号（或传错），错误类别会被硬套上去，报错反而更难查。

**参考类别取值 = 被参考凭证自身的 `VBAK-VBTYP`**：参考**销售订单**用 `'C'`（`Z001` 的 `VBTYP = C`）；退货单自身是 `'H'`，不能拿它当参考类别。

**三条入参校验（缺任何一个就会把晦涩的 `V2 068` 抛给调用方）**：

```
行项目 { POSNR } 填写了参考单据编号，抬头必须填写参考单据的凭证类别
行项目 { POSNR } 填写了参考单据编号，参考单据行号不能为空
行项目 { POSNR } 的参考单据 { VGBEL } 不存在
```

**★ 编号 / 行号指的是「被参考单据」的，不是本单的行项目号。** 实例（`Z007` 寄售结算退回）：
行项目误填 `VGBEL = '0000000010'`（= `POSNR` 10 的零填充）、`VGPOS = 0` ⇒ 报
「凭证 10 不含凭证类别 C 但含」（**`&3` 为空** = 该单据在 `VBAK` 里查不到）。
标准形态（既有单实测）：`VGBEL = 41000000xx`（**与抬头参考同一个单据**）+ `VGPOS = 000010` + `VGTYP = C`；
行项目整体留空也合法（表示该行不参考）。

**排查手段**：
```bash
node scripts/work/adt.js query "SELECT VBELN, POSNR, VGBEL, VGPOS, VGTYP FROM VBAP WHERE VBELN = '<退货单>'"   # 看标准做法长什么样
node scripts/work/adt.js query "SELECT * FROM T100 WHERE ARBGB = 'V2' AND MSGNR = '068' AND SPRSL = '1'"        # 消息原文（占位符顺序决定怎么读）
```

### 10.2 退货订单 `Z011`：项目类别必须与订单类型匹配

**症状**：拿销售订单的参数去建退货单，行项目 `PSTYV` 仍是 `Z001` ⇒

```
V1 321  没有为项目 &2 定义项目类别 &1
        → 没有为项目 000010 定义项目类别 Z001
```

**根因**：项目类别由 `T184`（项目类别确定：`AUART` + `MTPOS`(物料项目类别组) + `VWPOS`… → `PSTYV`）决定。同一物料在两种订单类型下是**两套独立配置**：

```bash
node scripts/work/adt.js query "SELECT * FROM T184 WHERE AUART = 'Z011'"   # → Z011 + NORM → PSTYV Z011
node scripts/work/adt.js query "SELECT * FROM T184 WHERE AUART = 'Z001'"   # → Z001 + NORM → PSTYV Z001
```

**正解**：退货单的行项目 `PSTYV` 传 **`Z011`**，**或干脆留空** —— 留空时由 SAP 按「订单类型 + 物料项目类别组」自动确定（两种都实测通过）。**最稳的是留空**，把项目类别交给配置决定，接口不用关心订单类型差异。

### 10.3 退货订单的其它要点

| 项 | 结论（`Z011` / 系统实测） |
|---|---|
| 订单类型属性 | `VBTYP = 'H'`、`TRVOG = 0`、伙伴确定过程 `PARGR = TA`、编号内部范围 `NUMKI = Z5`（落到 `60000000xx` 段）、`TVAK-KALSM` 为空 |
| **数量符号** | `VBAP-KWMENG` / `VBEP-WMENG` **存正数**（样例退货单 3.000 / 3.000）—— 方向由 `VBTYP='H'` 在后续交货/开票环节体现，**接口不做符号翻转** |
| 定价 | 与销售订单同：样例退货单 `PRCD_ELEMENTS` 里 `ZP01` 在 `STUNR = 010`，`MWSI` / `VPRS` / `NETW` 照常带上 |
| 客户/物料 | 与销售订单**完全通用**（无需为退货单独建主数据） |
| 伙伴 | 仍是 `AG / WE / RE / RG`（落库 S/4 显示 `SP / SH / BP / PY`） |
| 计划行数量校验（`sd-schedule-line-qty.md` §6.2） | 退货数量为正数时 `合计 = 订单数量` / `不得大于` 两条规则照常成立 |

**判据速查**：`TVAK.VBTYP` —— `C` = 销售订单、`H` = 退货订单、`B` = 报价、`A` = 询价。
