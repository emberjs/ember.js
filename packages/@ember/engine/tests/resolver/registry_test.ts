import { module, test } from 'qunit';
import Application from '@ember/application';
import Resolver from '@ember/engine/lib/strict-resolver';
import Service from '@ember/service';
import type ApplicationInstance from '@ember/application/instance';

module('strict-resolver | Registry with Application', function () {
  test('registered stuff can be looked up', async function (assert) {
    class Foo {
      static create() {
        return new this();
      }

      two = 2;
    }

    let app = Application.create({
      Resolver: Resolver.withModules({}),
      modulePrefix: 'test-app',
      rootElement: '#qunit-fixture',
      autoboot: false,
    });

    let instance = (await app.visit('/')) as ApplicationInstance;

    instance.register('not-standard:main', Foo);

    let value = instance.lookup('not-standard:main') as Foo;

    assert.strictEqual(value.two, 2);

    instance.destroy();
  });

  test('resolves modules provided via withModules', async function (assert) {
    class MyService extends Service {
      weDidIt = true;
    }

    let app = Application.create({
      Resolver: Resolver.withModules({
        'test-app/services/my-thing': { default: MyService },
      }),
      modulePrefix: 'test-app',
      rootElement: '#qunit-fixture',
      autoboot: false,
    });

    let instance = (await app.visit('/')) as ApplicationInstance;
    let service = instance.lookup('service:my-thing') as MyService;

    assert.ok(service, 'service was found');
    assert.ok(service.weDidIt, 'service has the right property');

    instance.destroy();
  });
});
