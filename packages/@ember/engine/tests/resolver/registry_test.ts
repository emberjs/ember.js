import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Registry', function (hooks) {
  setupTest(hooks);

  test('has the router', function (assert) {
    // eslint-disable-next-line ember/no-private-routing-service
    const router = this.owner.lookup('router:main');

    assert.ok(router);
  });

  test('has a manually registered service', function (assert) {
    const manual = this.owner.lookup('service:manual') as { weDidIt: boolean };

    assert.ok(manual);
    assert.ok(manual.weDidIt);
  });

  test('has a manually registered (shorthand) service', function (assert) {
    const manual = this.owner.lookup('service:manual-shorthand') as {
      weDidIt: boolean;
    };

    assert.ok(manual);
    assert.ok(manual.weDidIt);
  });

  test('has a service from import.meta.glob', function (assert) {
    const metaGlob = this.owner.lookup('service:from-meta-glob') as {
      weDidIt: boolean;
    };

    assert.ok(metaGlob);
    assert.ok(metaGlob.weDidIt);
  });

  test('registered stuff can be looked up', function (assert) {
    class Foo {
      static create() {
        return new this();
      }

      two = 2;
    }
    this.owner.register('not-standard:main', Foo);

    const value = this.owner.lookup('not-standard:main') as Foo;

    assert.strictEqual(value.two, 2);
  });
});
