#!/usr/bin/env node

const https = require('https');

const APIFOX_BASE_URL = 'https://api.apifox.com/v1';

/**
 * 发送 HTTPS 请求
 */
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'POST', ...options }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${e.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

/**
 * 获取 OpenAPI 数据
 */
async function fetchOpenAPI(projectId) {
  const token = process.env.APIFOX_ACCESS_TOKEN;
  if (!token) {
    throw new Error('Missing APIFOX_ACCESS_TOKEN environment variable');
  }

  const resolvedProjectId = projectId || process.env.APIFOX_PROJECT_ID;
  if (!resolvedProjectId) {
    throw new Error('Missing APIFOX_PROJECT_ID environment variable or --projectId parameter');
  }
  const url = `${APIFOX_BASE_URL}/projects/${resolvedProjectId}/export-openapi?locale=zh-CN`;

  const headers = {
    Authorization: `Bearer ${token}`,
    'X-Apifox-Api-Version': '2024-03-28',
    'Content-Type': 'application/json',
  };

  const body = {
    scope: { type: 'ALL' },
    options: {
      includeApifoxExtensionProperties: false,
      addFoldersToTags: false,
    },
    oasVersion: '3.1',
    exportFormat: 'JSON',
  };

  return httpRequest(url, { headers, body });
}

/**
 * 提取模块名
 */
function extractModule(pathStr) {
  const parts = pathStr.trim('/').split('/');
  if (parts.length < 2) return 'other';

  if (parts[0] === 'api') {
    if (parts.length >= 4 && parts[1] === 'v3') {
      return `api.${parts[3]}`;
    } else if (parts.length >= 3) {
      return `api.${parts[2]}`;
    }
    return 'api';
  } else if (parts[0] === 'rpc') {
    return parts.length >= 2 ? `rpc.${parts[1]}` : 'rpc';
  }
  return 'other';
}

/**
 * 深度遍历收集所有 $ref
 */
function collectRefs(node, refs = new Set()) {
  if (!node || typeof node !== 'object') return refs;
  if (Array.isArray(node)) {
    for (const item of node) collectRefs(item, refs);
  } else {
    if (typeof node['$ref'] === 'string') {
      refs.add(node['$ref']);
    }
    for (const value of Object.values(node)) {
      collectRefs(value, refs);
    }
  }
  return refs;
}

/**
 * 将 $ref 路径转为 schema 对象
 */
function resolveRef(oas, ref) {
  // "#/components/schemas/Foo" → oas.components.schemas.Foo
  const parts = ref.replace(/^#\//, '').split('/');
  return parts.reduce((obj, key) => obj?.[key], oas);
}

/**
 * 递归解析所有 $ref，支持嵌套引用，防止循环引用
 */
function resolveAllRefs(oas, sources) {
  const result = {};
  const pending = new Set();
  const visited = new Set();

  // 收集初始 $ref
  for (const source of sources) {
    for (const ref of collectRefs(source)) {
      pending.add(ref);
    }
  }

  // BFS 递归解析
  while (pending.size > 0) {
    for (const ref of [...pending]) {
      pending.delete(ref);
      if (visited.has(ref)) continue;
      visited.add(ref);

      const schema = resolveRef(oas, ref);
      if (!schema) continue;

      // 提取 schema 名作为 key（最后一段路径）
      const name = ref.split('/').pop();
      result[name] = schema;

      // 收集该 schema 内部的嵌套 $ref
      for (const nestedRef of collectRefs(schema)) {
        if (!visited.has(nestedRef)) {
          pending.add(nestedRef);
        }
      }
    }
  }

  return result;
}

/**
 * 参数解析
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const params = {};

  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const value = args[i + 1];
      if (!value || value.startsWith('--')) {
        params[key] = true;
      } else {
        params[key] = value;
        i++;
      }
    }
  }

  return { cmd, params };
}

/**
 * 输出 JSON
 */
function printJson(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

/**
 * get_path: 获取接口详情（返回完整的 OpenAPI 3.1.0 规范结构，仅包含相关内容）
 */
async function cmdGetPath(params) {
  if (!params.path || !params.method) {
    throw new Error('Missing required parameters: --path and --method');
  }

  const oas = await fetchOpenAPI(params.projectId);

  const pathItem = oas.paths?.[params.path];
  if (!pathItem) {
    throw new Error(`Path not found: ${params.path}`);
  }

  const operation = pathItem[params.method.toLowerCase()];
  if (!operation) {
    throw new Error(`Method not found: ${params.method.toUpperCase()} ${params.path}`);
  }

  // 收集涉及的 Schema
  const sources = [operation.parameters, operation.requestBody, operation.responses];

  let schemas = {};
  if (params['resolve-refs']) {
    // 启用 resolve-refs：递归解析所有嵌套 $ref
    schemas = resolveAllRefs(oas, sources);
  } else {
    // 默认：只收集第一层的 $ref
    const refs = collectRefs(sources);
    for (const ref of refs) {
      const name = ref.split('/').pop();
      const schema = resolveRef(oas, ref);
      if (schema) schemas[name] = schema;
    }
  }

  // 收集涉及的 tags
  const tagNames = new Set(operation.tags || []);
  const tags = [];
  for (const tag of oas.tags || []) {
    if (tagNames.has(tag.name)) {
      tags.push(tag);
    }
  }

  // 构建 OpenAPI 3.1.0 规范结构（仅包含相关内容）
  const result = {
    openapi: oas.openapi || '3.1.0',
    info: oas.info || {},
    paths: {
      [params.path]: {
        [params.method.toLowerCase()]: operation,
      },
    },
    components: {
      schemas,
    },
  };

  // 添加可选字段
  if (tags.length > 0) {
    result.tags = tags;
  }

  if (oas.servers) {
    result.servers = oas.servers;
  }

  if (oas.webhooks) {
    result.webhooks = oas.webhooks;
  }

  if (oas.components?.responses) {
    result.components.responses = oas.components.responses;
  }
  if (oas.components?.securitySchemes) {
    result.components.securitySchemes = oas.components.securitySchemes;
  }

  // 添加顶级 security（如果存在）
  if (oas.security) {
    result.security = oas.security;
  }

  return result;
}

/**
 * get_schema: 获取 Schema 定义
 */
async function cmdGetSchema(params) {
  if (!params.name) {
    throw new Error('Missing required parameter: --name');
  }

  const oas = await fetchOpenAPI(params.projectId);
  const schema = oas.components?.schemas?.[params.name];
  if (!schema) {
    throw new Error(`Schema not found: ${params.name}`);
  }

  return schema;
}

/**
 * search_paths: 搜索接口
 */
async function cmdSearchPaths(params) {
  if (!params.keyword) {
    throw new Error('Missing required parameter: --keyword');
  }

  const oas = await fetchOpenAPI(params.projectId);
  const paths = oas.paths || {};
  const results = [];
  const keywordLower = params.keyword.toLowerCase();
  const limit = params.limit ? parseInt(params.limit) : null;

  for (const [pathStr, pathItem] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!['get', 'post', 'put', 'delete', 'patch'].includes(method)) continue;

      const module = extractModule(pathStr);
      if (params.module && module !== params.module) continue;
      if (params.method && method.toUpperCase() !== params.method.toUpperCase()) continue;

      const summary = operation.summary || '';
      if (
        pathStr.toLowerCase().includes(keywordLower) ||
        summary.toLowerCase().includes(keywordLower)
      ) {
        results.push({
          path: pathStr,
          method: method.toUpperCase(),
          module,
          summary,
        });

        if (limit && results.length >= limit) {
          return { keyword: params.keyword, total: results.length, paths: results };
        }
      }
    }
  }

  return { keyword: params.keyword, total: results.length, paths: results };
}

/**
 * list_modules: 列出所有模块
 */
async function cmdListModules(params) {
  const oas = await fetchOpenAPI(params.projectId);
  const paths = oas.paths || {};
  const moduleMap = {};

  for (const pathStr of Object.keys(paths)) {
    const module = extractModule(pathStr);
    moduleMap[module] = (moduleMap[module] || 0) + 1;
  }

  const modules = Object.entries(moduleMap).map(([name, count]) => ({
    name,
    paths_count: count,
  }));

  return { total: modules.length, modules: modules.sort((a, b) => b.paths_count - a.paths_count) };
}

/**
 * get_module: 获取模块的所有接口
 */
async function cmdGetModule(params) {
  if (!params.module) {
    throw new Error('Missing required parameter: --module');
  }

  const oas = await fetchOpenAPI(params.projectId);
  const paths = oas.paths || {};
  const results = [];

  for (const [pathStr, pathItem] of Object.entries(paths)) {
    const module = extractModule(pathStr);
    if (module !== params.module) continue;

    for (const [method, operation] of Object.entries(pathItem)) {
      if (!['get', 'post', 'put', 'delete', 'patch'].includes(method)) continue;

      results.push({
        path: pathStr,
        method: method.toUpperCase(),
        module,
        summary: operation.summary || '',
      });
    }
  }

  return { module: params.module, total: results.length, paths: results };
}

/**
 * 主程序
 */
async function main() {
  try {
    const { cmd, params } = parseArgs();

    let data;
    switch (cmd) {
      case 'get_path':
        data = await cmdGetPath(params);
        break;
      case 'get_schema':
        data = await cmdGetSchema(params);
        break;
      case 'search_paths':
        data = await cmdSearchPaths(params);
        break;
      case 'list_modules':
        data = await cmdListModules(params);
        break;
      case 'get_module':
        data = await cmdGetModule(params);
        break;
      default:
        throw new Error(`Unknown command: ${cmd}`);
    }

    printJson({ success: true, data });
  } catch (error) {
    printJson({ success: false, error: error.message });
    process.exit(1);
  }
}

main();
