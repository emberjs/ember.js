import run from 'ember-metal/run_loop';

QUnit.module('system/run_loop/run_test');

QUnit.test('Ember.run invokes passed function, returning value', function() {
  var obj = {
    foo: function() { return [this.bar, 'FOO']; },
    bar: 'BAR',
    checkArgs: function(arg1, arg2) { return [arg1, this.bar, arg2]; }
  };

  equal(run(function() { return 'FOO'; }), 'FOO', 'pass function only');
  deepEqual(run(obj, obj.foo), ['BAR', 'FOO'], 'pass obj and obj.method');
  deepEqual(run(obj, 'foo'), ['BAR', 'FOO'], 'pass obj and "method"');
  deepEqual(run(obj, obj.checkArgs, 'hello', 'world'), ['hello', 'BAR', 'world'], 'pass obj, obj.method, and extra arguments');
});
