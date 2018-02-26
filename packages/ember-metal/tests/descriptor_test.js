import { Object as EmberObject } from 'ember-runtime';
import {
  Mixin,
  defineProperty,
  descriptor
} from '..';

// IE9 soft-fails when trying to delete a non-configurable property
const hasCompliantDelete = (function() {
  let obj = {};

  Object.defineProperty(obj, 'zomg', { configurable: false, value: 'zomg' });

  try {
    delete obj.zomg;
  } catch (e) {
    return true;
  }

  return false;
})();

// IE9 soft-fails when trying to assign to a non-writable property
const hasCompliantAssign = (function() {
  let obj = {};

  Object.defineProperty(obj, 'zomg', { writable: false, value: 'zomg' });

  try {
    obj.zomg = 'lol';
  } catch (e) {
    return true;
  }

  return false;
})();

class DescriptorTest {

  /* abstract static module(title: string); */

  static test(title, callback) {
    QUnit.test(title, assert => {
      callback(assert, new this(assert));
    });
  }

  constructor(assert) {
    this.assert = assert;
  }

  /* abstract install(key: string, desc: Descriptor); */

  /* abstract set(key: string, value: any); */

  /* abstract finalize(): Object; */
}

let classes = [

  class extends DescriptorTest {
    static module(title) {
      QUnit.module(`${title}: using defineProperty on an object directly`);
    }

    constructor(assert) {
      super(assert);
      this.object = {};
    }

    install(key, desc) {
      let { object, assert } = this;

      defineProperty(object, key, desc);

      assert.ok(object.hasOwnProperty(key));
    }

    set(key, value) {
      this.object[key] = value;
    }

    finalize() {
      return this.object;
    }

    source() {
      return this.object;
    }
  },

  class extends DescriptorTest {
    static module(title) {
      QUnit.module(`${title}: using defineProperty on a prototype`);
    }

    constructor(assert) {
      super(assert);
      this.proto = {};
    }

    install(key, desc) {
      let { proto, assert } = this;

      defineProperty(proto, key, desc);

      assert.ok(proto.hasOwnProperty(key));
    }

    set(key, value) {
      this.proto[key] = value;
    }

    finalize() {
      return Object.create(this.proto);
    }

    source() {
      return this.proto;
    }
  },

  class extends DescriptorTest {
    static module(title) {
      QUnit.module(`${title}: in EmberObject.extend()`);
    }

    constructor(assert) {
      super(assert);
      this.klass = null;
      this.props = {};
    }

    install(key, desc) {
      this.props[key] = desc;
    }

    set(key, value) {
      this.props[key] = value;
    }

    finalize() {
      this.klass = EmberObject.extend(this.props);
      return this.klass.create();
    }

    source() {
      return this.klass.prototype;
    }
  },

  class extends DescriptorTest {
    static module(title) {
      QUnit.module(`${title}: in EmberObject.extend() through a mixin`);
    }

    constructor(assert) {
      super(assert);
      this.klass = null;
      this.props = {};
    }

    install(key, desc) {
      this.props[key] = desc;
    }

    set(key, value) {
      this.props[key] = value;
    }

    finalize() {
      this.klass = EmberObject.extend(Mixin.create(this.props));
      return this.klass.create();
    }

    source() {
      return this.klass.prototype;
    }
  },

  class extends DescriptorTest {
    static module(title) {
      QUnit.module(`${title}: inherited from another EmberObject super class`);
    }

    constructor(assert) {
      super(assert);
      this.superklass = null;
      this.props = {};
    }

    install(key, desc) {
      this.props[key] = desc;
    }

    set(key, value) {
      this.props[key] = value;
    }

    finalize() {
      this.superklass = EmberObject.extend(this.props);
      return this.superklass.extend().create();
    }

    source() {
      return this.superklass.prototype;
    }
  }

];

classes.forEach(TestClass => {
  TestClass.module('ember-metal/descriptor');

  TestClass.test('defining a configurable property', function(assert, factory) {
    factory.install('foo', descriptor({ configurable: true, value: 'bar' }));

    let obj = factory.finalize();

    assert.equal(obj.foo, 'bar');

    let source = factory.source();

    delete source.foo;

    assert.strictEqual(obj.foo, undefined);

    Object.defineProperty(source, 'foo', { configurable: true, value: 'baz' });

    assert.equal(obj.foo, 'baz');
  });

  TestClass.test('defining a non-configurable property', function(assert, factory) {
    factory.install('foo', descriptor({ configurable: false, value: 'bar' }));

    let obj = factory.finalize();

    assert.equal(obj.foo, 'bar');

    let source = factory.source();

    if (hasCompliantDelete) {
      assert.throws(() => delete source.foo, TypeError);
    } else {
      delete source.foo;
    }

    assert.throws(() => Object.defineProperty(source, 'foo', { configurable: true, value: 'baz' }), TypeError);

    assert.equal(obj.foo, 'bar');
  });

  TestClass.test('defining an enumerable property', function(assert, factory) {
    factory.install('foo', descriptor({ enumerable: true, value: 'bar' }));

    let obj = factory.finalize();

    assert.equal(obj.foo, 'bar');

    let source = factory.source();

    assert.ok(Object.keys(source).indexOf('foo') !== -1);
  });

  TestClass.test('defining a non-enumerable property', function(assert, factory) {
    factory.install('foo', descriptor({ enumerable: false, value: 'bar' }));

    let obj = factory.finalize();

    assert.equal(obj.foo, 'bar');

    let source = factory.source();

    assert.ok(Object.keys(source).indexOf('foo') === -1);
  });

  TestClass.test('defining a writable property', function(assert, factory) {
    factory.install('foo', descriptor({ writable: true, value: 'bar' }));

    let obj = factory.finalize();

    assert.equal(obj.foo, 'bar');

    let source = factory.source();

    source.foo = 'baz';

    assert.equal(obj.foo, 'baz');

    obj.foo = 'bat';

    assert.equal(obj.foo, 'bat');
  });

  TestClass.test('defining a non-writable property', function(assert, factory) {
    factory.install('foo', descriptor({ writable: false, value: 'bar' }));

    let obj = factory.finalize();

    assert.equal(obj.foo, 'bar');

    let source = factory.source();

    if (hasCompliantAssign) {
      assert.throws(() => source.foo = 'baz', TypeError);
      assert.throws(() => obj.foo = 'baz', TypeError);
    } else {
      source.foo = 'baz';
      obj.foo = 'baz';
    }

    assert.equal(obj.foo, 'bar');
  });

  TestClass.test('defining a getter', function(assert, factory) {
    factory.install('foo', descriptor({
      get: function() {
        return this.__foo__;
      }
    }));

    factory.set('__foo__', 'bar');

    let obj = factory.finalize();

    assert.equal(obj.foo, 'bar');

    obj.__foo__ = 'baz';

    assert.equal(obj.foo, 'baz');
  });

  TestClass.test('defining a setter', function(assert, factory) {
    factory.install('foo', descriptor({
      set: function(value) {
        this.__foo__ = value;
      }
    }));

    factory.set('__foo__', 'bar');

    let obj = factory.finalize();

    assert.equal(obj.__foo__, 'bar');

    obj.foo = 'baz';

    assert.equal(obj.__foo__, 'baz');
  });

  TestClass.test('combining multiple setter and getters', function(assert, factory) {
    factory.install('foo', descriptor({
      get: function() {
        return this.__foo__;
      },

      set: function(value) {
        this.__foo__ = value;
      }
    }));

    factory.set('__foo__', 'foo');

    factory.install('bar', descriptor({
      get: function() {
        return this.__bar__;
      },

      set: function(value) {
        this.__bar__ = value;
      }
    }));

    factory.set('__bar__', 'bar');

    factory.install('fooBar', descriptor({
      get: function() {
        return this.foo + '-' + this.bar;
      }
    }));

    let obj = factory.finalize();

    assert.equal(obj.fooBar, 'foo-bar');

    obj.foo = 'FOO';

    assert.equal(obj.fooBar, 'FOO-bar');

    obj.__bar__ = 'BAR';

    assert.equal(obj.fooBar, 'FOO-BAR');

    if (hasCompliantAssign) {
      assert.throws(() => obj.fooBar = 'foobar', TypeError);
    } else {
      obj.fooBar = 'foobar';
    }

    assert.equal(obj.fooBar, 'FOO-BAR');
  });
});
