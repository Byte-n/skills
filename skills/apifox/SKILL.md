---
name: apifox
description: 查询 Apifox 项目的接口详情、openapi 或 Schema 定义和模块结构。
compatibility: 需要 Node.js 和 Apifox API 凭证
---

# Apifox API 查询技能

## 使用前检查

开始执行命令前，先分析上下文是否已提供 `--projectName`。该信息可能以"项目 / 模块 / apifox 项目 / apifox 模块"
等表述出现，需同义识别并映射到 `--projectName`。

## 公共参数

所有命令均支持以下可选参数：

- `--projectName`：Apifox 项目名称

## get_path 调用规则

调用 `get_path` 前必须确认 `--method`。若用户未指定请求方法，禁止猜测，必须：

1. 先调用 `search_paths --keyword <完整的接口路径>` 获取接口列表
2. 从结果中提取 `method`：
    - **1 个结果**：直接使用
    - **多个结果**：向用户列出候选项（包含 `method`、`path`、`summary`），等待用户确认后再继续

## 可用命令

### search_paths — 搜索接口

```bash
node .claude/skills/apifox/scripts/index.js search_paths --keyword "用户" [--module "api.v1"] [--method "GET"] [--limit 10]
```

- `--keyword`（必需）：搜索词，匹配路径或接口摘要
- `--module`：按模块过滤（如 `api.v1`、`api.auth`）
- `--method`：按 HTTP 方法过滤
- `--limit`：最大结果数

### get_path — 获取接口详情

```bash
node .claude/skills/apifox/scripts/index.js get_path --path "/xxx/yyy" --method "POST" [--resolve-refs]
```

- `--path`（必需）：接口路径
- `--method`（必需）：HTTP 方法
- `--resolve-refs`：递归解析所有 `$ref`，结果写入 `components.schemas`

### get_schema — 获取 Schema 定义

```bash
node .claude/skills/apifox/scripts/index.js get_schema --name "User"
```

- `--name`（必需）：Schema 名称

### list_modules — 列出所有模块

```bash
node .claude/skills/apifox/scripts/index.js list_modules
```

返回按接口数量排序的模块列表。

### get_module — 获取模块下所有接口

```bash
node .claude/skills/apifox/scripts/index.js get_module --module "api.users"
```

- `--module`（必需）：模块名称

## 典型工作流程

1. **探索结构**：`list_modules`
2. **搜索接口**：`search_paths --keyword <词>`
3. **查看详情**：`get_path --path <path> --method <method>`
4. **查看 Schema**：`get_schema --name <name>`

## 技巧

- 模块名从路径自动提取，规律为 `api.v1`、`api.auth`、`rpc.service` 等
- 错误时返回 `{ success: false, error: "message" }`，需向用户清晰解释
