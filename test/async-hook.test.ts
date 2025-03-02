import { Hook } from '../src/asyn-hook';

describe('Hook class', () => {
  let hook: Hook;

  beforeEach(() => {
    hook = new Hook();
  });

  describe('addHook method', () => {
    it('should add hooks of different types', () => {
      const beforeFn = jest.fn();
      const afterFn = jest.fn();
      const errorFn = jest.fn();
      const wrapFn = jest.fn();

      hook.addHook('before', beforeFn);
      hook.addHook('after', afterFn);
      hook.addHook('error', errorFn);
      hook.addHook('wrap', wrapFn);

      // Accessing private property for testing
      const hooks = (hook as any)._hooks;
      expect(hooks.before).toContain(beforeFn);
      expect(hooks.after).toContain(afterFn);
      expect(hooks.error).toContain(errorFn);
      expect(hooks.wrap).toContain(wrapFn);
    });
  });

  describe('wrap method', () => {
    it('should apply wrapper functions in order', () => {
      const originalFn = jest.fn(() => 'original');
      const wrapper1 = jest.fn((fn) => (...args: any[]) => {
        return `wrapper1(${fn(...args)})`;
      });
      const wrapper2 = jest.fn((fn) => (...args: any[]) => {
        return `wrapper2(${fn(...args)})`;
      });

      hook.addHook('wrap', wrapper1);
      hook.addHook('wrap', wrapper2);

      const wrapped = hook.wrap(originalFn);
      const result = wrapped();

      expect(wrapper1).toHaveBeenCalled();
      expect(wrapper2).toHaveBeenCalled();
      expect(result).toBe('wrapper2(wrapper1(original))');
    });
  });

  describe('before method', () => {
    it('should execute before hooks before the main function', async () => {
      const beforeFn1 = jest.fn();
      const beforeFn2 = jest.fn();
      const mainFn = jest.fn().mockResolvedValue('result');
      
      hook.addHook('before', beforeFn1);
      hook.addHook('before', beforeFn2);
      
      const wrapped = hook.before(mainFn);
      await wrapped('arg1', 'arg2');
      
      expect(beforeFn1).toHaveBeenCalledWith('arg1', 'arg2');
      expect(beforeFn2).toHaveBeenCalledWith('arg1', 'arg2');
      expect(mainFn).toHaveBeenCalledWith('arg1', 'arg2');
      
      // Check execution order
      expect(beforeFn1.mock.invocationCallOrder[0]).toBeLessThan(mainFn.mock.invocationCallOrder[0]);
      expect(beforeFn2.mock.invocationCallOrder[0]).toBeLessThan(mainFn.mock.invocationCallOrder[0]);
    });
  });

  describe('after method', () => {
    it('should execute after hooks after the main function with the result', async () => {
      const afterFn1 = jest.fn();
      const afterFn2 = jest.fn();
      const mainFn = jest.fn().mockResolvedValue('result');
      
      hook.addHook('after', afterFn1);
      hook.addHook('after', afterFn2);
      
      const wrapped = hook.after(mainFn);
      const result = await wrapped('arg1', 'arg2');
      
      expect(afterFn1).toHaveBeenCalledWith('result', 'arg1', 'arg2');
      expect(afterFn2).toHaveBeenCalledWith('result', 'arg1', 'arg2');
      expect(mainFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe('result');
      
      // Check execution order
      expect(mainFn.mock.invocationCallOrder[0]).toBeLessThan(afterFn1.mock.invocationCallOrder[0]);
      expect(mainFn.mock.invocationCallOrder[0]).toBeLessThan(afterFn2.mock.invocationCallOrder[0]);
    });
  });

  describe('error method', () => {
    it('should execute error hooks when the main function throws', async () => {
      const error = new Error('test error');
      const errorFn1 = jest.fn();
      const errorFn2 = jest.fn();
      const mainFn = jest.fn().mockRejectedValue(error);
      
      hook.addHook('error', errorFn1);
      hook.addHook('error', errorFn2);
      
      const wrapped = hook.error(mainFn);
      
      await expect(wrapped('arg1', 'arg2')).rejects.toThrow('test error');
      
      expect(errorFn1).toHaveBeenCalledWith(error, 'arg1', 'arg2');
      expect(errorFn2).toHaveBeenCalledWith(error, 'arg1', 'arg2');
      expect(mainFn).toHaveBeenCalledWith('arg1', 'arg2');
    });
    
    it('should not execute error hooks when the main function succeeds', async () => {
      const errorFn = jest.fn();
      const mainFn = jest.fn().mockResolvedValue('result');
      
      hook.addHook('error', errorFn);
      
      const wrapped = hook.error(mainFn);
      const result = await wrapped('arg1', 'arg2');
      
      expect(errorFn).not.toHaveBeenCalled();
      expect(mainFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe('result');
    });
  });
});
