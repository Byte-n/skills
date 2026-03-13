---
name: apifox
description: 查询 Apifox API 文档中的接口端点、模式定义和模块信息。当用户需要查找 API 接口详情、按关键词搜索接口、理解模式定义、探索 API 模块结构或分析 API 架构时，使用此技能。特别适用于用户需要查阅 Apifox 项目文档、查看接口参数和响应格式、了解不同 API 模块如何组织的场景。
compatibility: 需要 Node.js 和 Apifox API 凭证
---

# Apifox API 查询技能

此技能使您能够查询 Apifox API 规范，帮助用户查找接口详情、搜索 API、探索模块和理解模式定义。

## 使用前检查

- 开始执行命令前，先分析上下文是否已提供 `--projectId` 参数。该信息在上下文里可能以”项目id / apifox项目id / apifox 模块id”等不同表述出现，需进行同义识别并映射到 `--projectId`。

## get_path 调用规则

在调用 `get_path` 前，必须确认已知 `--method`。用户可能通过以下方式指定请求方法：
- 直接提供方法名，如 `”POST”`、`”get”`（不区分大小写）
- 口语描述，如”请求方式是 POST”、”用 GET 请求”、”这是个 post 接口”

**若用户未以任何形式指定请求方法，禁止擅自猜测，必须：**

1. 先调用 `search_paths --keyword <路径关键词>` 查询该路径对应的接口列表
2. 从结果中提取 `method` 字段：
   - 若只有 **1 个结果**：直接使用该 method
   - 若有 **多个结果**：必须以交互式 select 方式让用户选择（例如 `AskUserQuestion` 工具），展示每个候选项的 `method`、`path` 和 `summary`，待用户确认后再调用 `get_path`

## 可用命令

### search_paths

按关键词或模块搜索 API 接口。

**用法：**

```bash
node .claude/skills/apifox/scripts/index.js search_paths --keyword "用户" [--projectId 123] [--limit 10] [--module "api.v1"] [--method "GET"]
```

**参数：**

- `--keyword` (必需)：搜索词，匹配路径或接口摘要
- `--limit` (可选)：最大结果数（默认：无限制）
- `--module` (可选)：按模块过滤（例如："api.v1"、"api.auth"）
- `--method` (可选)：按 HTTP 方法过滤（GET、POST、PUT、DELETE、PATCH）
- `--projectId` (可选)：Apifox 项目 ID，默认从环境变量读取
- `--token` (可选)：覆盖 APIFOX_ACCESS_TOKEN

**示例响应：**

```json
{
  "success": true,
  "data": {
    "keyword": "用户",
    "total": 1,
    "paths": [
      {
        "path": "/api/xx",
        "method": "POST",
        "module": "other",
        "summary": "用户登录"
      }
    ]
  }
}
```

### get_path

获取特定 API 接口的详细信息。

**用法：**

```bash
node .claude/skills/apifox/scripts/index.js get_path --path " /xxxx/batchGetSalesProductList" --method "GET" [--projectId 123] --resolve-refs
```

**参数：**

- `--projectId` (可选)：Apifox 项目 ID，默认从环境变量读取
- `--path` (必需)：API 接口路径
- `--method` (必需)：HTTP 方法（GET、POST、PUT、DELETE、PATCH）
- `--resolve-refs` (可选)：启用 $ref 自动解析。当启用时，自动从 `parameters`、`requestBody`、`responses` 中查找所有 `$ref`，递归解析（支持嵌套 `$ref`），并将结果以 Schema 名为 key 存入响应的 `components.schemas` 字段
- `--token` (可选)：覆盖 APIFOX_ACCESS_TOKEN

**返回：** 完整的接口详情，包括参数、请求体、响应和安全要求。当启用 `--resolve-refs` 时，还包含 `components.schemas` 字段，其中包含所有被引用的 Schema 定义（包括嵌套引用）。

**示例响应（启用 --resolve-refs）：**

```json
{
   "success": true,
   "data": {
      "openapi": "3.1.0",
      "info": {
         "title": "默认模块",
         "description": "",
         "version": "1.0.0"
      },
      "tags": [
         {
            "name": "SalesProductService"
         }
      ],
      "paths": {
         " /xxxx/batchGetSalesProductList": {
            "post": {
               "summary": "批量查询可销售产品列表接口",
               "deprecated": false,
               "description": "",
               "operationId": "SalesProductService_BatchGetSalesProductList",
               "tags": [
                  "SalesProductService"
               ],
               "parameters": [],
               "requestBody": {
                  "content": {
                     "application/json": {
                        "schema": {
                           "$ref": "#/components/schemas/converge_serverBatchGetSalesProductListReq"
                        }
                     }
                  },
                  "required": true
               },
               "responses": {
                  "200": {
                     "description": "A successful response.",
                     "content": {
                        "application/json": {
                           "schema": {
                              "$ref": "#/components/schemas/converge_serverBatchGetSalesProductListResp"
                           }
                        }
                     },
                     "headers": {}
                  },
                  "500": {
                     "description": "An unexpected error response.",
                     "content": {
                        "application/json": {
                           "schema": {
                              "$ref": "#/components/schemas/rpcStatus"
                           }
                        }
                     },
                     "headers": {}
                  }
               },
               "security": [
                  {
                     "bearer": []
                  }
               ]
            }
         }
      },
      "webhooks": {},
      "components": {
         "schemas": {
            "converge_serverBatchGetSalesProductListReq": {
               "type": "object",
               "properties": {
                  "filters": {
                     "$ref": "#/components/schemas/BatchGetSalesProductListReqFilter"
                  },
                  "page": {
                     "type": "integer",
                     "format": "int32"
                  },
                  "pageSize": {
                     "type": "integer",
                     "format": "int32"
                  }
               },
               "required": [
                  "page",
                  "pageSize"
               ]
            },
            ...
         },
         "responses": {
            ...
         },
         "securitySchemes": {
            ...
         }
      },
      "servers": [],
      "security": [
         {
            "bearer": []
         }
      ]
   }
}
```

### get_schema

从 API 规范中检索特定的模式定义。

**用法：**

```bash
node .claude/skills/apifox/scripts/index.js get_schema --name "User" [--projectId 123]
```

**参数：**

- `--projectId` (可选)：Apifox 项目 ID，默认从环境变量读取
- `--name` (必需)：模式名称（例如："User"、"ErrorResponse"）
- `--token` (可选)：覆盖 APIFOX_ACCESS_TOKEN

### list_modules

列出所有 API 模块及其接口数量。

**用法：**

```bash
node .claude/skills/apifox/scripts/index.js list_modules [--projectId 123]
```

**返回：** 按接口数量排序的模块列表，帮助用户了解 API 结构。

### get_module

获取特定模块中的所有接口。

**用法：**

```bash
node .claude/skills/apifox/scripts/index.js get_module --module "api.users" [--projectId 123]
```

**参数：**

- `--projectId` (可选)：Apifox 项目 ID，默认从环境变量读取
- `--module` (必需)：模块名称
- `--token` (可选)：覆盖 APIFOX_ACCESS_TOKEN

## 典型工作流程

当用户询问 Apifox API 时：

1. **如果在探索**：首先使用 `list_modules` 了解 API 结构
2. **如果在搜索**：使用 `search_paths` 和关键词查找相关接口
3. **如果需要详情**：使用 `get_path` 获取完整接口信息
4. **如果需要模式**：使用 `get_schema` 理解数据结构

## 技巧

- **模块命名**：脚本从路径自动提取模块名称。标准模式是 `api.v1`、`api.auth`、`rpc.service` 等。
- **项目 ID**：未传入 `--projectId` 时，自动使用环境变量 `APIFOX_PROJECT_ID`
- **错误处理**：脚本在失败时返回 `{ success: false, error: "message" }`。需要清楚地向用户解释错误。
