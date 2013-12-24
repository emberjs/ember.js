if (Ember.FEATURES.isEnabled('ember-metal-run-method')) {
  module('system/run_loop/run_method_test');

  test('Ember.run.method builds a run-loop wrapped method', function() {
    expect(3);

    var obj = {
      value: 0,
      increment: Ember.run.method(function(increment) {
        ok(Ember.run.currentRunLoop, 'expected a run-loop');
        return this.value += increment;
      })
    };

    equal(obj.increment(1), 1);
    equal(obj.value, 1);
  });
}
