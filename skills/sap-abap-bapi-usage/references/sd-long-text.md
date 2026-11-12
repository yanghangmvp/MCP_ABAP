# SD 长文本 · `BAPISDTEXT` / `SD_SALES_DOCU_MAINTAIN`

**用途**：抬头（`VBBK`）与行项目（`VBBP`）文本的写、改、**删**。
**一句话坑**：删除的功能码是 `'003'` 不是 `'005'`；单条超 132 字符必须拆行。
**同域**：创建参数 `sd-salesdocument-create.md` · 变更 `sd-salesdocument-change.md`

> 章号沿用原 SD 分册编号，便于与其它册互引。

---

### 2.2 文本

抬头 `VBBK` Z001~Z010、行项目 `VBBP` Z001~Z010，走 `BAPISDTEXT`（`FUNCTION / ITM_NUMBER / TEXT_ID / LANGU / TEXT_LINE`）。
**单条超 132 字符要按 132 拆行**（`WHILE lv_off < lv_len. lv_seg = iv_text+lv_off. ... lv_off = lv_off + 132. ENDWHILE.`）。
抬头文本的 `ITM_NUMBER` 传 `'000000'`（NUMC 的"初始值"就是全 0，标准函数据此判抬头/行项目）；修改模式 `FUNCTION` 传 `'005'`、创建模式留空。

★★ **`FUNCTION` 是功能码开关，不是"更新标识" —— `'003'` 才是删除**（详见 §9.3）：

| `FUNCTION` | 标准函数动作 |
|---|---|
| `'003'` | `DELETE_TEXT` + `COMMIT_TEXT` → **文本被删除**（`STXH` 头记录消失） |
| 其余（含 `'005'`、空） | `CREATE_TEXT` → **覆盖写入**；若只有一条空行，文本会变成"一条空行"，`STXH` 头与 `TDTXTLINES` **都还在** |

⇒ 想真正清空长文本，必须传 `'003'`；传 `'005'` 会**返回 `S` 但删不掉**，而且 `STXH-TDLUSER/TDLTIME` 已被刷新，很容易误判成"清空已生效"。
文本名：抬头 `TDNAME = VBELN`（`TDOBJECT = 'VBBK'`）、行项目 `TDNAME = VBELN + POSNR`（`'VBBP'`）。

### 9.3 长文本删除的开关是 `'003'`，不是 `'005'`

- **现象**：修改模式下想把某条长文本清空，`BAPISDTEXT-FUNCTION` 传 `'005'`、`TEXT_LINE` 留空，接口**返回 `S`**，但查 `STXH` 文本**依然存在**、`TDTXTLINES` 仍是 `'00001'`。极易误判为"清空已生效"，因为 `STXH-TDLUSER` / `TDLTIME` **已经被刷新成本次运行的时刻**——标准函数确实动了这条文本，只是没删。
- **根因**：`SD_SALESDOCUMENT_CHANGE` 第 15 步调 `SD_SALES_DOCU_MAINTAIN`（函数组 **`SAPLV45A`**），其 `create_text_header` / `create_text_item`（源码 2478 / 2625 行起）是：

  ```abap
  case function.
    when '003'.                          " 删除
      call function 'DELETE_TEXT' exporting id = ct_tdid language = ct_tdspras
                                  name = ct_tdname object = 'VBBK' ...
      if sy-subrc <> 0. ... else. call function 'COMMIT_TEXT' exporting object = 'VBBK'. endif.
    when others.                         " 含 '005'、空：覆盖写入
      call function 'CREATE_TEXT' exporting ... object = 'VBBK' tables flines = i_tlinetab ...
  endcase.
  ```

  ⇒ `FUNCTION` 是**功能码开关**，不是"更新标识"。传 `'005'` 只是把文本**重写成一条空行**，头记录与行数都保留。
- **正解**：清空分支固定 `FUNCTION = '003'`（`FORMAT_COL` 不需要设）。
- **★ 附带必须处理的一点**：`DELETE_TEXT` 源码末段是

  ```abap
  IF any_deleted = abap_false.
     MESSAGE E600 WITH NAME ID LANGUAGE RAISING NOT_FOUND.
  ENDIF.
  ```

  即目标文本不存在时**不仅抛异常、还留下一条 `E` 消息**；`create_text_header` 的 `if sy-subrc <> 0` 分支随即 `fehler_ausgeben`，把它转成 `BAPIRET2` 追加进标准函数的 `RETURN` 表 ⇒ 调用方按 `E` 判失败，"清空"反而把接口打成失败。
  ⇒ **删前必须先查存在性**：

  ```abap
  SELECT SINGLE tdname FROM stxh INTO @lv_dummy
    WHERE tdobject = @lv_object AND tdname = @lv_tdname
      AND tdid = @iv_tdid AND tdspras = @sy-langu.
  IF sy-subrc <> 0. RETURN. ENDIF.
  ```

  副作用是好的：调用方对"本来就没有的文本"传清空标记变成**幂等安全**操作。
- **排查手段**：`get_source.js FM SD_SALES_DOCU_MAINTAIN SAPLV45A` → `grep -n -E "create_text_header|create_text_item|DELETE_TEXT|CREATE_TEXT"`；文本名规则见 §2.2。
