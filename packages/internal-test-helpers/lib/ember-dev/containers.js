import { Container } from 'container';

function ContainersAssert(env) {
  this.env = env;
}

const { _leakTracking: containerLeakTracking } = Container;

const LEAKS = [];

let hasLeakModule = false;

ContainersAssert.prototype = {
  reset: function() {},
  inject: function() {},
  assert: function() {
    if (containerLeakTracking === undefined) return;
    let { config } = QUnit;
    let { testName, testId, module: { name: moduleName }, finish: originalFinish } = config.current;
    config.current.finish = function() {
      originalFinish.call(this);
      config.queue.unshift(() => {
        if (containerLeakTracking.hasContainers()) {
          containerLeakTracking.reset();
          LEAKS.push(`${moduleName}: ${testName} testId=${testId}`);
          if (!hasLeakModule) {
            hasLeakModule = true;
            QUnit.module('Leaked Container', () => {
              QUnit.test(
                'Leaked Container',
                Object.assign(
                  assert => {
                    assert.deepEqual(LEAKS, []);
                  },
                  { validTest: true }
                )
              );
            });
          }
        }
      });
    };
  },
  restore: function() {},
};

export default ContainersAssert;
