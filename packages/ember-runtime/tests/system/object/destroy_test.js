/*globals raises */

module('ember-runtime/system/object/destroy_test');

testBoth("should schedule objects to be destroyed at the end of the run loop", function(get, set) {
  var obj = Ember.Object.create(), meta;

  Ember.run(function() {
    obj.destroy();
    meta = obj[Ember.META_KEY];
    ok(meta, "meta is not destroyed immediately");
    ok(get(obj, 'isDestroying'), "object is marked as destroying immediately");
    ok(!get(obj, 'isDestroyed'), "object is not destroyed immediately");
  });

  meta = obj[Ember.META_KEY];
  ok(!meta, "meta is destroyed after run loop finishes");
  ok(get(obj, 'isDestroyed'), "object is destroyed after run loop finishes");
});

test("should raise an exception when modifying watched properties on a destroyed object", function() {
  if (Ember.platform.hasAccessors) {
    var obj = Ember.Object.createWithMixins({
      foo: "bar",
      fooDidChange: Ember.observer(function() { }, 'foo')
    });

    Ember.run(function() {
      obj.destroy();
    });

    raises(function() {
      Ember.set(obj, 'foo', 'baz');
    }, Error, "raises an exception");
  } else {
    expect(0);
  }
});

test("observers should not fire after an object has been destroyed", function() {
  var count = 0;
  var obj = Ember.Object.createWithMixins({
    fooDidChange: Ember.observer(function() {
      count++;
    }, 'foo')
  });

  obj.set('foo', 'bar');

  equal(count, 1, "observer was fired once");

  Ember.run(function() {
    Ember.beginPropertyChanges();
    obj.set('foo', 'quux');
    obj.destroy();
    Ember.endPropertyChanges();
  });

  equal(count, 1, "observer was not called after object was destroyed");
});

test("destroyed objects should not see each others changes during teardown but a long lived object should", function () {
  var shouldChange = 0, shouldNotChange = 0;

  var objs = {};

  var A = Ember.Object.extend({
    objs: objs,
    isAlive: true,
    willDestroy: function () {
      this.set('isAlive', false);
    },
    bDidChange: Ember.observer(function () {
      shouldNotChange++;
    }, 'objs.b.isAlive'),
    cDidChange: Ember.observer(function () {
      shouldNotChange++;
    }, 'objs.c.isAlive')
  });

  var B = Ember.Object.extend({
    objs: objs,
    isAlive: true,
    willDestroy: function () {
      this.set('isAlive', false);
    },
    aDidChange: Ember.observer(function () {
      shouldNotChange++;
    }, 'objs.a.isAlive'),
    cDidChange: Ember.observer(function () {
      shouldNotChange++;
    }, 'objs.c.isAlive')
  });

  var C = Ember.Object.extend({
    objs: objs,
    isAlive: true,
    willDestroy: function () {
      this.set('isAlive', false);
    },
    aDidChange: Ember.observer(function () {
      shouldNotChange++;
    }, 'objs.a.isAlive'),
    bDidChange: Ember.observer(function () {
      shouldNotChange++;
    }, 'objs.b.isAlive')
  });

  var LongLivedObject =  Ember.Object.extend({
    objs: objs,
    isAliveDidChange: Ember.observer(function () {
      shouldChange++;
    }, 'objs.a.isAlive')
  });

  objs.a = new A();

  objs.b = new B();

  objs.c = new C();

  var longLivedObject = new LongLivedObject();

  Ember.run(function () {
    var keys = Ember.keys(objs);
    for (var i = 0, l = keys.length; i < l; i++) {
      objs[keys[i]].destroy();
    }
  });

  equal(shouldNotChange, 0, 'destroyed graph objs should not see change in willDestroy');
  equal(shouldChange, 1, 'long lived should see change in willDestroy');
});

test("bindings should be synced when are updated in the willDestroy hook", function() {
  var bar = Ember.Object.create({
    value: false,
    willDestroy: function() {
      this.set('value', true);
    }
  });

  var foo = Ember.Object.create({
    value: null,
    bar: bar
  });

  Ember.run(function() {
    Ember.bind(foo, 'value', 'bar.value');
  });

  ok(bar.get('value') === false, 'the initial value has been bound');

  Ember.run(function() {
    bar.destroy();
  });

  ok(foo.get('value'), 'foo is synced when the binding is updated in the willDestroy hook');
});
