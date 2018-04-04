import { Object as EmberObject } from 'ember-runtime';
import { Mixin, defineProperty, descriptor } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

let classes = [
  class {
    static module(title) {
      return `${title}: using defineProperty on an object directly`;
    }

    constructor() {
      this.object = {};
    }

    install(key, desc, assert) {
      let { object } = this;

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

  class {
    static module(title) {
      return `${title}: using defineProperty on a prototype`;
    }

    constructor() {
      this.proto = {};
    }

    install(key, desc, assert) {
      let { proto } = this;

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

  class {
    static module(title) {
      return `${title}: in EmberObject.extend()`;
    }

    constructor() {
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

  class {
    static module(title) {
      return `${title}: in EmberObject.extend() through a mixin`;
    }

    constructor() {
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

  class {
    static module(title) {
      return `${title}: inherited from another EmberObject super class`;
    }

    constructor() {
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
  },
];

classes.forEach(TestClass => {
  moduleFor(
    TestClass.module('ember-metal/descriptor'),
    class extends AbstractTestCase {
      ['@test defining a configurable property'](assert) {
        let factory = new TestClass(assert);

        factory.install('foo', descriptor({ configurable: true, value: 'bar' }), assert);

        let obj = factory.finalize();

        assert.equal(obj.foo, 'bar');

        let source = factory.source();

        delete source.foo;

        assert.strictEqual(obj.foo, undefined);

        Object.defineProperty(source, 'foo', { configurable: true, value: 'baz' });

        assert.equal(obj.foo, 'baz');
      }

      ['@test defining a non-configurable property'](assert) {
        let factory = new TestClass(assert);
        factory.install('foo', descriptor({ configurable: false, value: 'bar' }), assert);

        let obj = factory.finalize();

        assert.equal(obj.foo, 'bar');

        let source = factory.source();

        assert.throws(() => delete source.foo, TypeError);

        assert.throws(
          () =>
            Object.defineProperty(source, 'foo', {
              configurable: true,
              value: 'baz',
            }),
          TypeError
        );

        assert.equal(obj.foo, 'bar');
      }

      ['@test defining an enumerable property'](assert) {
        let factory = new TestClass(assert);
        factory.install('foo', descriptor({ enumerable: true, value: 'bar' }), assert);

        let obj = factory.finalize();

        assert.equal(obj.foo, 'bar');

        let source = factory.source();

        assert.ok(Object.keys(source).indexOf('foo') !== -1);
      }

      ['@test defining a non-enumerable property'](assert) {
        let factory = new TestClass(assert);
        factory.install('foo', descriptor({ enumerable: false, value: 'bar' }), assert);

        let obj = factory.finalize();

        assert.equal(obj.foo, 'bar');

        let source = factory.source();

        assert.ok(Object.keys(source).indexOf('foo') === -1);
      }

      ['@test defining a writable property'](assert) {
        let factory = new TestClass(assert);
        factory.install('foo', descriptor({ writable: true, value: 'bar' }), assert);

        let obj = factory.finalize();

        assert.equal(obj.foo, 'bar');

        let source = factory.source();

        source.foo = 'baz';

        assert.equal(obj.foo, 'baz');

        obj.foo = 'bat';

        assert.equal(obj.foo, 'bat');
      }

      ['@test defining a non-writable property'](assert) {
        let factory = new TestClass(assert);
        factory.install('foo', descriptor({ writable: false, value: 'bar' }), assert);

        let obj = factory.finalize();

        assert.equal(obj.foo, 'bar');

        let source = factory.source();

        assert.throws(() => (source.foo = 'baz'), TypeError);
        assert.throws(() => (obj.foo = 'baz'), TypeError);

        assert.equal(obj.foo, 'bar');
      }

      ['@test defining a getter'](assert) {
        let factory = new TestClass(assert);
        factory.install(
          'foo',
          descriptor({
            get: function() {
              return this.__foo__;
            },
          }),
          assert
        );

        factory.set('__foo__', 'bar');

        let obj = factory.finalize();

        assert.equal(obj.foo, 'bar');

        obj.__foo__ = 'baz';

        assert.equal(obj.foo, 'baz');
      }

      ['@test defining a setter'](assert) {
        let factory = new TestClass(assert);
        factory.install(
          'foo',
          descriptor({
            set: function(value) {
              this.__foo__ = value;
            },
          }),
          assert
        );

        factory.set('__foo__', 'bar');

        let obj = factory.finalize();

        assert.equal(obj.__foo__, 'bar');

        obj.foo = 'baz';

        assert.equal(obj.__foo__, 'baz');
      }

      ['@test combining multiple setter and getters'](assert) {
        let factory = new TestClass(assert);
        factory.install(
          'foo',
          descriptor({
            get: function() {
              return this.__foo__;
            },

            set: function(value) {
              this.__foo__ = value;
            },
          }),
          assert
        );

        factory.set('__foo__', 'foo');

        factory.install(
          'bar',
          descriptor({
            get: function() {
              return this.__bar__;
            },

            set: function(value) {
              this.__bar__ = value;
            },
          }),
          assert
        );

        factory.set('__bar__', 'bar');

        factory.install(
          'fooBar',
          descriptor({
            get: function() {
              return this.foo + '-' + this.bar;
            },
          }),
          assert
        );

        let obj = factory.finalize();

        assert.equal(obj.fooBar, 'foo-bar');

        obj.foo = 'FOO';

        assert.equal(obj.fooBar, 'FOO-bar');

        obj.__bar__ = 'BAR';

        assert.equal(obj.fooBar, 'FOO-BAR');

        assert.throws(() => (obj.fooBar = 'foobar'), TypeError);

        assert.equal(obj.fooBar, 'FOO-BAR');
      }
    }
  );
});
