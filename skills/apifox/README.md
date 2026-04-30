# Apifox 技能说明

通过「Apifox 项目」 + 「接口路径」获取 Apifox 中的接口信息（Openapi 格式）

## 环境变量配置

```shell
export APIFOX_ACCESS_TOKEN="xxx-xxxx"
export APIFOX_PROJECT_MAP="[{\"label\":\"订单处理\",\"value\":1}"
```

- `APIFOX_ACCESS_TOKEN` 为个人访问凭证，在 Apifox 客户端设置中创建
- `APIFOX_PROJECT_MAP` 为 json 格式。其中项目 id 可以在项目设置中看见
```json5
[
  {
    "label": "订单处理",
    "value": 1 // 项目id
  },
  {
    "label": "销售管理",
    "value": 2
  }
]
```

## 使用方式

- 直接使用：

例如： ‘获取 销售管理项目的 /sc/a/b/c 接口信息’ ，AI 就会自动调用此技能。

- 集成到 提升词 / 规范 / Skill 中：

```md
# API 接口开发规范

此规范用于生成符合项目规范的 API 请求代码。

## 前置要求（CRITICAL）

1. **必须先通过 APIFOX 技能获取最新 OpenAPI 信息，禁止凭经验猜测接口字段和类型。**
2. **...其他要求**

---

... 项目的 API 代码生成规范

```


