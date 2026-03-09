---
name: typescript-doc
description: 为 TypeScript 代码添加完整的 JSDoc 注释。包括函数、类、接口、类型、枚举等。适用于编写、创建、实现、开发任何 TypeScript 代码的场景时自动激活。
---

# TypeScript Docs 文档指南

为 TypeScript 代码创建详细的注释说明文档。

## 什么时候激活此技能

- 需要为 TypeScript 代码添加 JSDoc 注释
- 提到 "JSDoc"、"代码文档"、"注释"、"TypeDoc" 或 "代码说明"
- 需要为函数、类、接口、类型等添加详细说明
- 要求改善代码的可读性和文档完整性


## 使用示例

### 函数

- **普通函数**

```typescript
/**
 * 将两个数相除，并返回其商
 * 
 * @param {number} a - 被除数
 * @param {number} b - 除数
 * @returns {number} 商
 *
 * @throws {Error} 当除数为零时抛出错误
 * 
 * @example
 * division(4, 2); // 返回 2
 */
export function division(a: number, b: number): number {
  // ...
}
```

- **`generator` 函数**

```typescript
/**
 * 生成事务 id
 * 
 * @generator
 * @yields {string} 格式为 'TX_序列号'
 * 
 * ...
 * 
 */
function *generateTransactionId() {
    let i = 0;
    while (true) yield `TX_${i++}`;
}
```

- **重载函数**

```typescript
/**
 * 基础格式化
 * @param {number} value
 */
export function format(value: number): string;

/**
 * 模式格式化
 * @param {number} value
 * @param {'currency' | 'percent'} formatStr
 */
export function format(value: number, formatStr: string): string;

/**
 * 数值格式化逻辑。
 *
 * 1. `currency`: 固定保留 2 位小数，前缀 $。
 * 2. `percent`: 乘以 100，保留 1 位小数，后缀 %。
 * 3. 默认: 直接返回数字的字符串形式。
 *
 * @param {number} value - 输入值。
 * @param {string} [formatStr] - 格式化指令。
 *
 * @returns {string} 格式化结果。
 *
 * @example
 * format(100, 'currency'); // "$100.00"
 *
 */
export function format(value: number, formatStr?: string): string {
}
```

### 接口文档化

```typescript
/**
 * 表示系统中的用户。
 */
export interface User {
  /**
   * 用户的唯一标识符。
   */
  id: string;
  /**
   * 用户的个人资料设置。
   */
  profile?: UserProfile;
}
```

### 类型文档化

```typescript
/**
 * API 支持的 HTTP 方法。
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * HTTP 请求配置对象。
 * @example
 * const config: RequestConfig<{ name: string }> = {
 *   ...
 *   body: { name: '小七' },
 * };
 */
export type RequestConfig<TBody = unknown> = {
  /** 
   * 请求体
   */
  body?: TBody;
  // ...
};

```

### 类文档化

```typescript
/**
 * 所有数据请求服务的基类，封装了基础的鉴权逻辑。
 */
abstract class BaseService {
  /**
   * 服务版本号
   */
  static readonly VERSION = 'v1'

  /**
   * @param token - 初始化的鉴权令牌
   */
  constructor (token: string) {
  }

  /**
   * 获取数据的核心抽象逻辑
   * */
  abstract fetchData (): Promise<unknown>;
}

interface IDx {
  /** 初始化索引 */
  initIdx (): void;
}

/**
 * 处理与用户相关的网络请求。
 */
class UserService extends BaseService implements IDx {
  /**
   * 缓存的用户数据
   * */
  private cache: any

  initIdx (): void {
  }
  
  fetchData (): Promise<unknown> {
    return Promise.resolve(undefined)
  }
}

class Utils {
  /**
   * 唯一单例
   * */
  private static instance: Utils
}
```

### 枚举文档化

```typescript
/**
 * 订单处理的状态码。
 *
 * 订单按顺序经历这些状态，
 * 但也可能从任何状态直接跳转到 `Cancelled`（已取消）。
 * 
 */
export enum OrderStatus {
  /** 
   * 订单已创建但尚未处理
   */
  Pending = 'pending',
  // ...
}
```

### 注释中的补充说明

```typescript
/**
 * xxx
 * 
 * @deprecated v2.0 后移除。
 * @see {@link https://wiki.example.com|安全规范}
 */
function verifyOldSign(): boolean {
}
```


## 最佳实践

- **避免冗余信息**：`@template` / `@privte` / `@static` / `@extends` 等 typescript 本身能表达的含义不允许再使用 tag 重复表述，但是 `@param` / `@returns` 等除外
- **避免非必要的信息描述**：简单的片段，用短标题就可以描述清楚，没必要添加详细描述的文案
- **被实现的接口函数、抽象函数不需要注释**：具体的实现类，实现接口、抽象类时所覆盖的实现的函数不需要注释。
- **`type` / `interface` 类型注释简洁**：`type` / `interface` 类型定义的注释中不需要 `@example` / `@return` / `@param` / `@template` 等
- **`@example` 简洁**：在函数、类中添加 `@example` 描述使用示例时，应该保持示例代码精简，可以是伪代码。例如：`xxx(1,2,config)`，并不用具体定义 config。
