---
name: apifox
description: 查询 Apifox 项目的接口详情、openapi 或 Schema 定义和模块结构。
compatibility: 需要 Node.js 和 Apifox API 凭证
---

# Apifox API 查询技能

## 使用前检查

### 必须提供 --projectName

- 从用户输入中识别：「项目」「模块」「apifox 项目」「apifox 模块」等表述均映射为 `--projectName`
- **示例**：
  - `读取销售管理模块的 /api/users 接口` → `--projectName "销售管理"`
  - `获取基础服务项目的 /api/bis/rules 接口` → `--projectName "础服务"`


### ⚠️ 严格禁止

| 禁止行为               | 说明                                                        |
|--------------------|-----------------------------------------------------------|
| ❌ 擅自猜想 projectName | 未明确提供时，必须向用户确认                                            |
| ❌ 轮询所有 projectName | 禁止遍历查询全部项目以匹配接口                                           |
| ❌ 推测 `--method` 参数 | 禁止在 `get_path` 是推测 `--method` 参数，必须使用 `search_paths` 查询验证 |

### 执行前置条件

```
[ ] 已识别 --projectName
[ ] 已识别接口路径（如有）
[ ] 未猜测任何参数
```

## 公共参数

所有命令均支持以下可选参数：

- `--projectName`：Apifox 模块名称

## 可用命令

### list_projects — 列出所有可用项目

```bash
node scripts/index.js list_projects
```

### search_paths — 搜索接口

```bash
node scripts/index.js search_paths --keyword "用户" [--module "api.v1"] [--method "GET"] [--limit 10]
```

- `--keyword`（必需）：搜索词，匹配路径或接口摘要
- `--module`：按模块过滤（如 `api.v1`、`api.auth`）
- `--method`：按 HTTP 方法过滤
- `--limit`：最大结果数

### get_path — 获取接口详情

```bash
node scripts/index.js get_path --path "/xxx/yyy" [--method "POST"] [--resolve-refs]
```

- `--path`（必需）：接口路径
- `--method`（可选）：HTTP 方法。若省略且路径只有 1 个方法则自动使用；若有多个方法将返回错误要求选择
- `--resolve-refs`：递归解析所有 `$ref`，结果写入 `components.schemas`

### get_schema — 获取 Schema 定义

```bash
node scripts/index.js get_schema --name "User"
```

- `--name`（必需）：Schema 名称

### list_modules — 列出所有模块

```bash
node scripts/index.js list_modules
```

返回按接口数量排序的模块列表。

### get_module — 获取模块下所有接口

```bash
node scripts/index.js get_module --module "api.users"
```

- `--module`（必需）：模块名称

## 最佳实践（CRITICAL）

- 错误时返回 `{ success: false, error: "message" }`，需向用户清晰解释
- 在未提供 `--method` 参数时，可以直接通过 `get_path` 获取接口信息，若报错，则再根据错误信息，判断是否需要补充 `--method` 参数。
