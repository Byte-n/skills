# TypeScript 的高级类型详细代码参考和边缘案例

## 1. 泛型 (Generics)

**目的：** 在保持类型安全的同时，创建可复用且类型灵活的组件。

- **基础泛型函数：**

```typescript
function identity<T>(value: T): T {
  return value;
}

const num = identity<number>(42); // 类型: number
const str = identity<string>('hello'); // 类型: string
const auto = identity(true); // 类型推断: boolean
```

- **泛型约束：**

```typescript
interface HasLength {
  length: number;
}

function getLength<T extends HasLength>(item: T): T {
  return item.length;
}

getLength('hello'); // 正确：string 拥有 length 属性
getLength([1, 2, 3]); // 正确：array 拥有 length 属性
getLength({ length: 10 }); // 正确：object 拥有 length 属性
// getLength(42);           // 错误：number 没有 length 属性
```

- **多个类型参数：**

```typescript
function merge<T, U>(obj1: T, obj2: U): T & U {
  return { ...obj1, ...obj2 };
}

const merged = merge({ name: 'John' }, { age: 30 }); // 类型: { name: string } & { age: number }
```

- **多路推断歧义**

在 TypeScript 默认的泛型推断机制中，若多个候选位置（Candidate Positions）共享同一个泛型参数 `T`，编译器会执行“推断合并”。如果各位置传入的类型不一致，
`T` 将被自动推断为这些类型的**并集（Union）**。在契约式编程中，这种“自动宽泛化”会导致类型检查失去约束力。

负面案例: 下例展示了由于 `handler` 参数参与了 `T` 的推断，导致原本应受限的动作范围被非预期地扩大：

```typescript
type Action = 'SAVE' | 'DELETE';

/**
 * @description 注册处理器。本意是让 handler 的 payload 类型严格等于 action。
 */
function registerHandler<T extends Action>(
  action: T,
  handler: (payload: { type: T }) => void,
) {}

// ❌ 隐患：
// 显式传入了 "SAVE"，但编译器从 handler 的参数中提取了 "SAVE" | "DELETE"。
// 最终 T 被推断为 "SAVE" | "DELETE"（并集），破坏了单向约束。
registerHandler('SAVE', (payload: { type: 'SAVE' | 'DELETE' }) => {});
```

优化方案：引入 NoInfer<T> 锁定推断源：通过将非主导位置的泛型标注为 `NoInfer<T>`，可以显式排除该位置对泛型 `T`
的推断贡献，强制编译器仅从其他位置（推断锚点）获取类型。

```typescript
/**
 * @description 使用 NoInfer 锁定 T 的推断来源。
 * 此时 T 的类型完全由 action 参数决定，handler 仅作为类型的消费者。
 */
function registerHandlerStrict<T extends Action>(
  action: T,
  handler: (payload: { type: NoInfer<T> }) => void,
) {}

// ✅ 行为：类型收窄与精准匹配
registerHandlerStrict('SAVE', payload => {
  // payload.type 被精确锁定为 "SAVE"
});

// ❌ 行为：编译期拦截
registerHandlerStrict('SAVE', (payload: { type: 'SAVE' | 'DELETE' }) => {});
```

## 2. 条件类型 (Conditional Types)

**目的：** 创建依赖于条件的类型，实现精密的类型逻辑。

- **基础条件类型：**

```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<string>; // true
type B = IsString<number>; // false
```

- **提取返回类型：**

```typescript
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

function getUser() {
  return { id: 1, name: 'John' };
}

type User = ReturnType<typeof getUser>;
// 类型: { id: number; name: string; }
```

- **分发式条件类型：**

```typescript
type ToArray<T> = T extends any ? T[] : never;

type StrOrNumArray = ToArray<string | number>;
// 类型: string[] | number[]
```

- **嵌套条件：**

```typescript
type TypeName<T> = T extends string
  ? 'string'
  : T extends number
    ? 'number'
    : T extends boolean
      ? 'boolean'
      : T extends undefined
        ? 'undefined'
        : T extends Function
          ? 'function'
          : 'object';

type T1 = TypeName<string>; // "string"
type T2 = TypeName<() => void>; // "function"
```

## 3. 映射类型 (Mapped Types)

**目的：** 通过迭代现有类型的属性来转换类型。

- **基础映射类型：**

```typescript
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

interface User {
  id: number;
  name: string;
}

type ReadonlyUser = Readonly<User>;
// 类型: { readonly id: number; readonly name: string; }
```

- **可选属性：**

```typescript
type Partial<T> = {
  [P in keyof T]?: T[P];
};

type PartialUser = Partial<User>;
// 类型: { id?: number; name?: string; }
```

- **键名重映射 (Key Remapping)：**

```typescript
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person {
  name: string;
  age: number;
}

type PersonGetters = Getters<Person>;
// 类型: { getName: () => string; getAge: () => number; }
```

- **属性过滤：**

```typescript
type PickByType<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K];
};

interface Mixed {
  id: number;
  name: string;
  age: number;
  active: boolean;
}

type OnlyNumbers = PickByType<Mixed, number>;
// 类型: { id: number; age: number; }
```

## 4. 模板字面量类型 (Template Literal Types)

**目的：** 通过模式匹配和转换创建基于字符串的类型。

- **基础模板字面量：**

```typescript
type EventName = 'click' | 'focus' | 'blur';
type EventHandler = `on${Capitalize<EventName>}`;
// 类型: "onClick" | "onFocus" | "onBlur"
```

- **字符串操作：**

```typescript
type UppercaseGreeting = Uppercase<'hello'>; // "HELLO"
type LowercaseGreeting = Lowercase<'HELLO'>; // "hello"
type CapitalizedName = Capitalize<'john'>; // "John"
type UncapitalizedName = Uncapitalize<'John'>; // "john"
```

- **路径构建：**

```typescript
type Path<T> = T extends object
  ? {
      [K in keyof T]: K extends string ? `${K}` | `${K}.${Path<T[K]>}` : never;
    }[keyof T]
  : never;

interface Config {
  server: {
    host: string;
    port: number;
  };
  database: {
    url: string;
  };
}

type ConfigPath = Path<Config>;
// 类型: "server" | "database" | "server.host" | "server.port" | "database.url"
```

## 5. 工具类型 (Utility Types)

常用的内置类型转换工具

- **对象类型操作 (Object Mapping)：** 用于对 `interface` 或 `type` 定义的对象属性进行增删改查。

```typescript
// Partial<T> - 将所有属性变为可选
type PartialUser = Partial<User>;

// Required<T> - 将所有属性变为必选（清除 ? 修饰符）
type RequiredUser = Required<PartialUser>;

// Readonly<T> - 将所有属性变为只读
type ReadonlyUser = Readonly<User>;

// Pick<T, K> - 从对象中挑选出一组特定的键名，构造新类型
type UserName = Pick<User, 'name' | 'email'>;

// Omit<T, K> - 从对象中剔除一组特定的键名，构造新类型
type UserWithoutPassword = Omit<User, 'password'>;

// Record<K, T> - 构造一个对象类型，键名为 K，值为 T
type PageInfo = Record<'home' | 'about', { title: string }>;
```

- **联合类型操作 (Union Manipulation)：** 用于对 `A | B | C` 这种联合类型进行过滤、提取或剔除。

```typescript
// Exclude<T, U> - 从 T 中剔除可以赋值给 U 的类型
type T1 = Exclude<'a' | 'b' | 'c', 'a'>; // 结果: "b" | "c"

// Extract<T, U> - 从 T 中提取可以赋值给 U 的类型（取交集）
type T2 = Extract<'a' | 'b' | 'c', 'a' | 'b'>; // 结果: "a" | "b"

// NonNullable<T> - 从 T 中排除 null 和 undefined
type T3 = NonNullable<string | null | undefined>; // 结果: string
```

- **函数与类相关操作 (Function & Class)：** 利用 `infer` 关键字从函数定义、构造函数或类中提取内部类型。

```typescript
//  函数
// Parameters<T> - 提取函数的参数类型，以元组 (Tuple) 形式返回
type CreateUserArgs = Parameters<typeof createUser>; // [name: string, age: number]

// ReturnType<T> - 获取函数的返回值类型
type UserProfile = ReturnType<typeof createUser>; // { id: string }

// ThisParameterType<T> - 提取函数中显式定义的 'this' 参数类型
type ContextToHex = ThisParameterType<typeof toHex>; // number

// OmitThisParameter<T> - 移除函数中的 'this' 参数，返回普通函数类型
type SimpleToHex = OmitThisParameter<typeof toHex>; // () => string

//  类与构造函数
// ConstructorParameters<T> - 提取构造函数的参数类型
type PointArgs = ConstructorParameters<typeof Point>; // [x: number, y: number]

// InstanceType<T> - 获取类的实例类型（构造函数的返回值）
type PointInstance = InstanceType<typeof Point>; // Point 实例对象
```

- **异步与 Promise 处理 (Async & Promise)：** 用于处理异步逻辑中的嵌套类型。

```typescript
// Awaited<T> - 递归拆解 Promise，获取其 resolve 后的最终类型
type Config = Awaited<ReturnType<typeof fetchConfig>>; // { host: string; port: number; }
```

- **模板字面量与字符串操作 (Template Literals)：** 用于在类型层面处理字符串的大小写转换。

```typescript
// Uppercase<T> - 转换为大写
type UppercaseID = Uppercase<Identifier>; // "USER_NAME"

// Lowercase<T> - 转换为小写
type LowercaseID = Lowercase<'ADMIN'>; // "admin"

// Capitalize<T> - 首字母大写
type CapitalizeID = Capitalize<'john'>; // "John"

// Uncapitalize<T> - 首字母小写
type UncapitalizeID = Uncapitalize<'John'>; // "john"
```

## 类型推断技巧

- **Infer 关键字**

```typescript
// 提取数组元素类型
type ElementType<T> = T extends (infer U)[] ? U : never;

type NumArray = number[];
type Num = ElementType<NumArray>; // number

// 提取 Promise 内部类型
type PromiseType<T> = T extends Promise<infer U> ? U : never;

type AsyncNum = PromiseType<Promise<number>>; // number

// 提取函数参数
type Parameters<T> = T extends (...args: infer P) => any ? P : never;

function foo(a: string, b: number) {}

type FooParams = Parameters<typeof foo>; // [string, number]
```

- **类型守卫 (Type Guards)**

```typescript
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isArrayOf<T>(
  value: unknown,
  guard: (item: unknown) => item is T,
): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

const data: unknown = ['a', 'b', 'c'];

if (isArrayOf(data, isString)) {
  data.forEach(s => s.toUpperCase()); // 类型: string[]
}
```

- **断言函数 (Assertion Functions)**

```typescript
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error('Not a string');
  }
}

function processValue(value: unknown) {
  assertIsString(value);
  // value 此时被视为 string 类型
  console.log(value.toUpperCase());
}
```
