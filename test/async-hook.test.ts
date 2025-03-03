import { Hook } from '../src/async-hook';

describe('Hook', () => {
  let hook: Function;
  let mockFn: jest.Mock;
  
  beforeEach(() => {
    hook = Hook.Collection();
    mockFn = jest.fn().mockResolvedValue('result');
  });
  
  describe('before hooks', () => {
    it('should execute before hooks before the main function', async () => {
      const beforeHook = jest.fn();
      let hookCalled = false;
      let fnCalled = false;
      
      beforeHook.mockImplementation((options) => {
        hookCalled = true;
        expect(fnCalled).toBe(false);
        return Promise.resolve();
      });
      
      mockFn.mockImplementation((options) => {
        fnCalled = true;
        expect(hookCalled).toBe(true);
        return Promise.resolve('result');
      });
      
      // Add the before hook
      (hook as any).before("test", beforeHook);
      
      // Call the function with hooks
      await hook("test", mockFn, { arg1: 'arg1', arg2: 'arg2' });
      
      expect(beforeHook).toHaveBeenCalledWith({ arg1: 'arg1', arg2: 'arg2' });
      expect(mockFn).toHaveBeenCalledWith({ arg1: 'arg1', arg2: 'arg2' });
      expect(hookCalled).toBe(true);
      expect(fnCalled).toBe(true);
    });
  });
  
  describe('after hooks', () => {
    it('should execute after hooks after the main function', async () => {
      const afterHook = jest.fn();
      let fnCalled = false;
      let hookCalled = false;
      
      mockFn.mockImplementation((options) => {
        fnCalled = true;
        expect(hookCalled).toBe(false);
        return Promise.resolve('result');
      });
      
      afterHook.mockImplementation((result, options) => {
        hookCalled = true;
        expect(fnCalled).toBe(true);
        expect(result).toBe('result');
        return Promise.resolve();
      });
      
      // Add the after hook
      (hook as any).after("test", afterHook);
      
      // Call the function with hooks
      const result = await hook("test", mockFn, { arg1: 'arg1', arg2: 'arg2' });
      
      expect(result).toBe('result');
      expect(afterHook).toHaveBeenCalledWith('result', { arg1: 'arg1', arg2: 'arg2' });
      expect(mockFn).toHaveBeenCalledWith({ arg1: 'arg1', arg2: 'arg2' });
      expect(hookCalled).toBe(true);
      expect(fnCalled).toBe(true);
    });
  });
  
  describe('error hooks', () => {
    it('should execute error hooks when an error occurs', async () => {
      const error = new Error('Test error');
      const errorHook = jest.fn().mockImplementation((err, options) => {
        expect(err).toBe(error);
        return Promise.resolve({ error: true });
      });
      
      mockFn.mockImplementation(() => {
        throw error;
      });
      
      // Add the error hook
      (hook as any).error("test", errorHook);
      
      // Call the function with hooks
      const result = await hook("test", mockFn, { arg1: 'arg1', arg2: 'arg2' });
      
      expect(result).toEqual({ error: true });
      expect(errorHook).toHaveBeenCalledWith(error, { arg1: 'arg1', arg2: 'arg2' });
      expect(mockFn).toHaveBeenCalledWith({ arg1: 'arg1', arg2: 'arg2' });
    });
  });
  
  describe('wrap hooks', () => {
    it('should apply wrap hooks to transform the function', async () => {
      const wrapHook = jest.fn((fn) => {
        return async (options: any) => {
          return `wrapped:${await fn(options)}`;
        };
      });
      
      // Add the wrap hook
      (hook as any).wrap("test", wrapHook);
      
      // Call the function with hooks
      const result = await hook("test", mockFn, { arg1: 'arg1', arg2: 'arg2' });
      
      expect(result).toBe('wrapped:result');
      expect(wrapHook).toHaveBeenCalled();
      expect(mockFn).toHaveBeenCalledWith({ arg1: 'arg1', arg2: 'arg2' });
    });
  });
  
  describe('multiple hooks', () => {
    it('should apply multiple hook types in correct order', async () => {
      const beforeHook = jest.fn();
      const afterHook = jest.fn();
      const wrapHook = jest.fn((fn) => {
        return async (options: any) => {
          return `wrapped:${await fn(options)}`;
        };
      });
      
      const callOrder: string[] = [];
      
      beforeHook.mockImplementation((options) => {
        callOrder.push('before');
        return Promise.resolve();
      });
      
      mockFn.mockImplementation((options) => {
        callOrder.push('function');
        return Promise.resolve('result');
      });
      
      afterHook.mockImplementation((result, options) => {
        callOrder.push('after');
        expect(result).toBe('wrapped:result');
        return Promise.resolve();
      });
      
      // Add hooks
      (hook as any).before("test", beforeHook);
      (hook as any).after("test", afterHook);
      (hook as any).wrap("test", wrapHook);
      
      // Call the function with hooks
      const result = await hook("test", mockFn, { arg1: 'arg1' });
      
      expect(result).toBe('wrapped:result');
      expect(callOrder).toEqual(['before', 'function', 'after']);
      expect(beforeHook).toHaveBeenCalledWith({ arg1: 'arg1' });
      expect(afterHook).toHaveBeenCalledWith('wrapped:result', { arg1: 'arg1' });
    });
  });
  
  describe('hook removal', () => {
    it('should allow removing specific hooks', async () => {
      const beforeHook1 = jest.fn();
      const beforeHook2 = jest.fn();
      
      // Add hooks
      (hook as any).before("test", beforeHook1);
      (hook as any).before("test", beforeHook2);
      
      // Remove one hook
      (hook as any).remove("test", beforeHook1);
      
      // Call the function with hooks
      await hook("test", mockFn, {});
      
      expect(beforeHook1).not.toHaveBeenCalled();
      expect(beforeHook2).toHaveBeenCalled();
    });
    
    it('should allow removing all hooks for a name', async () => {
      const beforeHook = jest.fn();
      const afterHook = jest.fn();
      
      // Add hooks
      (hook as any).before("test", beforeHook);
      (hook as any).after("test", afterHook);
      
      // Remove all hooks for "test"
      (hook as any).remove("test");
      
      // Call the function with hooks
      await hook("test", mockFn, {});
      
      expect(beforeHook).not.toHaveBeenCalled();
      expect(afterHook).not.toHaveBeenCalled();
    });
    
    it('should allow removing all hooks', async () => {
      const beforeHook = jest.fn();
      const afterHook = jest.fn();
      
      // Add hooks
      (hook as any).before("test1", beforeHook);
      (hook as any).after("test2", afterHook);
      
      // Remove all hooks
      (hook as any).remove();
      
      // Call the function with hooks
      await hook("test1", mockFn, {});
      await hook("test2", mockFn, {});
      
      expect(beforeHook).not.toHaveBeenCalled();
      expect(afterHook).not.toHaveBeenCalled();
    });
  });
  
  describe('multiple hook names', () => {
    it('should apply hooks for multiple names', async () => {
      const beforeHook1 = jest.fn();
      const beforeHook2 = jest.fn();
      
      // Add hooks
      (hook as any).before("auth", beforeHook1);
      (hook as any).before("request", beforeHook2);
      
      // Call the function with hooks
      await hook(["auth", "request"], mockFn, {});
      
      expect(beforeHook1).toHaveBeenCalled();
      expect(beforeHook2).toHaveBeenCalled();
    });
  });
});
