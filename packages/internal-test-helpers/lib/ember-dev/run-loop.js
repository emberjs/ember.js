/* globals QUnit */

function RunLoopAssertion(env){
  this.env = env;
}

RunLoopAssertion.prototype = {
  reset: function(){},
  inject: function(){},
  assert: function(){
    var run = this.env.Ember.run;

    if (run.currentRunLoop) {
      QUnit.ok(false, "Should not be in a run loop at end of test");
      while (run.currentRunLoop) {
        run.end();
      }
    }

    if (run.hasScheduledTimers()) {
      QUnit.ok(false, "Ember run should not have scheduled timers at end of test");
      run.cancelTimers();
    }
  },
  restore: function(){}
};

export default RunLoopAssertion;
