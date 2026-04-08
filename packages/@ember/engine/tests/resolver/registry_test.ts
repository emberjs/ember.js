import { module, test } from 'qunit';
import Application from '@ember/application';
import Service from '@ember/service';
import type ApplicationInstance from '@ember/application/instance';

module('strict-resolver | Application with modules', function () {
  test('registered stuff can be looked up', async function (assert) {
    class Foo {
      static create() {
        return new this();
      }

      two = 2;
    }

    let app = Application.create({
      modules: {},
      rootElement: '#qunit-fixture',
      autoboot: false,
    });

    let instance = (await app.visit('/')) as ApplicationInstance;

    instance.register('not-standard:main', Foo);

    let value = instance.lookup('not-standard:main') as Foo;

    assert.strictEqual(value.two, 2);

    instance.destroy();
  });

  test('resolves modules provided via modules property', async function (assert) {
    class MyService extends Service {
      weDidIt = true;
    }

    let app = Application.create({
      modules: {
        './services/my-thing': { default: MyService },
      },
      rootElement: '#qunit-fixture',
      autoboot: false,
    });

    let instance = (await app.visit('/')) as ApplicationInstance;
    let service = instance.lookup('service:my-thing') as MyService;

    assert.ok(service, 'service was found');
    assert.ok(service.weDidIt, 'service has the right property');

    instance.destroy();
  });

  test('resolves shorthand modules (without default wrapper)', async function (assert) {
    class MyService extends Service {
      shorthand = true;
    }

    let app = Application.create({
      modules: {
        './services/shorthand-svc': MyService,
      },
      rootElement: '#qunit-fixture',
      autoboot: false,
    });

    let instance = (await app.visit('/')) as ApplicationInstance;
    let service = instance.lookup('service:shorthand-svc') as MyService;

    assert.ok(service, 'service was found');
    assert.ok(service.shorthand, 'service has the right property');

    instance.destroy();
  });

  test('resolves router:main via ./router module', async function (assert) {
    let app = Application.create({
      modules: {},
      rootElement: '#qunit-fixture',
      autoboot: false,
    });

    let instance = (await app.visit('/')) as ApplicationInstance;

    // eslint-disable-next-line ember/no-private-routing-service
    let router = instance.lookup('router:main');

    assert.ok(router, 'router was resolved');

    instance.destroy();
  });
});
