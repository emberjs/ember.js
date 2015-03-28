import create from 'ember-metal/platform/create';

QUnit.module("Ember.create()");

QUnit.test("should inherit the properties from the parent object", function() {
  var obj = { foo: 'FOO' };
  var obj2 = create(obj);
  ok(obj !== obj2, 'should be a new instance');
  equal(obj2.foo, obj.foo, 'should inherit from parent');

  obj2.foo = 'BAR';
  equal(obj2.foo, 'BAR', 'should change foo');
  equal(obj.foo, 'FOO', 'modifying obj2 should not modify obj');
});

// NOTE: jshint may interfere with this test since it defines its own Object.create if missing
QUnit.test("passing additional property descriptors should define", function() {
  var obj = { foo: 'FOO', repl: 'obj' };
  var obj2 = create(obj, {
    bar: {
      value: 'BAR'
    },

    repl: {
      value: 'obj2'
    }
  });

  equal(obj2.bar, 'BAR', 'should have defined');
  equal(obj2.repl, 'obj2', 'should have replaced parent');
});

QUnit.test("passing additional property descriptors should not pollute parent object", function() {
  var obj = { foo: 'FOO', repl: 'obj' };
  var obj2 = create(obj, {
    repl: {
      value: 'obj2'
    }
  });

  notEqual(obj.repl, obj2.repl, 'should not pollute parent object');
});
