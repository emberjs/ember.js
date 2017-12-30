import { get } from '../..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

let obj;

moduleFor('Ember.get with path', class extends AbstractTestCase {
  constructor() {
    super();
    obj = {
      foo: {
        bar: {
          baz: { biff: 'BIFF' }
        }
      },
      foothis: {
        bar: {
          baz: { biff: 'BIFF' }
        }
      },
      falseValue: false,
      emptyString: '',
      Wuz: {
        nar: 'foo'
      },
      nullValue: null
    };
  }

  teardown() {
    obj = undefined;
  }

  // ..........................................................
  // LOCAL PATHS
  //
  ['@test [obj, foo] -> obj.foo'](assert) {
    assert.deepEqual(get(obj, 'foo'), obj.foo);
  }

  ['@test [obj, foo.bar] -> obj.foo.bar'](assert) {
    assert.deepEqual(get(obj, 'foo.bar'), obj.foo.bar);
  }

  ['@test [obj, foothis.bar] -> obj.foothis.bar'](assert) {
    assert.deepEqual(get(obj, 'foothis.bar'), obj.foothis.bar);
  }

  ['@test [obj, falseValue.notDefined] -> (undefined)'](assert) {
    assert.strictEqual(get(obj, 'falseValue.notDefined'), undefined);
  }

  ['@test [obj, emptyString.length] -> 0'](assert) {
    assert.strictEqual(get(obj, 'emptyString.length'), 0);
  }

  ['@test [obj, nullValue.notDefined] -> (undefined)'](assert) {
    assert.strictEqual(get(obj, 'nullValue.notDefined'), undefined);
  }

  // ..........................................................
  // GLOBAL PATHS TREATED LOCAL WITH GET
  //

  ['@test [obj, Wuz] -> obj.Wuz'](assert) {
    assert.deepEqual(get(obj, 'Wuz'), obj.Wuz);
  }

  ['@test [obj, Wuz.nar] -> obj.Wuz.nar'](assert) {
    assert.deepEqual(get(obj, 'Wuz.nar'), obj.Wuz.nar);
  }

  ['@test [obj, Foo] -> (undefined)'](assert) {
    assert.strictEqual(get(obj, 'Foo'), undefined);
  }

  ['@test [obj, Foo.bar] -> (undefined)'](assert) {
    assert.strictEqual(get(obj, 'Foo.bar'), undefined);
  }
});

