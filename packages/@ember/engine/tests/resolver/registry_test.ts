import { module, test } from 'qunit';
import Application from '@ember/application';
import Service from '@ember/service';
import { run } from '@ember/runloop';
import type ApplicationInstance from '@ember/application/instance';

module('strict-resolver | Application with modules', function (hooks) {
  let app: Application | undefined;
  let instance: ApplicationInstance | undefined;

  hooks.afterEach(function () {
    run(() => {
      instance?.destroy();
      app?.destroy();
    });
    instance = undefined;
    app = undefined;
  });

  test('registered stuff can be looked up', async function (assert) {
    class Foo {
      static create() {
        return new this();
      }

      two = 2;
    }

    app = Application.create({
      modules: {},
      rootElement: '#qunit-fixture',
      autoboot: false,
    });

    instance = (await app.visit('/', {})) as ApplicationInstance;

    instance.register('not-standard:main', Foo);

    let value = instance.lookup('not-standard:main') as Foo;

    assert.strictEqual(value.two, 2);
  });

  test('resolves modules provided via modules property', async function (assert) {
    class MyService extends Service {
      weDidIt = true;
    }

    app = Application.create({
      modules: {
        './services/my-thing': { default: MyService },
      },
      rootElement: '#qunit-fixture',
      autoboot: false,
    });

    instance = (await app.visit('/', {})) as ApplicationInstance;
    let service = instance.lookup('service:my-thing') as MyService;

    assert.ok(service, 'service was found');
    assert.ok(service.weDidIt, 'service has the right property');
  });

  test('resolves shorthand modules (without default wrapper)', async function (assert) {
    class MyService extends Service {
      shorthand = true;
    }

    app = Application.create({
      modules: {
        './services/shorthand-svc': MyService,
      },
      rootElement: '#qunit-fixture',
      autoboot: false,
    });

    instance = (await app.visit('/', {})) as ApplicationInstance;
    let service = instance.lookup('service:shorthand-svc') as MyService;

    assert.ok(service, 'service was found');
    assert.ok(service.shorthand, 'service has the right property');
  });

  test('resolves router:main via ./router module', async function (assert) {
    app = Application.create({
      modules: {},
      rootElement: '#qunit-fixture',
      autoboot: false,
    });

    instance = (await app.visit('/', {})) as ApplicationInstance;

    let router = instance.lookup('router:main');

    assert.ok(router, 'router was resolved');
  });
});
