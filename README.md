# hookasync

A lightweight TypeScript library for adding hooks around asynchronous functions. This library allows you to execute code before or after your functions run, handle errors, or completely wrap your functions with custom logic.

## Installation

```bash
npm install hookasync
```

## Usage

### Basic Setup

```typescript
import hookasync from 'hookasync';

// Create a collection hook
const hook = hookasync.Collection();

// Add hooks for specific endpoints
hook.before("request", (options) => {
  console.log(`Request started for: ${options.url}`);
});

hook.after("request", (result, options) => {
  console.log(`Request completed for: ${options.url}`);
  return result;
});

// Use the hook with a function
async function fetchData(options) {
  const response = await fetch(options.url);
  return response.json();
}

// Register the function with the hook
const result = await hook("request", fetchData, { url: "https://api.example.com/data" });
```

### Hook Types

#### Before Hooks

Execute code before your function runs:

```typescript
// Add a before hook
hook.before("request", (options) => {
  console.log(`Request started for: ${options.url}`);
  // You can modify options - changes will be seen by the main function
  options.headers = { ...options.headers, 'X-Custom-Header': 'value' };
});
```

#### After Hooks

Execute code after your function completes:

```typescript
// Add an after hook
hook.after("request", (result, options) => {
  console.log(`Request completed for: ${options.url}, got ${result.length} items`);
  // Return value is ignored, but you can still use this hook to log or process the result
  // The original result is passed to subsequent hooks and returned to the caller
});
```

#### Error Hooks

Handle errors from your function:

```typescript
// Add an error hook
hook.error("request", (error, options) => {
  console.error(`Request failed for ${options.url}: ${error.message}`);
  
  // Error hooks can:
  // 1. Return a value (prevents the error from propagating)
  return { error: error.message, data: [] };
  
  // 2. Or throw to let the error propagate
  // throw error;
});
```

#### Wrap Hooks

Completely transform how your function works:

```typescript
// Create a wrapper that adds caching
const cache = {};

hook.wrap("request", (fn) => {
  // fn is the original function or previously wrapped function
  return async (options) => {
    const cacheKey = options.url;
    
    if (cache[cacheKey]) {
      console.log(`Using cached result for ${options.url}`);
      return cache[cacheKey];
    }
    
    console.log(`No cache for ${options.url}, calling original function`);
    const result = await fn(options);
    cache[cacheKey] = result;
    return result;
  };
});
```

### Hook Execution Order

When using multiple hooks, they execute in the following order:

1. All **wrap** hooks are applied first (in registration order)
2. Then **before** hooks run (in registration order)
3. Then the original function executes
4. Then **after** hooks run (in registration order)
5. If an error occurs at any point, **error** hooks run

### Removing Hooks

You can remove hooks when they are no longer needed:

```typescript
// Remove a specific hook
const logHook = (options) => console.log(`Request: ${options.url}`);
hook.before("request", logHook);
// Later:
hook.remove("request", logHook);

// Remove all hooks for a specific name
hook.remove("request");

// Remove all hooks
hook.remove();
```

### Advanced: Registering Multiple Hooks

You can register a function with multiple hook names at once:

```typescript
// Register the same function with multiple hook names
const result = await hook(["auth", "request", "response"], fetchData, options);

// This applies all hooks from each name in sequence (right to left)
// equivalent to:
// const fn1 = applyResponseHooks(fetchData)
// const fn2 = applyRequestHooks(fn1)
// const result = await applyAuthHooks(fn2)(options)
```

## TypeScript Usage

The library includes TypeScript definitions:

```typescript
import hookasync from 'hookasync';

interface RequestOptions {
  url: string;
  headers?: Record<string, string>;
}

interface ResponseData {
  id: number;
  name: string;
}

const hook = hookasync.Collection();

// TypeScript will infer parameter types
hook.before("request", (options: RequestOptions) => {
  options.headers = { 'Authorization': 'Bearer token' };
});

hook.after("request", (result: ResponseData[], options: RequestOptions) => {
  console.log(`Got ${result.length} items`);
});

async function fetchData(options: RequestOptions): Promise<ResponseData[]> {
  // Implementation
}

// Get typed results
const result: ResponseData[] = await hook("request", fetchData, { url: "/api/data" });
```

## API Reference

### Static Methods

#### `hookasync.Collection()`

Creates a collection hook that allows registering hooks for named operations.

### Instance Methods

#### `hook.before(name, callback)`

Adds a hook to run before the specified operation.

- **name**: The operation name (string)
- **callback**: Function to call before the operation. Receives options.

#### `hook.after(name, callback)`

Adds a hook to run after the specified operation.

- **name**: The operation name (string)
- **callback**: Function to call after the operation. Receives result and options.

#### `hook.error(name, callback)`

Adds a hook to run when an error occurs during the operation.

- **name**: The operation name (string)
- **callback**: Function to call when error occurs. Receives error and options.

#### `hook.wrap(name, wrapper)`

Adds a wrapper function that transforms the operation.

- **name**: The operation name (string)
- **wrapper**: Function that receives the original function and returns a new function.

#### `hook.remove([name], [callback])`

Removes hooks.

- **name** (optional): The operation name to remove hooks from
- **callback** (optional): Specific hook function to remove

#### `hook(name, method, options)`

Executes a method with registered hooks.

- **name**: The operation name (string) or array of names
- **method**: The function to execute
- **options**: Options to pass to the function and hooks

## License

MIT
