import {
  getCurrentRunLoop,
  hasScheduledTimers,
  cancelTimers,
  end
} from 'ember-metal';

function RunLoopAssertion(env) {
  this.env = env;
}

RunLoopAssertion.prototype = {
  reset: function() {},
  inject: function() {},
  assert: function() {
    let { assert } = QUnit.config.current;

    if (getCurrentRunLoop()) {
      assert.ok(false, 'Should not be in a run loop at end of test');
      while (getCurrentRunLoop()) {
        end();
      }
    }

    if (hasScheduledTimers()) {
      assert.ok(
        false,
        'Ember run should not have scheduled timers at end of test'
      );
      cancelTimers();
    }
  },
  restore: function() {}
};

export default RunLoopAssertion;
