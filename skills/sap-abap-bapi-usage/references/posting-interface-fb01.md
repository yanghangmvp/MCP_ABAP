# `POSTING_INTERFACE_*` · 票据类行（FB01 批输入）

**用途**：`UMSKZ = W / X / Y`（票据、承兑、担保）这类**标准 BAPI 结构里没有字段**的行项目，唯一可走的半标准通道。
**同域**：过账 `bapi-acc-document-post.md` · 冲销 `bapi-acc-document-rev-post.md`

---

## 1. 为什么需要它

- **`UMSKZ` 在 `BAPIACGL09` / `BAPIACAP09` / `BAPIACAR09` 三个结构里都没有字段** —— 走 `BAPI_ACC_DOCUMENT_POST` 会被静默丢弃、科目记错、返 S。
- 备选是经 `EXTENSION2` 增强落库，但依赖后端增强实现，跨系统不可移植。
- 票据类凭证通常整张走本接口，不要混着来。

## 2. 关键参数

```
POSTING_INTERFACE_START    " 打开会话（I_KEEP = 'X' 复用）
POSTING_INTERFACE_HEADER   " 抬头
POSTING_INTERFACE_ITEM     " 逐行
POSTING_INTERFACE_END      " 收尾，真正落库
```

- `POSTING_INTERFACE_ITEM` 里 `UMSKZ` 是**真正的入参**，这是它相对 BAPI 的唯一优势。
- 每条 item 的 `SPECIALGL` / 记账码按票据类型定，先看同类型人工凭证的 `BSEG`。
- **必须 `START` 与 `END` 成对**，中间任何一步失败都要 `POSTING_INTERFACE_END` 收尾，否则会话残留锁。

## 3. ★ `I_UPDATE` 值域只有 `S` / `A` / `L`

实测**没有「不更新数据库」档位**。所以：

- 模拟导入模式下**不要伪造成功**，直接返回 E 并提示"票据类凭证不支持模拟"。
- 想验证参数只能建测试凭证再冲销。

## 4. 对账点

| 检查项 | 表 / 字段 |
|---|---|
| 凭证已生成 | `BKPF` + `BSEG` |
| 票据标识落上 | `BSEG-UMSKZ` 等于 W/X/Y |
| 行数完整 | `BSEG` 行数 = 传入行数（批输入会**跳过**错误行而不中断，必须比行数） |
| 会话未残留 | 无 `POSTING_INTERFACE_START` 未 `END` 的锁 |
