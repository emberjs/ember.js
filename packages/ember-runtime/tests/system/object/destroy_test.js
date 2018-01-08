import {
  run,
  observer,
  set,
  beginPropertyChanges,
  endPropertyChanges,
  peekMeta
} from 'ember-metal';
import { testBoth } from 'internal-test-helpers';
import EmberObject from '../../../system/object';
import { MANDATORY_SETTER } from 'ember/features';

QUnit.module('ember-runtime/system/object/destroy_test');

testBoth('should schedule objects to be destroyed at the end of the run loop', function(get , set, assert) {
  let obj = EmberObject.create();
  let meta;

  run(() => {
    obj.destroy();
    meta = peekMeta(obj);
    assert.ok(meta, 'meta is not destroyed immediately');
    assert.ok(get(obj, 'isDestroying'), 'object is marked as destroying immediately');
    assert.ok(!get(obj, 'isDestroyed'), 'object is not destroyed immediately');
  });

  meta = peekMeta(obj);
  assert.ok(get(obj, 'isDestroyed'), 'object is destroyed after run loop finishes');
});

if (MANDATORY_SETTER) {
  // MANDATORY_SETTER moves value to meta.values
  // a destroyed object removes meta but leaves the accessor
  // that looks it up
  QUnit.test('should raise an exception when modifying watched properties on a destroyed object', function(assert) {
    let obj = EmberObject.extend({
      fooDidChange: observer('foo', function() { })
    }).create({
      foo: 'bar'
    });

    run(() => obj.destroy());

    assert.throws(() => set(obj, 'foo', 'baz'), Error, 'raises an exception');
  });
}

QUnit.test('observers should not fire after an object has been destroyed', function(assert) {
  let count = 0;
  let obj = EmberObject.extend({
    fooDidChange: observer('foo', function() {
      count++;
    })
  }).create();

  obj.set('foo', 'bar');

  assert.equal(count, 1, 'observer was fired once');

  run(() => {
    beginPropertyChanges();
    obj.set('foo', 'quux');
    obj.destroy();
    endPropertyChanges();
  });

  assert.equal(count, 1, 'observer was not called after object was destroyed');
});

QUnit.test('destroyed objects should not see each others changes during teardown but a long lived object should', function(assert) {
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

  assert.equal(shouldNotChange, 0, 'destroyed graph objs should not see change in willDestroy');
  assert.equal(shouldChange, 1, 'long lived should see change in willDestroy');
});
