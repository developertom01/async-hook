# hookasync

A lightweight TypeScript library for adding hooks around asynchronous functions. This library allows you to execute code before or after your functions run, handle errors, or completely wrap your functions with custom logic.

## Installation

```bash
npm install hookasync
```

## Usage

### Basic Setup

```typescript
import { Hook } from 'hookasync';

// Create a new hook instance
const hook = new Hook();
```

### Adding Before Hooks

Execute code before your function runs:

```typescript
// Define a function with a before hook
const logRequest = async (url: string) => {
  console.log(`Request started: ${url}`);
};

// Add the hook
await hook.addHook('before', logRequest);

// Create your main function
const fetchData = async (url: string) => {
  const response = await fetch(url);
  return response.json();
};

// Apply the hook
const wrappedFetch = await hook.before(fetchData);

// Usage - this will log the request before fetching
const data = await wrappedFetch('https://api.example.com/data');
```

### Adding After Hooks

Execute code after your function completes:

```typescript
// Define a function with an after hook
const logResponse = async (result: any, url: string) => {
  console.log(`Request completed: ${url}, got ${result.length} items`);
};

// Add the hook
hook.addHook('after', logResponse);

// Apply the hook
const wrappedFetch = hook.after(fetchData);

// Usage - this will log details about the response after fetching
const data = await wrappedFetch('https://api.example.com/data');
```

### Error Handling

Execute code when your function throws an error:

```typescript
// Define an error handler
const logError = async (err: Error, url: string) => {
  console.error(`Request failed for ${url}: ${err.message}`);
};

// Add the hook
hook.addHook('error', logError);

// Apply the hook
const wrappedFetch = hook.error(fetchData);

// Usage - this will log any errors that occur during the fetch
try {
  const data = await wrappedFetch('https://invalid-url');
} catch (err) {
  // The error is still thrown after hooks run
  console.log('Caught error in main code');
}
```

### Function Wrapping

Completely transform how your function works:

```typescript
// Define a wrapper function
const cacheWrapper = (fn: Function) => {
  const cache: Record<string, any> = {};
  
  return async (url: string) => {
    if (cache[url]) {
      console.log(`Using cached result for ${url}`);
      return cache[url];
    }
    
    console.log(`No cache for ${url}, calling original function`);
    const result = await fn(url);
    cache[url] = result;
    return result;
  };
};

// Add the hook
hook.addHook('wrap', cacheWrapper);

// Apply the hook
const wrappedFetch = hook.wrap(fetchData);

// First call will fetch data
const data1 = await wrappedFetch('https://api.example.com/data');
// Second call with same URL will use cached data
const data2 = await wrappedFetch('https://api.example.com/data');
```

### Combining Multiple Hooks

You can combine different types of hooks in two ways:

#### Method 1: Chain individual hook methods

```typescript
const enhancedFetch = hook.before(hook.after(hook.error(fetchData)));

// Or more clearly with intermediate variables
const withError = hook.error(fetchData);
const withAfter = hook.after(withError);
const fullyWrapped = hook.before(withAfter);
```

#### Method 2: Use the wrap() method (recommended)

The `wrap()` method applies ALL registered hooks (before, after, error, and wrap hooks) in a single operation:

```typescript
// Add various hooks
hook.addHook('before', logRequest);
hook.addHook('after', logResponse);
hook.addHook('error', logError);
hook.addHook('wrap', cacheWrapper);

// Apply all hooks at once with a single method call
const fullyEnhancedFetch = await hook.wrap(fetchData);

// This will run before hooks, the function, after hooks, and 
// handle errors with error hooks - all in the correct sequence
const data = await fullyEnhancedFetch('https://api.example.com/data');
```

## API Reference

### `Hook` Class

The main class that provides hook functionality.

#### Constructor

```typescript
constructor()
```

Creates a new Hook instance.

#### Methods

##### `async addHook(type: HookType, callback: Function)`

Adds a new hook of the specified type.

- **type**: `'before' | 'after' | 'error' | 'wrap'`
- **callback**: The function to be called as a hook

##### `async wrap<T extends Function>(fn: T): Promise<T>`

Applies all registered hooks to the given function in the following order:
1. First applies any wrap hooks to transform the function
2. Then applies before, after, and error hooks in the correct sequence

This is the recommended method when you want to apply multiple types of hooks.

##### `async before<T extends Function>(fn: T): Promise<T>`

Returns a wrapped version of the function that executes all "before" hooks before calling the original function.

##### `async after<T extends Function>(fn: T): Promise<T>`

Returns a wrapped version of the function that executes all "after" hooks after the original function completes.

##### `async error<T extends Function>(fn: T): Promise<T>`

Returns a wrapped version of the function that executes all "error" hooks when the original function throws an error.

## License

MIT
