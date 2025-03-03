import { Hook } from '../src/async-hook';

describe('Hook', () => {
  let hook: Hook;
  let mockFn: jest.Mock;
  
  beforeEach(() => {
    hook = new Hook();
    mockFn = jest.fn().mockResolvedValue('result');
  });
  
  describe('before hooks', () => {
    it('should execute before hooks before the main function', async () => {
      const beforeHook = jest.fn();
      let hookCalled = false;
      let fnCalled = false;
      
      beforeHook.mockImplementation(() => {
        hookCalled = true;
        expect(fnCalled).toBe(false);
      });
      
      mockFn.mockImplementation(() => {
        fnCalled = true;
        expect(hookCalled).toBe(true);
        return Promise.resolve('result');
      });
      
      hook.addHook('before', beforeHook);
      
      const wrapped = hook.before(mockFn);
      await wrapped('arg1', 'arg2');
      
      expect(beforeHook).toHaveBeenCalledWith('arg1', 'arg2');
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(hookCalled).toBe(true);
      expect(fnCalled).toBe(true);
    });
  });
  
  describe('after hooks', () => {
    it('should execute after hooks after the main function', async () => {
      const afterHook = jest.fn();
      let fnCalled = false;
      let hookCalled = false;
      
      mockFn.mockImplementation(() => {
        fnCalled = true;
        expect(hookCalled).toBe(false);
        return Promise.resolve('result');
      });
      
      afterHook.mockImplementation(() => {
        hookCalled = true;
        expect(fnCalled).toBe(true);
      });
      
      hook.addHook('after', afterHook);
      
      const wrapped = hook.after(mockFn);
      await wrapped('arg1', 'arg2');
      
      expect(afterHook).toHaveBeenCalledWith('result', 'arg1', 'arg2');
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(hookCalled).toBe(true);
      expect(fnCalled).toBe(true);
    });
  });
  
  describe('error hooks', () => {
    it('should execute error hooks when an error occurs', async () => {
      const error = new Error('Test error');
      mockFn.mockRejectedValue(error);
      
      const errorHook = jest.fn();
      hook.addHook('error', errorHook);
      
      const wrapped = hook.error(mockFn);
      
      await expect(wrapped('arg1', 'arg2')).rejects.toThrow('Test error');
      expect(errorHook).toHaveBeenCalledWith(error, 'arg1', 'arg2');
    });
  });
  
  describe('wrap hooks', () => {
    it('should apply wrap hooks to transform the function', async () => {
      const wrapHook = jest.fn((fn) => {
        return async (...args: any[]) => {
          return `wrapped:${await fn(...args)}`;
        };
      });
      
      hook.addHook('wrap', wrapHook);
      
      const wrapped = hook.wrap(mockFn);
      const result = await wrapped('arg1', 'arg2');
      
      expect(wrapHook).toHaveBeenCalledWith(mockFn);
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe('wrapped:result');
    });
  });
  
  describe('wrap method with all hooks', () => {
    it('should apply all hook types when using wrap', async () => {
      const beforeHook = jest.fn();
      const afterHook = jest.fn();
      const wrapHook = jest.fn((fn) => {
        return async (...args: any[]) => {
          return `wrapped:${await fn(...args)}`;
        };
      });
      
      hook.addHook('before', beforeHook);
      hook.addHook('after', afterHook);
      hook.addHook('wrap', wrapHook);
      
      const wrapped = hook.wrap(mockFn);
      const result = await wrapped('arg1', 'arg2');
      
      expect(beforeHook).toHaveBeenCalledWith('arg1', 'arg2');
      expect(afterHook).toHaveBeenCalledWith('wrapped:result', 'arg1', 'arg2');
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe('wrapped:result');
    });
    
    it('should handle errors properly with all hooks', async () => {
      const error = new Error('Test error');
      mockFn.mockRejectedValue(error);
      
      const beforeHook = jest.fn();
      const errorHook = jest.fn();
      const wrapHook = jest.fn(fn => fn); // Identity wrapper
      
      hook.addHook('before', beforeHook);
      hook.addHook('error', errorHook);
      hook.addHook('wrap', wrapHook);
      
      const wrapped = hook.wrap(mockFn);
      
      await expect(wrapped('arg1', 'arg2')).rejects.toThrow('Test error');
      expect(beforeHook).toHaveBeenCalledWith('arg1', 'arg2');
      expect(errorHook).toHaveBeenCalledWith(error, 'arg1', 'arg2');
    });
  });
});
