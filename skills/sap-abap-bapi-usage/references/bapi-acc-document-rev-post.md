# `BAPI_ACC_DOCUMENT_REV_POST` · 凭证冲销

**用途**：冲销一张已过账凭证（红冲 / 蓝冲）。
**先决**：项目有封装接口时优先用封装接口。历史代码写法如下。
**同域**：过账 `bapi-acc-document-post.md` · 改已过账 `fi-document-change.md`

---

## 1. 两步：先拼 `OBJ_KEY_R`，再冲销

冲销接口需要被冲销凭证的 `OBJ_KEY`，用 `FI_REFERENCE_CREATE` 拼：

```abap
CALL FUNCTION 'FI_REFERENCE_CREATE'
  EXPORTING i_awtyp = 'BKPFF'
            i_awkey = lv_awkey        " 公司代码 + 凭证号 + 年度
            i_bukrs = lv_bukrs
            i_gjahr = lv_gjahr
            i_belnr = lv_belnr
  IMPORTING e_objky = lv_objky.

ls_rev-reversal_reason = '01'.        " 冲销原因（自定义，查 T041C）
ls_rev-posting_date    = lv_budat.
ls_rev-obj_key_r       = lv_objky.

CALL FUNCTION 'BAPI_ACC_DOCUMENT_REV_POST'
  EXPORTING reversal        = ls_rev
            bus_act         = 'RFBV'
  IMPORTING obj_key         = lv_new_objky
  TABLES    return          = lt_ret.
```

**冲销日期 / 原因在 `BAPIACREV`**，不在抬头。

## 2. ★ 判成败看 `MSGTY`，不要看 `MSGTX` 是否非空

`BAPI_ACC_DOCUMENT_REV_POST` **成功时 `MSGTX` 也非空**（会带回一条文本）。用「`MSGTX` 非空 = 失败」判，会把成功判成失败，然后再 `ROLLBACK`，把已经冲掉的凭证回滚——**并且你还会以为接口坏了**。

```abap
" 对
LOOP AT lt_ret INTO ls_ret WHERE type CA 'AE'.
  ...
ENDLOOP.
```

## 3. 对账点

| 检查项 | 表 / 字段 |
|---|---|
| 冲销凭证已生成 | `BKPF`：新凭证 `STBLG` 为空，原凭证 `STBLG` = 新凭证号 |
| 金额反向 | `BSEG`：冲销凭证的 `SHKZG` 与原凭证相反，`DMBTR` 等额 |
| 冲销原因 | `BKPF-STGRD` |
| 期间已开 | 冲销日期所在期间必须已开（`OB52`），否则报 `F5 007` 一类 |

**冲销不可再冲销**（不支持冲销冲销凭证），需要更正就走 `fi-document-change.md` 或反向再记一笔。
