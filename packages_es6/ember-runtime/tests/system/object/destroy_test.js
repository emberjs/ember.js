import Ember from "ember-metal/core";
import run from "ember-metal/run_loop";
import {platform} from "ember-metal/platform";
import {observer} from "ember-metal/mixin";
import {set} from "ember-metal/property_set";
import {bind} from "ember-metal/binding";
import {beginPropertyChanges, endPropertyChanges} from "ember-metal/property_events";
import {META_KEY} from "ember-metal/utils";
import objectKeys from "ember-runtime/keys";
import {testBoth} from 'ember-runtime/tests/props_helper';
import EmberObject from 'ember-runtime/system/object';

module('ember-runtime/system/object/destroy_test');

testBoth("should schedule objects to be destroyed at the end of the run loop", function(get, set) {
  var obj = EmberObject.create(), meta;

  run(function() {
    obj.destroy();
    meta = obj[META_KEY];
    ok(meta, "meta is not destroyed immediately");
    ok(get(obj, 'isDestroying'), "object is marked as destroying immediately");
    ok(!get(obj, 'isDestroyed'), "object is not destroyed immediately");
  });

  meta = obj[META_KEY];
  ok(!meta, "meta is destroyed after run loop finishes");
  ok(get(obj, 'isDestroyed'), "object is destroyed after run loop finishes");
});

test("should raise an exception when modifying watched properties on a destroyed object", function() {
  if (platform.hasAccessors) {
    var obj = EmberObject.createWithMixins({
      foo: "bar",
      fooDidChange: observer('foo', function() { })
    });

    run(function() {
      obj.destroy();
    });

    raises(function() {
      set(obj, 'foo', 'baz');
    }, Error, "raises an exception");
  } else {
    expect(0);
  }
});

test("observers should not fire after an object has been destroyed", function() {
  var count = 0;
  var obj = EmberObject.createWithMixins({
    fooDidChange: observer('foo', function() {
      count++;
    })
  });

  obj.set('foo', 'bar');

  equal(count, 1, "observer was fired once");

  run(function() {
    beginPropertyChanges();
    obj.set('foo', 'quux');
    obj.destroy();
    endPropertyChanges();
  });

  equal(count, 1, "observer was not called after object was destroyed");
});

test("destroyed objects should not see each others changes during teardown but a long lived object should", function () {
  var shouldChange = 0, shouldNotChange = 0;

  var objs = {};

  var A = EmberObject.extend({
    objs: objs,
    isAlive: true,
    willDestroy: function () {
      this.set('isAlive', false);
    },
    bDidChange: observer('objs.b.isAlive', function () {
      shouldNotChange++;
    }),
    cDidChange: observer('objs.c.isAlive', function () {
      shouldNotChange++;
    })
  });

  var B = EmberObject.extend({
    objs: objs,
    isAlive: true,
    willDestroy: function () {
      this.set('isAlive', false);
    },
    aDidChange: observer('objs.a.isAlive', function () {
      shouldNotChange++;
    }),
    cDidChange: observer('objs.c.isAlive', function () {
      shouldNotChange++;
    })
  });

  var C = EmberObject.extend({
    objs: objs,
    isAlive: true,
    willDestroy: function () {
      this.set('isAlive', false);
    },
    aDidChange: observer('objs.a.isAlive', function () {
      shouldNotChange++;
    }),
    bDidChange: observer('objs.b.isAlive', function () {
      shouldNotChange++;
    })
  });

  var LongLivedObject =  EmberObject.extend({
    objs: objs,
    isAliveDidChange: observer('objs.a.isAlive', function () {
      shouldChange++;
    })
  });

  objs.a = new A();

  objs.b = new B();

  objs.c = new C();

  var longLivedObject = new LongLivedObject();

  run(function () {
    var keys = objectKeys(objs);
    for (var i = 0, l = keys.length; i < l; i++) {
      objs[keys[i]].destroy();
    }
  });

  equal(shouldNotChange, 0, 'destroyed graph objs should not see change in willDestroy');
  equal(shouldChange, 1, 'long lived should see change in willDestroy');
});

test("bindings should be synced when are updated in the willDestroy hook", function() {
  var bar = EmberObject.create({
    value: false,
    willDestroy: function() {
      this.set('value', true);
    }
  });

  var foo = EmberObject.create({
    value: null,
    bar: bar
  });

  run(function() {
    bind(foo, 'value', 'bar.value');
  });

  ok(bar.get('value') === false, 'the initial value has been bound');

  run(function() {
    bar.destroy();
  });

  ok(foo.get('value'), 'foo is synced when the binding is updated in the willDestroy hook');
});
