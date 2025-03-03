export type HookType = "before" | "after" | "error" | "wrap";

export class Hook {
    private _hooks: Record<HookType, any[]>;

    constructor() {
        this._hooks = {
            before: [],
            after: [],
            error: [],
            wrap: []
        }
    }

    public async addHook(type: HookType, callback: any) {
        this._hooks[type].push(callback);
    }

    public async wrap<T extends Function>(fn: T): Promise<T> {
        // First apply wrapper hooks
        let wrapped = this._hooks.wrap.reduce((wrapped, wrapHook) => {
            return wrapHook(wrapped);
        }, fn) as T;

        // Then apply the before, after, and error hooks in sequence
        wrapped = await this.error(await this.after(await this.before(wrapped)));

        return wrapped;
    }

    public async before<T extends Function>(fn: T): Promise<T> {
        const hooks = this._hooks.before;
        return (async function (this: any, ...args: any[]) {
            // Execute all before hooks
            for (const hook of hooks) {
                await hook(...args);
            }
            // Call the original function
            return await fn.apply(this, args);
        }) as unknown as T;
    }

    public async after<T extends Function>(fn: T): Promise<T> {
        const hooks = this._hooks.after;
        return (async function (this: any, ...args: any[]) {
            // Call the original function
            const result = await fn.apply(this, args);
            // Execute all after hooks
            for (const hook of hooks) {
                await hook(result, ...args);
            }
            return result;
        }) as unknown as T;
    }

    public async error<T extends Function>(fn: T): Promise<T> {
        const hooks = this._hooks.error;
        return (async function (this: any, ...args: any[]) {
            try {
                // Call the original function
                return await fn.apply(this, args);
            } catch (err) {
                // Execute all error hooks
                for (const hook of hooks) {
                    await hook(err, ...args);
                }
                // Re-throw the error
                throw err;
            }
        }) as unknown as T;
    }
}