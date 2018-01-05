function RunLoopAssertion(env){
  this.env = env;
}

RunLoopAssertion.prototype = {
  reset: function(){},
  inject: function(){},
  assert: function(){
    let { assert } = QUnit.config.current;
    var run = this.env.Ember.run;

    if (run.currentRunLoop) {
      assert.ok(false, "Should not be in a run loop at end of test");
      while (run.currentRunLoop) {
        run.end();
      }
    }

    if (run.hasScheduledTimers()) {
      assert.ok(false, "Ember run should not have scheduled timers at end of test");
      run.cancelTimers();
    }
  },
  restore: function(){}
};

export default RunLoopAssertion;
