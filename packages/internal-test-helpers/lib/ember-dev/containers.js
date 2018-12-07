import { Container } from '@ember/-internals/container';

function ContainersAssert(env) {
  this.env = env;
}

const { _leakTracking: containerLeakTracking } = Container;

ContainersAssert.prototype = {
  reset: function() {},
  inject: function() {},
  assert: function() {
    if (containerLeakTracking === undefined) return;
    let { config } = QUnit;
    let {
      testName,
      testId,
      module: { name: moduleName },
      finish: originalFinish,
    } = config.current;
    config.current.finish = function() {
      originalFinish.call(this);
      originalFinish = undefined;
      config.queue.unshift(function() {
        if (containerLeakTracking.hasContainers()) {
          containerLeakTracking.reset();
          // eslint-disable-next-line no-console
          console.assert(
            false,
            `Leaked container after test ${moduleName}: ${testName} testId=${testId}`
          );
        }
      });
    };
  },
  restore: function() {},
};

export default ContainersAssert;
