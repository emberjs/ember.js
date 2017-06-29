import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';
import {
  Object as EmberObject,
  inject,
  RSVP,
  onerrorDefault
} from 'ember-runtime';
import { run } from 'ember-metal';
import Application from '../../system/application';
import ApplicationInstance from '../../system/application-instance';
import Engine from '../../system/engine';
import { Route, Router } from 'ember-routing';
import { Component, helper } from 'ember-glimmer';
import { compile } from 'ember-template-compiler';
import { jQuery } from 'ember-views';

function expectAsyncError() {
  RSVP.off('error');
}

moduleFor('Ember.Application - visit()', class extends ApplicationTestCase {

  teardown() {
    RSVP.on('error', onerrorDefault);
    super.teardown();
  }

  createApplication(options) {
    return super.createApplication(options, Application.extend());
  }

  // This tests whether the application is "autobooted" by registering an
  // instance initializer and asserting it never gets run. Since this is
  // inherently testing that async behavior *doesn't* happen, we set a
  // 500ms timeout to verify that when autoboot is set to false, the
  // instance initializer that would normally get called on DOM ready
  // does not fire.
  [`@test Applications with autoboot set to false do not autoboot`](assert) {
    function delay(time) {
      return new RSVP.Promise(resolve => run.later(resolve, time));
    }

    let appBooted = 0;
    let instanceBooted = 0;

    this.application.initializer({
      name: 'assert-no-autoboot',
      initialize() {
        appBooted++;
      }
    });

    this.application.instanceInitializer({
      name: 'assert-no-autoboot',
      initialize() {
        instanceBooted++;
      }
    });

    assert.ok(!this.applicationInstance, 'precond - no instance');
    assert.ok(appBooted === 0, 'precond - not booted');
    assert.ok(instanceBooted === 0, 'precond - not booted');

    // Continue after 500ms
    return delay(500).then(() => {
      assert.ok(appBooted === 0, '500ms elapsed without app being booted');
      assert.ok(instanceBooted === 0, '500ms elapsed without instances being booted');

      return this.runTask(() => this.application.boot());
    }).then(() => {
      assert.ok(appBooted === 1, 'app should boot when manually calling `app.boot()`');
      assert.ok(instanceBooted === 0, 'no instances should be booted automatically when manually calling `app.boot()');
    });
  }

  [`@test calling visit() on an app without first calling boot() should boot the app`](assert) {
    let appBooted = 0;
    let instanceBooted = 0;

    this.application.initializer({
      name: 'assert-no-autoboot',
      initialize() {
        appBooted++;
      }
    });

    this.application.instanceInitializer({
      name: 'assert-no-autoboot',
      initialize() {
        instanceBooted++;
      }
    });

    return this.visit('/').then(() => {
      assert.ok(appBooted === 1, 'the app should be booted`');
      assert.ok(instanceBooted === 1, 'an instances should be booted');
    });
  }

  [`@test calling visit() on an already booted app should not boot it again`](assert) {
    let appBooted = 0;
    let instanceBooted = 0;

    this.application.initializer({
      name: 'assert-no-autoboot',
      initialize() {
        appBooted++;
      }
    });

    this.application.instanceInitializer({
      name: 'assert-no-autoboot',
      initialize() {
        instanceBooted++;
      }
    });

    return this.runTask(() => this.application.boot()).then(() => {
      assert.ok(appBooted === 1, 'the app should be booted');
      assert.ok(instanceBooted === 0, 'no instances should be booted');

      return this.visit('/');
    }).then(() => {
      assert.ok(appBooted === 1, 'the app should not be booted again');
      assert.ok(instanceBooted === 1, 'an instance should be booted');

      /*
       * Destroy the instance.
       */
      return this.runTask(() => {
        this.applicationInstance.destroy()
        this.applicationInstance = null;
      });
    }).then(() => {
      /*
       * Visit on the application a second time. The application should remain
       * booted, but a new instance will be created.
       */
      return this.visit('/');
    }).then(() => {
      assert.ok(appBooted === 1, 'the app should not be booted again');
      assert.ok(instanceBooted === 2, 'another instance should be booted');
    });
  }

  [`@test visit() rejects on application boot failure`](assert) {
    this.application.initializer({
      name: 'error',
      initialize() {
        throw new Error('boot failure');
      }
    });

    expectAsyncError();

    return this.visit('/').then(() => {
      assert.ok(false, 'It should not resolve the promise');
    }, error => {
      assert.ok(error instanceof Error, 'It should reject the promise with the boot error');
      assert.equal(error.message, 'boot failure');
    });
  }

  [`@test visit() rejects on instance boot failure`](assert) {
    this.application.instanceInitializer({
      name: 'error',
      initialize() {
        throw new Error('boot failure');
      }
    });

    expectAsyncError();

    return this.visit('/').then(() => {
      assert.ok(false, 'It should not resolve the promise');
    }, error => {
      assert.ok(error instanceof Error, 'It should reject the promise with the boot error');
      assert.equal(error.message, 'boot failure');
    });
  }

  [`@test visit() follows redirects`](assert) {
    this.router.map(function() {
      this.route('a');
      this.route('b', { path: '/b/:b' });
      this.route('c', { path: '/c/:c' });
    });

    this.add('route:a', Route.extend({
      afterModel() {
        this.replaceWith('b', 'zomg');
      }
    }));

    this.add('route:b', Route.extend({
      afterModel(params) {
        this.transitionTo('c', params.b);
      }
    }));

    /*
     * First call to `visit` is `this.application.visit` and returns the
     * applicationInstance.
     */
    return this.visit('/a').then(instance => {
      assert.ok(instance instanceof ApplicationInstance, 'promise is resolved with an ApplicationInstance');
      assert.equal(instance.getURL(), '/c/zomg', 'It should follow all redirects');
    });
  }

  [`@test visit() rejects if an error occurred during a transition`](assert) {
    this.router.map(function() {
      this.route('a');
      this.route('b', { path: '/b/:b' });
      this.route('c', { path: '/c/:c' });
    });

    this.add('route:a', Route.extend({
      afterModel() {
        this.replaceWith('b', 'zomg');
      }
    }));

    this.add('route:b', Route.extend({
      afterModel(params) {
        this.transitionTo('c', params.b);
      }
    }));

    this.add('route:c', Route.extend({
      afterModel(params) {
        throw new Error('transition failure');
      }
    }));

    expectAsyncError();

    return this.visit('/a').then(() => {
      assert.ok(false, 'It should not resolve the promise');
    }, error => {
      assert.ok(error instanceof Error, 'It should reject the promise with the boot error');
      assert.equal(error.message, 'transition failure');
    });
  }

  [`@test visit() chain`](assert) {
    this.router.map(function() {
      this.route('a');
      this.route('b');
      this.route('c');
    });

    return this.visit('/').then(instance => {
      assert.ok(instance instanceof ApplicationInstance, 'promise is resolved with an ApplicationInstance');
      assert.equal(instance.getURL(), '/');

      return instance.visit('/a');
    }).then(instance => {
      assert.ok(instance instanceof ApplicationInstance, 'promise is resolved with an ApplicationInstance');
      assert.equal(instance.getURL(), '/a');

      return instance.visit('/b');
    }).then(instance => {
      assert.ok(instance instanceof ApplicationInstance, 'promise is resolved with an ApplicationInstance');
      assert.equal(instance.getURL(), '/b');

      return instance.visit('/c');
    }).then(instance => {
      assert.ok(instance instanceof ApplicationInstance, 'promise is resolved with an ApplicationInstance');
      assert.equal(instance.getURL(), '/c');
    });
  }

  [`@test visit() returns a promise that resolves when the view has rendered`](assert) {
    this.addTemplate('application', `<h1>Hello world</h1>`);

    assert.strictEqual(
      this.$().children().length, 0,
      'there are no elements in the fixture element'
    );

    return this.visit('/').then(instance => {
      assert.ok(
        instance instanceof ApplicationInstance,
        'promise is resolved with an ApplicationInstance'
      );
      assert.equal(
        this.$('.ember-view h1').text(), 'Hello world',
        'the application was rendered once the promise resolves'
      );
    });
  }

  [`@test visit() returns a promise that resolves without rendering when shouldRender is set to false`](assert) {
    assert.expect(3);

    this.addTemplate('application', '<h1>Hello world</h1>');

    assert.strictEqual(
      this.$().children().length, 0,
      'there are no elements in the fixture element'
    );

    return this.visit('/', { shouldRender: false }).then(instance => {
      assert.ok(
        instance instanceof ApplicationInstance,
        'promise is resolved with an ApplicationInstance'
      );
      assert.strictEqual(
        this.$().children().length, 0,
        'there are still no elements in the fixture element after visit'
      );
    });
  }

  [`@test visit() renders a template when shouldRender is set to true`](assert) {
    assert.expect(3);

    this.addTemplate('application', '<h1>Hello world</h1>');

    assert.strictEqual(
      this.$('#qunit-fixture').children().length, 0,
      'there are no elements in the fixture element'
    );

    return this.visit('/', { shouldRender: true }).then(instance => {
      assert.ok(
        instance instanceof ApplicationInstance,
        'promise is resolved with an ApplicationInstance'
      );
      assert.strictEqual(
        this.$().children().length, 1,
        'there is 1 element in the fixture element after visit'
      );
    });
  }

  [`@test visit() returns a promise that resolves without rendering when shouldRender is set to false with Engines`](assert) {
    assert.expect(3);

    this.router.map(function() {
      this.mount('blog');
    });

    this.addTemplate('application', '<h1>Hello world</h1>');

    // Register engine
    let BlogEngine = Engine.extend();
    this.add('engine:blog', BlogEngine);

    // Register engine route map
    let BlogMap = function() {};
    this.add('route-map:blog', BlogMap);

    assert.strictEqual(
      this.$('#qunit-fixture').children().length, 0,
      'there are no elements in the fixture element'
    );

    return this.visit('/blog', { shouldRender: false }).then(instance => {
      assert.ok(
        instance instanceof ApplicationInstance,
        'promise is resolved with an ApplicationInstance'
      );
      assert.strictEqual(
        this.$().children().length, 0,
        'there are still no elements in the fixture element after visit'
      );
    });
  }

  [`@test visit() on engine resolves engine component`](assert) {
    assert.expect(2);

    this.router.map(function() {
      this.mount('blog');
    });

    // Register engine
    let BlogEngine = Engine.extend({
      init(...args) {
        this._super.apply(this, args);
        this.register('template:application', compile('{{cache-money}}'));
        this.register('template:components/cache-money', compile(`
          <p>Dis cache money</p>
        `));
        this.register('component:cache-money', Component.extend({}));
      }
    });
    this.add('engine:blog', BlogEngine);

    // Register engine route map
    let BlogMap = function() {};
    this.add('route-map:blog', BlogMap);

    assert.strictEqual(
      this.$().children().length, 0,
      'there are no elements in the fixture element'
    );

    return this.visit('/blog', { shouldRender: true }).then(instance => {
      assert.strictEqual(
        this.$().find('p').text(), 'Dis cache money',
        'Engine component is resolved'
      );
    });
  }

  [`@test visit() on engine resolves engine helper`](assert) {
    assert.expect(2);

    this.router.map(function() {
      this.mount('blog');
    });

    // Register engine
    let BlogEngine = Engine.extend({
      init(...args) {
        this._super.apply(this, args);
        this.register('template:application', compile('{{swag}}'));
        this.register('helper:swag', helper(function() {
          return 'turnt up';
        }));
      }
    });
    this.add('engine:blog', BlogEngine);

    // Register engine route map
    let BlogMap = function() {};
    this.add('route-map:blog', BlogMap);

    assert.strictEqual(
      this.$().children().length, 0,
      'there are no elements in the fixture element'
    );

    return this.visit('/blog', { shouldRender: true }).then(() => {
      assert.strictEqual(
        this.$().text(), 'turnt up',
        'Engine component is resolved'
      );
    });
  }

  [`@test Ember Islands-style setup`](assert) {
    let xFooInitCalled = false;
    let xFooDidInsertElementCalled = false;

    let xBarInitCalled = false;
    let xBarDidInsertElementCalled = false;

    this.router.map(function() {
      this.route('show', { path: '/:component_name' });
    });

    this.add('route:show', Route.extend({
      queryParams: {
        data: { refreshModel: true }
      },

      model(params) {
        return {
          componentName: params.component_name,
          componentData: params.data ? JSON.parse(params.data) : undefined
        };
      }
    }));

    let Counter = EmberObject.extend({
      value: 0,

      increment() {
        this.incrementProperty('value');
      }
    });

    this.add('service:isolatedCounter', Counter);
    this.add('service:sharedCounter', Counter.create());
    this.application.registerOptions('service:sharedCounter', {instantiate: false});

    this.addTemplate('show', '{{component model.componentName model=model.componentData}}');

    this.addTemplate('components/x-foo', `
      <h1>X-Foo</h1>
      <p>Hello {{model.name}}, I have been clicked {{isolatedCounter.value}} times ({{sharedCounter.value}} times combined)!</p>
    `);

    this.add('component:x-foo', Component.extend({
      tagName: 'x-foo',

      isolatedCounter: inject.service(),
      sharedCounter: inject.service(),

      init() {
        this._super();
        xFooInitCalled = true;
      },

      didInsertElement() {
        xFooDidInsertElementCalled = true;
      },

      click() {
        this.get('isolatedCounter').increment();
        this.get('sharedCounter').increment();
      }
    }));

    this.addTemplate('components/x-bar', `
      <h1>X-Bar</h1>
      <button {{action "incrementCounter"}}>Join {{counter.value}} others in clicking me!</button>
    `);

    this.add('component:x-bar', Component.extend({
      counter: inject.service('sharedCounter'),

      actions: {
        incrementCounter() {
          this.get('counter').increment();
        }
      },

      init() {
        this._super();
        xBarInitCalled = true;
      },

      didInsertElement() {
        xBarDidInsertElementCalled = true;
      }
    }));

    let $foo = jQuery('<div />').appendTo(this.$());
    let $bar = jQuery('<div />').appendTo(this.$());

    let data = encodeURIComponent(JSON.stringify({ name: 'Godfrey' }));
    let instances = [];

    return RSVP.all([
      this.runTask(() => {
        return this.application.visit(`/x-foo?data=${data}`, { rootElement: $foo[0] });
      }),
      this.runTask(() => {
        return this.application.visit('/x-bar', { rootElement: $bar[0] });
      })
    ]).then(_instances => {
      instances = _instances;

      assert.ok(xFooInitCalled);
      assert.ok(xFooDidInsertElementCalled);

      assert.ok(xBarInitCalled);
      assert.ok(xBarDidInsertElementCalled);

      assert.equal($foo.find('h1').text(), 'X-Foo');
      assert.equal($foo.find('p').text(), 'Hello Godfrey, I have been clicked 0 times (0 times combined)!');
      assert.ok($foo.text().indexOf('X-Bar') === -1);

      assert.equal($bar.find('h1').text(), 'X-Bar');
      assert.equal($bar.find('button').text(), 'Join 0 others in clicking me!');
      assert.ok($bar.text().indexOf('X-Foo') === -1);

      this.runTask(() => {
        $foo.find('x-foo').click();
      });

      assert.equal($foo.find('p').text(), 'Hello Godfrey, I have been clicked 1 times (1 times combined)!');
      assert.equal($bar.find('button').text(), 'Join 1 others in clicking me!');

      this.runTask(() => {
        $bar.find('button').click();
        $bar.find('button').click();
      });

      assert.equal($foo.find('p').text(), 'Hello Godfrey, I have been clicked 1 times (3 times combined)!');
      assert.equal($bar.find('button').text(), 'Join 3 others in clicking me!');

    }).finally(() => {
      this.runTask(() => {
        instances.forEach(instance => {
          instance.destroy();
        });
      });
    });
  }

});
