export type HookType = "before" | "after" | "error" | "wrap";

interface HookRegistry {
  [name: string]: Array<{
    hook: Function;
    orig: Function;
    type: HookType;
  }>;
}

interface HookState {
  registry: HookRegistry;
}

export class Hook {
  private state: HookState;
  
  // API methods
  public before!: (name: string, fn: Function) => void;
  public after!: (name: string, fn: Function) => void;
  public error!: (name: string, fn: Function) => void;
  public wrap!: (name: string, fn: Function) => void;
  public remove!: (name?: string, fn?: Function) => void;
  public api: Record<string, any> = {};
  
  constructor() {
    this.state = {
      registry: {}
    };
    
    // Bind all methods
    this.bindApi();
  }

  private bindApi() {
    // Create the hook methods using direct binding
    this.remove = this.removeHook.bind(this, this.state);
    this.api.remove = this.remove;
    
    // Create hook methods for each type
    ["before", "error", "after", "wrap"].forEach((kind) => {
      (this as any)[kind] = this.addHook.bind(this, this.state, kind);
      this.api[kind] = (this as any)[kind];
    });
  }
  
  private addHook(state: HookState, kind: HookType, name: string, hook: Function) {
    const orig = hook;
    
    if (!state.registry[name]) {
      state.registry[name] = [];
    }
    
    let wrappedHook: Function;
    
    if (kind === "before") {
      wrappedHook = (method: Function, options: any) => {
        return Promise.resolve()
          .then(() => orig(options))
          .then(() => method(options));
      };
    } else if (kind === "after") {
      wrappedHook = (method: Function, options: any) => {
        let result: any;
        return Promise.resolve()
          .then(() => method(options))
          .then((result_: any) => {
            result = result_;
            return orig(result, options);
          })
          .then(() => {
            return result;
          });
      };
    } else if (kind === "error") {
      wrappedHook = (method: Function, options: any) => {
        return Promise.resolve()
          .then(() => method(options))
          .catch((error) => {
            return orig(error, options);
          });
      };
    } else {
      // Wrap hook
      wrappedHook = (method: Function, options: any) => {
        // Create a new function that wraps the original
        const wrappedFn = orig(method);
        // Call the wrapped function with the options
        return wrappedFn(options);
      };
    }
    
    state.registry[name].push({
      hook: wrappedHook,
      orig: orig,
      type: kind
    });
  }
  
  private removeHook(state: HookState, name?: string, hook?: Function) {
    if (!name && !hook) {
      // Remove all hooks
      state.registry = {};
      return;
    }
    
    if (!hook) {
      // Remove all hooks for this name
      delete state.registry[name!];
      return;
    }
    
    // Remove specific hook
    const hooks = state.registry[name!];
    if (hooks) {
      const index = hooks.findIndex(item => item.orig === hook || item.hook === hook);
      if (index !== -1) {
        hooks.splice(index, 1);
        if (hooks.length === 0) {
          delete state.registry[name!];
        }
      }
    }
  }
  
  public register(name: string | string[], method: Function, options: any = {}) {
    if (typeof method !== "function") {
      throw new Error("method for hook must be a function");
    }
    
    if (Array.isArray(name)) {
      return name.reverse().reduce((callback, name) => {
        return this.register.bind(this, name, callback, options);
      }, method)();
    }
    
    return Promise.resolve().then(() => {
      if (!this.state.registry[name]) {
        return method(options);
      }
      
      // Get hooks for this name and sort them by type for proper execution order
      const hooks = this.state.registry[name].slice();
      
      // Apply wrap hooks first
      const wrapHooks = hooks.filter(h => h.type === 'wrap');
      let wrappedMethod = method;
      
      for (const wrapHook of wrapHooks) {
        wrappedMethod = wrapHook.orig(wrappedMethod);
      }
      
      // Then apply before, after, and error hooks
      const beforeHooks = hooks.filter(h => h.type === 'before');
      const afterHooks = hooks.filter(h => h.type === 'after');
      const errorHooks = hooks.filter(h => h.type === 'error');
      
      // Create a chain of execution
      let finalMethod = wrappedMethod;
      
      // Add before hooks
      finalMethod = (options: any) => {
        let promise = Promise.resolve();
        
        // Run all before hooks
        for (const beforeHook of beforeHooks) {
          promise = promise.then(() => beforeHook.orig(options));
        }
        
        // Run the wrapped method
        return promise.then(() => wrappedMethod(options));
      };
      
      // Add after hooks
      const methodWithBefore = finalMethod;
      finalMethod = (options: any) => {
        return methodWithBefore(options).then((result: any) => {
          let promise = Promise.resolve(result);
          
          // Run all after hooks
          for (const afterHook of afterHooks) {
            promise = promise.then(currentResult => {
              return Promise.resolve(afterHook.orig(currentResult, options))
                .then(() => currentResult);
            });
          }
          
          return promise;
        });
      };
      
      // Add error hooks
      const methodWithBeforeAfter = finalMethod;
      finalMethod = (options: any) => {
        return methodWithBeforeAfter(options).catch((error: unknown) => {
          // Run all error hooks
          for (const errorHook of errorHooks) {
            try {
              return errorHook.orig(error, options);
            } catch (e) {
              // Continue to next error hook if this one throws
            }
          }
          
          // If we get here, no error hook handled it, so rethrow
          throw error;
        });
      };
      
      return finalMethod(options);
    });
  }
  
  // Static factory method
  public static Collection(): Function & { 
    before: Function;
    after: Function;
    error: Function;
    wrap: Function;
    remove: Function;
  } {
    const hook = new Hook();
    const register = hook.register.bind(hook);
    
    // Attach the hook methods to the register function
    (register as any).before = hook.before;
    (register as any).after = hook.after;
    (register as any).error = hook.error;
    (register as any).wrap = hook.wrap;
    (register as any).remove = hook.remove;
    
    return register as any;
  }
}