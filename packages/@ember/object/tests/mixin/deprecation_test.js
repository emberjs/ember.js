import EmberObject from '@ember/object';
import Mixin from '@ember/object/mixin';
import Observable from '@ember/object/observable';
import PromiseProxyMixin from '@ember/object/promise-proxy-mixin';
import Enumerable from '@ember/enumerable';
import MutableEnumerable from '@ember/enumerable/mutable';
import ObjectProxy from '@ember/object/proxy';
import ArrayProxy from '@ember/array/proxy';
import { A as emberA } from '@ember/array';
import { INTERNAL_MIXIN_CREATE } from '@ember/-internals/utils/lib/internal-mixin-create';
import {
  moduleFor,
  AbstractTestCase,
  expectDeprecation,
  expectNoDeprecation,
  testUnless,
} from 'internal-test-helpers';
import { DEPRECATIONS } from '../../../-internals/deprecations';

moduleFor(
  'Mixin deprecation',
  class extends AbstractTestCase {
    [`${testUnless(
      DEPRECATIONS.DEPRECATE_MIXINS.isRemoved
    )} @test Mixin.create deprecates authoring a mixin`](assert) {
      let MixinA;

      expectDeprecation(
        () => {
          MixinA = Mixin.create({
            foo: 'FOO',
          });
        },
        /Using mixins is deprecated/,
        DEPRECATIONS.DEPRECATE_MIXINS.isEnabled
      );

      let obj = {};
      MixinA.apply(obj);

      assert.equal(obj.foo, 'FOO', 'the mixin still applies while deprecated');
    }

    [`${testUnless(
      DEPRECATIONS.DEPRECATE_MIXINS.isRemoved
    )} @test the internal mixin constructor does not deprecate, so Ember internals can build on mixins`](
      assert
    ) {
      let MixinA;

      expectNoDeprecation(() => {
        MixinA = Mixin[INTERNAL_MIXIN_CREATE]({
          foo: 'FOO',
        });
      });

      let obj = {};
      MixinA.apply(obj);

      assert.equal(obj.foo, 'FOO', 'the internally created mixin applies');
    }

    [`${testUnless(
      DEPRECATIONS.DEPRECATE_MIXINS.isRemoved
    )} @test extending EmberObject does not deprecate`](assert) {
      // EmberObject builds a PrototypeMixin internally for every subclass, so
      // extending must not warn apps that never author a mixin themselves.
      let Subclass;

      expectNoDeprecation(() => {
        Subclass = EmberObject.extend({
          foo: 'FOO',
        });
      });

      let obj = Subclass.create();
      assert.equal(obj.foo, 'FOO', 'the subclass works');
      obj.destroy();
    }

    [`${testUnless(
      DEPRECATIONS.DEPRECATE_MIXINS.isRemoved
    )} @test reopening an EmberObject subclass does not deprecate`](assert) {
      let Subclass = EmberObject.extend();

      expectNoDeprecation(() => {
        Subclass.reopen({
          foo: 'FOO',
        });
      });

      let obj = Subclass.create();
      assert.equal(obj.foo, 'FOO', 'the reopened property is present');
      obj.destroy();
    }
  }
);

moduleFor(
  'Framework mixin deprecation',
  class extends AbstractTestCase {
    [`${testUnless(
      DEPRECATIONS.DEPRECATE_OBSERVABLE.isRemoved
    )} @test extending with Observable deprecates`](assert) {
      let Subclass;

      expectDeprecation(
        () => {
          Subclass = EmberObject.extend(Observable);
        },
        /The `Observable` mixin is deprecated/,
        DEPRECATIONS.DEPRECATE_OBSERVABLE.isEnabled
      );

      let obj = Subclass.create({ foo: 'FOO' });
      assert.equal(obj.get('foo'), 'FOO', 'the mixin still applies while deprecated');
      obj.destroy();
    }

    [`${testUnless(
      DEPRECATIONS.DEPRECATE_OBSERVABLE.isRemoved
    )} @test reopening with Observable deprecates`](assert) {
      let Subclass = EmberObject.extend();

      expectDeprecation(
        () => {
          Subclass.reopen(Observable);
        },
        /The `Observable` mixin is deprecated/,
        DEPRECATIONS.DEPRECATE_OBSERVABLE.isEnabled
      );

      let obj = Subclass.create({ foo: 'FOO' });
      assert.equal(obj.get('foo'), 'FOO', 'the reopened class works');
      obj.destroy();
    }

    [`${testUnless(
      DEPRECATIONS.DEPRECATE_OBSERVABLE.isRemoved
    )} @test EmberObject applies Observable without deprecating`](assert) {
      // `EmberObject` is built from `Observable`, so apps that never name the
      // mixin must not get a notice.
      let obj;

      expectNoDeprecation(() => {
        obj = EmberObject.extend({ foo: 'FOO' }).create();
      });

      assert.equal(obj.get('foo'), 'FOO', 'the object works');
      obj.destroy();
    }

    [`${testUnless(
      DEPRECATIONS.DEPRECATE_ENUMERABLE.isRemoved
    )} @test extending with Enumerable deprecates`](assert) {
      let Subclass;

      expectDeprecation(
        () => {
          Subclass = EmberObject.extend(Enumerable);
        },
        /The `Enumerable` mixin is deprecated/,
        DEPRECATIONS.DEPRECATE_ENUMERABLE.isEnabled
      );

      let obj = Subclass.create();
      assert.ok(Enumerable.detect(obj), 'the mixin still applies while deprecated');
      obj.destroy();
    }

    [`${testUnless(
      DEPRECATIONS.DEPRECATE_ENUMERABLE.isRemoved
    )} @test extending with MutableEnumerable deprecates`](assert) {
      let Subclass;

      expectDeprecation(
        () => {
          Subclass = EmberObject.extend(MutableEnumerable);
        },
        /The `MutableEnumerable` mixin is deprecated/,
        DEPRECATIONS.DEPRECATE_ENUMERABLE.isEnabled
      );

      let obj = Subclass.create();
      assert.ok(MutableEnumerable.detect(obj), 'the mixin still applies while deprecated');
      obj.destroy();
    }

    [`${testUnless(
      DEPRECATIONS.DEPRECATE_ENUMERABLE.isRemoved
    )} @test Ember's own arrays apply Enumerable without deprecating`](assert) {
      let array, proxy;

      expectNoDeprecation(() => {
        array = emberA([1, 2, 3]);
        proxy = ArrayProxy.create({ content: emberA([]) });
      });

      assert.ok(Enumerable.detect(array), 'A() is Enumerable');
      assert.ok(Enumerable.detect(proxy), 'ArrayProxy is Enumerable');
      proxy.destroy();
    }

    [`${testUnless(
      DEPRECATIONS.DEPRECATE_PROMISE_PROXY_MIXIN.isRemoved
    )} @test extending with PromiseProxyMixin deprecates`](assert) {
      let Subclass;

      expectDeprecation(
        () => {
          Subclass = ObjectProxy.extend(PromiseProxyMixin);
        },
        /The `PromiseProxyMixin` is deprecated/,
        DEPRECATIONS.DEPRECATE_PROMISE_PROXY_MIXIN.isEnabled
      );

      let proxy = Subclass.create();
      assert.ok(PromiseProxyMixin.detect(proxy), 'the mixin still applies while deprecated');
      proxy.destroy();
    }
  }
);
