// jest test for memory-usage.ts
import MemoryUsage from './memory-usage';

describe('helpers | memory-usage', () => {
  it('should retun from computation if no performance property', () => {
    const memoryUsage = new MemoryUsage();
    expect(memoryUsage.compute()).toBeNull();
  });
  it('should not call recompute if measureMemory called without performance', async () => {
    const memoryUsage = new MemoryUsage();
    const recomputeSpy = jest.spyOn(memoryUsage, 'recompute');
    await memoryUsage.measureMemory();
    expect(recomputeSpy).not.toHaveBeenCalled();
  });
  it('will destroy should clear interval', async () => {
    const memoryUsage = new MemoryUsage();
    let a = 1;
    const interval = setInterval(() => {
      a++;
      // NOOP
    }, 10);
    await new Promise((resolve) => setTimeout(resolve, 100));
    memoryUsage.interval = interval;
    expect(memoryUsage.interval).toBe(interval);
    const lastIntervalValue = a;
    memoryUsage.willDestroy();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(a).toBe(lastIntervalValue);
  });
});
