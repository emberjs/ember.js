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

let App = null;
let instance = null;
let instances = [];

function createApplication(integration) {
  App = Application.extend().create({
    autoboot: false,
    rootElement: '#qunit-fixture',
    LOG_TRANSITIONS: true,
    LOG_TRANSITIONS_INTERNAL: true,
    LOG_ACTIVE_GENERATION: true
  });

  App.Router = Router.extend({
    location: 'none'
  });

  if (integration) {
    App.instanceInitializer({
      name: 'auto-cleanup',
      initialize(_instance) {
        instances.push(_instance);
      }
    });
  } else {
    App.instanceInitializer({
      name: 'auto-cleanup',
      initialize(_instance) {
        if (instance) {
          run(instance, 'destroy');
        }

        instance = _instance;
      }
    });
  }

  return App;
}

function expectAsyncError() {
  RSVP.off('error');
}

QUnit.module('Ember.Application - visit()', {
  teardown() {
    RSVP.on('error', onerrorDefault);

    if (instance) {
      run(instance, 'destroy');
      instance = null;
    }

    if (App) {
      run(App, 'destroy');
      App = null;
    }
  }
});

// This tests whether the application is "autobooted" by registering an
// instance initializer and asserting it never gets run. Since this is
// inherently testing that async behavior *doesn't* happen, we set a
// 500ms timeout to verify that when autoboot is set to false, the
// instance initializer that would normally get called on DOM ready
// does not fire.
QUnit.test('Applications with autoboot set to false do not autoboot', function(assert) {
  function delay(time) {
    return new RSVP.Promise(resolve => run.later(resolve, time));
  }

  let appBooted = 0;
  let instanceBooted = 0;

  run(() => {
    createApplication();

    App.initializer({
      name: 'assert-no-autoboot',
      initialize() {
        appBooted++;
      }
    });

    App.instanceInitializer({
      name: 'assert-no-autoboot',
      initialize() {
        instanceBooted++;
      }
    });
  });

  // Continue after 500ms
  return delay(500).then(() => {
    assert.ok(appBooted === 0, '500ms elapsed without app being booted');
    assert.ok(instanceBooted === 0, '500ms elapsed without instances being booted');

    return run(App, 'boot');
  }).then(() => {
    assert.ok(appBooted === 1, 'app should boot when manually calling `app.boot()`');
    assert.ok(instanceBooted === 0, 'no instances should be booted automatically when manually calling `app.boot()');
  });
});

QUnit.test('calling visit() on an app without first calling boot() should boot the app', function(assert) {
  let appBooted = 0;
  let instanceBooted = 0;

  run(() => {
    createApplication();

    App.initializer({
      name: 'assert-no-autoboot',
      initialize() {
        appBooted++;
      }
    });

    App.instanceInitializer({
      name: 'assert-no-autoboot',
      initialize() {
        instanceBooted++;
      }
    });
  });

  return run(App, 'visit', '/').then(() => {
    assert.ok(appBooted === 1, 'the app should be booted`');
    assert.ok(instanceBooted === 1, 'an instances should be booted');
  });
});

QUnit.test('calling visit() on an already booted app should not boot it again', function(assert) {
  let appBooted = 0;
  let instanceBooted = 0;

  run(() => {
    createApplication();

    App.initializer({
      name: 'assert-no-autoboot',
      initialize() {
        appBooted++;
      }
    });

    App.instanceInitializer({
      name: 'assert-no-autoboot',
      initialize() {
        instanceBooted++;
      }
    });
  });

  return run(App, 'boot').then(() => {
    assert.ok(appBooted === 1, 'the app should be booted');
    assert.ok(instanceBooted === 0, 'no instances should be booted');

    return run(App, 'visit', '/');
  }).then(() => {
    assert.ok(appBooted === 1, 'the app should not be booted again');
    assert.ok(instanceBooted === 1, 'an instance should be booted');

    return run(App, 'visit', '/');
  }).then(() => {
    assert.ok(appBooted === 1, 'the app should not be booted again');
    assert.ok(instanceBooted === 2, 'another instance should be booted');
  });
});

QUnit.test('visit() rejects on application boot failure', function(assert) {
  run(() => {
    createApplication();

    App.initializer({
      name: 'error',
      initialize() {
        throw new Error('boot failure');
      }
    });
  });

  expectAsyncError();

  return run(App, 'visit', '/').then(() => {
    assert.ok(false, 'It should not resolve the promise');
  }, error => {
    assert.ok(error instanceof Error, 'It should reject the promise with the boot error');
    assert.equal(error.message, 'boot failure');
  });
});

QUnit.test('visit() rejects on instance boot failure', function(assert) {
  run(() => {
    createApplication();

    App.instanceInitializer({
      name: 'error',
      initialize() {
        throw new Error('boot failure');
      }
    });
  });

  expectAsyncError();

  return run(App, 'visit', '/').then(() => {
    assert.ok(false, 'It should not resolve the promise');
  }, error => {
    assert.ok(error instanceof Error, 'It should reject the promise with the boot error');
    assert.equal(error.message, 'boot failure');
  });
});

QUnit.test('visit() follows redirects', function(assert) {
  run(() => {
    createApplication();

    App.Router.map(function() {
      this.route('a');
      this.route('b', { path: '/b/:b' });
      this.route('c', { path: '/c/:c' });
    });

    App.register('route:a', Route.extend({
      afterModel() {
        this.replaceWith('b', 'zomg');
      }
    }));

    App.register('route:b', Route.extend({
      afterModel(params) {
        this.transitionTo('c', params.b);
      }
    }));
  });

  return run(App, 'visit', '/a').then(instance => {
    assert.ok(instance instanceof ApplicationInstance, 'promise is resolved with an ApplicationInstance');
    assert.equal(instance.getURL(), '/c/zomg', 'It should follow all redirects');
  });
});

QUnit.test('visit() rejects if an error occurred during a transition', function(assert) {
  run(() => {
    createApplication();

    App.Router.map(function() {
      this.route('a');
      this.route('b', { path: '/b/:b' });
      this.route('c', { path: '/c/:c' });
    });

    App.register('route:a', Route.extend({
      afterModel() {
        this.replaceWith('b', 'zomg');
      }
    }));

    App.register('route:b', Route.extend({
      afterModel(params) {
        this.transitionTo('c', params.b);
      }
    }));

    App.register('route:c', Route.extend({
      afterModel(params) {
        throw new Error('transition failure');
      }
    }));
  });

  expectAsyncError();

  return run(App, 'visit', '/a').then(() => {
    assert.ok(false, 'It should not resolve the promise');
  }, error => {
    assert.ok(error instanceof Error, 'It should reject the promise with the boot error');
    assert.equal(error.message, 'transition failure');
  });
});

QUnit.test('visit() chain', function(assert) {
  run(() => {
    createApplication();

    App.Router.map(function() {
      this.route('a');
      this.route('b');
      this.route('c');
    });
  });

  return run(App, 'visit', '/').then(instance => {
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
});

QUnit.test('visit() returns a promise that resolves when the view has rendered', function(assert) {
  run(() => {
    createApplication();

    App.register('template:application', compile('<h1>Hello world</h1>'));
  });

  assert.strictEqual(jQuery('#qunit-fixture').children().length, 0, 'there are no elements in the fixture element');

  return run(App, 'visit', '/').then(instance => {
    assert.ok(instance instanceof ApplicationInstance, 'promise is resolved with an ApplicationInstance');
    assert.equal(jQuery('#qunit-fixture > .ember-view h1').text(), 'Hello world', 'the application was rendered once the promise resolves');
  });
});

QUnit.test('visit() returns a promise that resolves without rendering when shouldRender is set to false', function(assert) {
  assert.expect(3);

  run(() => {
    createApplication();

    App.register('template:application', compile('<h1>Hello world</h1>'));
  });

  assert.strictEqual(jQuery('#qunit-fixture').children().length, 0, 'there are no elements in the fixture element');

  return run(App, 'visit', '/', { shouldRender: false }).then(instance => {
    assert.ok(instance instanceof ApplicationInstance, 'promise is resolved with an ApplicationInstance');
    assert.strictEqual(jQuery('#qunit-fixture').children().length, 0, 'there are still no elements in the fixture element after visit');
  });
});

QUnit.test('visit() renders a template when shouldRender is set to true', function(assert) {
  assert.expect(3);

  run(() => {
    createApplication();

    App.register('template:application', compile('<h1>Hello world</h1>'));
  });

  assert.strictEqual(jQuery('#qunit-fixture').children().length, 0, 'there are no elements in the fixture element');

  return run(App, 'visit', '/', { shouldRender: true }).then(instance => {
    assert.ok(instance instanceof ApplicationInstance, 'promise is resolved with an ApplicationInstance');
    assert.strictEqual(jQuery('#qunit-fixture').children().length, 1, 'there is 1 element in the fixture element after visit');
  });
});

QUnit.test('visit() returns a promise that resolves without rendering when shouldRender is set to false with Engines', function(assert) {
  assert.expect(3);

  run(() => {
    createApplication();

    App.register('template:application', compile('<h1>Hello world</h1>'));

    // Register engine
    let BlogEngine = Engine.extend();
    App.register('engine:blog', BlogEngine);

    // Register engine route map
    let BlogMap = function() {};
    App.register('route-map:blog', BlogMap);

    App.Router.map(function() {
      this.mount('blog');
    });
  });

  assert.strictEqual(jQuery('#qunit-fixture').children().length, 0, 'there are no elements in the fixture element');

  return run(App, 'visit', '/blog', { shouldRender: false }).then(instance => {
    assert.ok(instance instanceof ApplicationInstance, 'promise is resolved with an ApplicationInstance');
    assert.strictEqual(jQuery('#qunit-fixture').children().length, 0, 'there are still no elements in the fixture element after visit');
  });
});

QUnit.test('visit() on engine resolves engine component', function(assert) {
  assert.expect(2);

  run(() => {
    createApplication();

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
    App.register('engine:blog', BlogEngine);

    // Register engine route map
    let BlogMap = function() {};
    App.register('route-map:blog', BlogMap);

    App.Router.map(function() {
      this.mount('blog');
    });
  });

  assert.strictEqual(jQuery('#qunit-fixture').children().length, 0, 'there are no elements in the fixture element');

  return run(App, 'visit', '/blog', { shouldRender: true }).then(instance => {
    assert.strictEqual(jQuery('#qunit-fixture').find('p').text(), 'Dis cache money', 'Engine component is resolved');
  });
});

QUnit.test('visit() on engine resolves engine helper', function(assert) {
  assert.expect(2);

  run(() => {
    createApplication();

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
    App.register('engine:blog', BlogEngine);

    // Register engine route map
    let BlogMap = function() {};
    App.register('route-map:blog', BlogMap);

    App.Router.map(function() {
      this.mount('blog');
    });
  });

  assert.strictEqual(jQuery('#qunit-fixture').children().length, 0, 'there are no elements in the fixture element');

  return run(App, 'visit', '/blog', { shouldRender: true }).then(instance => {
    assert.strictEqual(jQuery('#qunit-fixture').text(), 'turnt up', 'Engine component is resolved');
  });
});

QUnit.module('Ember.Application - visit() Integration Tests', {
  teardown() {
    if (instances) {
      run(instances, 'forEach', (i) => i.destroy());
      instances = [];
    }

    if (App) {
      run(App, 'destroy');
      App = null;
    }
  }
});

QUnit.test('Ember Islands-style setup', function(assert) {
  let xFooInitCalled = false;
  let xFooDidInsertElementCalled = false;

  let xBarInitCalled = false;
  let xBarDidInsertElementCalled = false;

  run(() => {
    createApplication(true);

    App.Router.map(function() {
      this.route('show', { path: '/:component_name' });
    });

    App.register('route:show', Route.extend({
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

    App.register('service:isolated-counter', Counter);
    App.register('service:shared-counter', Counter.create(), { instantiate: false });

    App.register('template:show', compile('{{component model.componentName model=model.componentData}}'));

    App.register('template:components/x-foo', compile(`
      <h1>X-Foo</h1>
      <p>Hello {{model.name}}, I have been clicked {{isolatedCounter.value}} times ({{sharedCounter.value}} times combined)!</p>
    `));

    App.register('component:x-foo', Component.extend({
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

    App.register('template:components/x-bar', compile(`
      <h1>X-Bar</h1>
      <button {{action "incrementCounter"}}>Join {{counter.value}} others in clicking me!</button>
    `));

    App.register('component:x-bar', Component.extend({
      counter: inject.service('shared-counter'),

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
  });

  let $foo = jQuery('<div />').appendTo('#qunit-fixture');
  let $bar = jQuery('<div />').appendTo('#qunit-fixture');

  let data = encodeURIComponent(JSON.stringify({ name: 'Godfrey' }));

  return RSVP.all([
    run(App, 'visit', `/x-foo?data=${data}`, { rootElement: $foo[0] }),
    run(App, 'visit', '/x-bar', { rootElement: $bar[0] })
  ]).then(() => {
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

    run(() => $foo.find('x-foo').click());

    assert.equal($foo.find('p').text(), 'Hello Godfrey, I have been clicked 1 times (1 times combined)!');
    assert.equal($bar.find('button').text(), 'Join 1 others in clicking me!');

    run(() => {
      $bar.find('button').click();
      $bar.find('button').click();
    });

    assert.equal($foo.find('p').text(), 'Hello Godfrey, I have been clicked 1 times (3 times combined)!');
    assert.equal($bar.find('button').text(), 'Join 3 others in clicking me!');
  });
});

QUnit.skip('Test setup', function(assert) {
});

QUnit.skip('iframe setup', function(assert) {
});
