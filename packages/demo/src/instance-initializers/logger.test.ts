import logger from './logger';

// jest test for instance-initializers/logger.ts
describe('instance-initializers/logger', () => {
  it('should log', () => {
    const mockLogger = {
      log: jest.fn(),
    };

    logger.initialize({
      lookup() {
        return mockLogger;
      },
    } as any);

    expect(mockLogger.log).toHaveBeenCalledWith('Instance initializer init');
  });
});
