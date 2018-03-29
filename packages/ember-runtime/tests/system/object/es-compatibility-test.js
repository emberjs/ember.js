import EmberObject from '../../../system/object';
import { Mixin } from 'ember-metal';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor('EmberObject ES Compatibility', class extends AbstractTestCase {
  ['@test extending an Ember.Object'](assert) {
    let calls = [];

    class MyObject extends EmberObject {
      constructor() {
        calls.push('constructor');
        super(...arguments);
        this.postInitProperty = 'post-init-property';
      }

      init() {
        calls.push('init');
        super.init(...arguments);
        this.initProperty = 'init-property';
      }
    }

    let myObject = MyObject.create({ passedProperty: 'passed-property' });

    assert.deepEqual(calls, ['constructor', 'init'], 'constructor then init called (create)');
    assert.equal(myObject.postInitProperty, 'post-init-property', 'constructor property available on instance (create)');
    assert.equal(myObject.initProperty, 'init-property', 'init property available on instance (create)');
    assert.equal(myObject.passedProperty, 'passed-property', 'passed property available on instance (create)');

    calls = [];
    myObject = new MyObject({ passedProperty: 'passed-property' });

    assert.deepEqual(calls, ['constructor', 'init'], 'constructor then init called (new)');
    assert.equal(myObject.postInitProperty, 'post-init-property', 'constructor property available on instance (new)');
    assert.equal(myObject.initProperty, 'init-property', 'init property available on instance (new)');
    assert.equal(myObject.passedProperty, 'passed-property', 'passed property available on instance (new)');
  }

  ['@test using super'](assert) {
    let calls = [];

    let SuperSuperObject = EmberObject.extend({
      method() {
        calls.push('super-super-method');
      }
    });

    let SuperObject = SuperSuperObject.extend({
      method() {
        this._super();
        calls.push('super-method');
      }
    });

    class MyObject extends SuperObject {
      method() {
        super.method();
        calls.push('method');
      }
    }

    let myObject = new MyObject();
    myObject.method();

    assert.deepEqual(calls, [
      'super-super-method',
      'super-method',
      'method'
    ], 'chain of prototype methods called with super');
  }

  ['@test using mixins'](assert) {
    let Mixin1 = Mixin.create({
      property1: 'data-1'
    });

    let Mixin2 = Mixin.create({
      property2: 'data-2'
    });

    class MyObject extends EmberObject.extend(Mixin1, Mixin2) {}

    let myObject = new MyObject();
    assert.equal(myObject.property1, 'data-1', 'includes the first mixin');
    assert.equal(myObject.property2, 'data-2', 'includes the second mixin');
  }

  ['@test using instanceof'](assert) {
    class MyObject extends EmberObject {}

    let myObject1 = MyObject.create();
    let myObject2 = new MyObject();

    assert.ok(myObject1 instanceof MyObject);
    assert.ok(myObject1 instanceof EmberObject);

    assert.ok(myObject2 instanceof MyObject);
    assert.ok(myObject2 instanceof EmberObject);
  }

  ['@test extending an ES subclass of EmberObject'](assert) {
    let calls = [];

    class SubEmberObject extends EmberObject {
      constructor() {
        calls.push('constructor');
        super(...arguments);
      }

      init() {
        calls.push('init');
        super.init(...arguments);
      }
    }

    class MyObject extends SubEmberObject {}

    MyObject.create();
    assert.deepEqual(calls, ['constructor', 'init'], 'constructor then init called (create)');

    calls = [];
    new MyObject();
    assert.deepEqual(calls, ['constructor', 'init'], 'constructor then init called (new)');
  }

  // TODO: Needs to be fixed. Currently only `init` is called.
  ['@skip calling extend on an ES subclass of EmberObject'](assert) {
    let calls = [];

    class SubEmberObject extends EmberObject {
      constructor() {
        calls.push('constructor');
        super(...arguments);
      }

      init() {
        calls.push('init');
        super.init(...arguments);
      }
    }

    let MyObject = SubEmberObject.extend({});

    MyObject.create();
    assert.deepEqual(calls, ['constructor', 'init'], 'constructor then init called (create)');

    calls = [];
    new MyObject();
    assert.deepEqual(calls, ['constructor', 'init'], 'constructor then init called (new)');
  }
});
