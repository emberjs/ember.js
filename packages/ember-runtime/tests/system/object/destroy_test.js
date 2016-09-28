import {
  isFeatureEnabled,
  run,
  observer,
  set,
  bind,
  beginPropertyChanges,
  endPropertyChanges,
  peekMeta
} from 'ember-metal';
import { testBoth } from 'internal-test-helpers';
import EmberObject from '../../../system/object';
QUnit.module('ember-runtime/system/object/destroy_test');

testBoth('should schedule objects to be destroyed at the end of the run loop', function(get, set) {
  let obj = EmberObject.create();
  let meta;

  run(() => {
    obj.destroy();
    meta = peekMeta(obj);
    ok(meta, 'meta is not destroyed immediately');
    ok(get(obj, 'isDestroying'), 'object is marked as destroying immediately');
    ok(!get(obj, 'isDestroyed'), 'object is not destroyed immediately');
  });

  meta = peekMeta(obj);
  ok(get(obj, 'isDestroyed'), 'object is destroyed after run loop finishes');
});

if (isFeatureEnabled('mandatory-setter')) {
  // MANDATORY_SETTER moves value to meta.values
  // a destroyed object removes meta but leaves the accessor
  // that looks it up
  QUnit.test('should raise an exception when modifying watched properties on a destroyed object', function() {
    let obj = EmberObject.extend({
      fooDidChange: observer('foo', function() { })
    }).create({
      foo: 'bar'
    });

    run(() => obj.destroy());

    throws(() => set(obj, 'foo', 'baz'), Error, 'raises an exception');
  });
}

QUnit.test('observers should not fire after an object has been destroyed', function() {
  let count = 0;
  let obj = EmberObject.extend({
    fooDidChange: observer('foo', function() {
      count++;
    })
  }).create();

  obj.set('foo', 'bar');

  equal(count, 1, 'observer was fired once');

  run(() => {
    beginPropertyChanges();
    obj.set('foo', 'quux');
    obj.destroy();
    endPropertyChanges();
  });

  equal(count, 1, 'observer was not called after object was destroyed');
});

QUnit.test('destroyed objects should not see each others changes during teardown but a long lived object should', function () {
  let shouldChange = 0;
  let shouldNotChange = 0;

  let objs = {};

  let A = EmberObject.extend({
    objs: objs,
    isAlive: true,
    willDestroy() {
      this.set('isAlive', false);
    },
    bDidChange: observer('objs.b.isAlive', function () {
      shouldNotChange++;
    }),
    cDidChange: observer('objs.c.isAlive', function () {
      shouldNotChange++;
    })
  });

  let B = EmberObject.extend({
    objs: objs,
    isAlive: true,
    willDestroy() {
      this.set('isAlive', false);
    },
    aDidChange: observer('objs.a.isAlive', function () {
      shouldNotChange++;
    }),
    cDidChange: observer('objs.c.isAlive', function () {
      shouldNotChange++;
    })
  });

  let C = EmberObject.extend({
    objs: objs,
    isAlive: true,
    willDestroy() {
      this.set('isAlive', false);
    },
    aDidChange: observer('objs.a.isAlive', function () {
      shouldNotChange++;
    }),
    bDidChange: observer('objs.b.isAlive', function () {
      shouldNotChange++;
    })
  });

  let LongLivedObject =  EmberObject.extend({
    objs: objs,
    isAliveDidChange: observer('objs.a.isAlive', function () {
      shouldChange++;
    })
  });

  objs.a = new A();

  objs.b = new B();

  objs.c = new C();

  new LongLivedObject();

  run(() => {
    let keys = Object.keys(objs);
    for (let i = 0; i < keys.length; i++) {
      objs[keys[i]].destroy();
    }
  });

  equal(shouldNotChange, 0, 'destroyed graph objs should not see change in willDestroy');
  equal(shouldChange, 1, 'long lived should see change in willDestroy');
});

QUnit.test('bindings should be synced when are updated in the willDestroy hook', function() {
  let bar = EmberObject.create({
    value: false,
    willDestroy() {
      this.set('value', true);
    }
  });

  let foo = EmberObject.create({
    value: null,
    bar: bar
  });

  run(() => {
    let deprecationMessage = /`Ember.Binding` is deprecated/;

    expectDeprecation(() => {
      bind(foo, 'value', 'bar.value');
    }, deprecationMessage);
  });

  ok(bar.get('value') === false, 'the initial value has been bound');

  run(() => bar.destroy());

  ok(foo.get('value'), 'foo is synced when the binding is updated in the willDestroy hook');
});
