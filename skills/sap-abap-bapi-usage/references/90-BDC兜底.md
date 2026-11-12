# 90 · BDC 兜底

> 分册归属：`sap-abap-bapi-usage`。**只在确认无标准接口时才走这条路。**
> 完整改造范式（录屏 → 标准函数）见 `sap-bdc-to-bapi-migration`。

## 1. 判定顺序

1. 有没有项目封装接口？
2. 有没有 `BAPI_*` / 标准 FM？
3. 有没有 `POSTING_INTERFACE_*` 这类"半标准"通道（如 FB01 批输入）？
4. 以上都无 ⇒ BDC。

**别跳过 1~3 直接录屏**：BDC 的成本不在写，在一年后没人敢改。

## 2. 必须接受的三个事实

| 事实 | 后果 |
|---|---|
| 无返回值可判 | 只能扫 `BDCMSGCOLL`，且成功也可能是 `S` 级警告掩盖了部分失败 |
| 必输字段必须先取原值回填 | 否则屏幕上的默认值被清空，报一堆不相关的必输错误 |
| 屏幕结构随版本/补丁变 | SP 升级后功能码、字段名、屏幕顺序都可能变，必须回归 |

## 3. 调用要点

```abap
ls_opt-dismode = 'N'.       " 后台
ls_opt-updmode = 'S'.       " 同步更新
CALL TRANSACTION 'CO02' USING lt_bdcdata
  OPTIONS FROM ls_opt
  MESSAGES INTO lt_messtab.
```

- **`updmode = 'S'` 已同步更新，不要再补 `BAPI_TRANSACTION_COMMIT`**。
- 消息必须用表工作区字段：`lt_messtab-msgid / -msgnr / -msgv1..4`，**不能写 `sy-msgid` / `sy-msgno`**（`LOOP` 里不随行变化）。
- `BDCMSGCOLL` 的字段名是 `MSGNR` 不是 `MSGNO`。
- 判成败扫 `msgtyp CA 'AE'`，同时保留 `S` 级消息——很多"成功但不对"就藏在里面。

## 4. 屏幕录制注意

- 用 `SHDB` 录，**不要在录制里做无关键作**（滚动、切换页签会带入无意义的 `BDC_OKCODE`）。
- `BDC_OKCODE` 用功能码名（`=ENTK`）不要用数字编码。
- 批量前先单条跑通并对账底表，再扩量——BDC 中途失败不会自动回滚已处理的单据。
