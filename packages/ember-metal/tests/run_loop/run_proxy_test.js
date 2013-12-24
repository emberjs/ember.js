if (Ember.FEATURES.isEnabled('ember-metal-run-proxy')) {
  module('system/run_loop/run_proxy_test');

  test('Ember.run.proxy builds a run-loop wrapped callback handler', function() {
    expect(3);

    var obj = {
      value: 0,
      increment: function(increment) {
        ok(Ember.run.currentRunLoop, 'expected a run-loop');
        return this.value += increment;
      }
    };

    var proxiedFunction = Ember.run.proxy(obj, obj.increment, 1);
    equal(proxiedFunction(), 1);
    equal(obj.value, 1);
  });
}
