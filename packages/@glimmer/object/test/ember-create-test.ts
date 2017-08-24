import EmberObject, { computed } from '..';

let moduleOptions;

QUnit.module('GlimmerObject.create', moduleOptions);

QUnit.test('simple properties are set', assert => {
  let o = EmberObject.create({ ohai: 'there' });
  assert.equal(o.get('ohai'), 'there');
});

QUnit.test('reopening a parent flushes the child', assert => {
  let MyClass = EmberObject.extend();

  let SubClass = MyClass.extend();

  MyClass.reopen({
    hello() {
      return "hello";
    }
  });

  let sub: any = SubClass.create();

  assert.equal(sub.hello(), "hello");
});

QUnit.test('reopening a parent flushes the child', assert => {
  let MyClass = EmberObject.extend({
    hello() {
      return "original hello";
    }
  });

  let SubClass = MyClass.extend({
    hello(this: any) {
      return this._super();
    }
  });

  let GrandChild = SubClass.extend({
    hello(this: any) {
      return this._super();
    }
  });

  MyClass.reopen({
    hello(this: any) {
      return this._super() + " new hello";
    }
  });

  let sub: any = GrandChild.create();

  assert.equal(sub.hello(), "original hello new hello");
});

QUnit.test('reopening a parent with a computed property flushes the child', assert => {
  let MyClass = EmberObject.extend({
    hello: computed(function() {
      return "original hello";
    })
  });

  let SubClass = MyClass.extend({
    hello: computed(function(this: any) {
      return this._super();
    })
  });

  let GrandChild = SubClass.extend({
    hello: computed(function(this: any) {
      return this._super();
    })
  });

  MyClass.reopen({
    hello: computed(function(this: any) {
      return this._super() + " new hello";
    })
  });

  let sub: any = GrandChild.create();

  assert.equal(sub.hello, "original hello new hello");
});

QUnit.test('calls computed property setters', assert => {
  let MyClass = EmberObject.extend({
    foo: computed({
      get: function() {
        return 'this is not the value you\'re looking for';
      },
      set: function(_, value) {
        return value;
      }
    })
  });

  let o = MyClass.create({ foo: 'bar' });
  assert.equal(o.get('foo'), 'bar');
});

// This test is for IE8.
QUnit.test('property name is the same as own prototype property', assert => {
  let MyClass = EmberObject.extend({
    toString() { return 'MyClass'; }
  });

  assert.equal(MyClass.create().toString(), 'MyClass', 'should inherit property from the arguments of `EmberObject.create`');
});

QUnit.test('inherits properties from passed in EmberObject', assert => {
  let baseObj = EmberObject.create({ foo: 'bar' });
  let secondaryObj = EmberObject.create(baseObj);

  assert.equal(secondaryObj['foo'], baseObj['foo'], 'Em.O.create inherits properties from EmberObject parameter');
});
