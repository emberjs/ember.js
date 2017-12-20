import { Controller } from 'ember-runtime';
import { Route } from 'ember-routing';
import { run } from 'ember-metal';
import { helper } from 'ember-glimmer';
import { jQuery } from 'ember-views';
import { compile } from 'ember-template-compiler';
import { Application } from 'ember-application';

let Router, App, router, registry, container;

function bootApplication() {
  router = container.lookup('router:main');
  run(App, 'advanceReadiness');
}

function handleURL(path) {
  return run(() => {
    return router.handleURL(path).then(function(value) {
      ok(true, 'url: `' + path + '` was handled');
      return value;
    }, function(reason) {
      ok(false, 'failed to visit:`' + path + '` reason: `' + QUnit.jsDump.parse(reason));
      throw reason;
    });
  });
}

QUnit.module('RouteInfo template usage', {
  setup() {
    run(() => {
      App = Application.create({
        name: 'App',
        rootElement: '#qunit-fixture'
      });

      App.deferReadiness();

      App.Router.reopen({
        location: 'none'
      });

      Router = App.Router;

      registry = App.__registry__;
      container = App.__container__;
    });
  },

  teardown() {
    run(() => {
      App.destroy();
      App = null;
    });
  }
});

QUnit.test('RouteInfo has name and localName', function(assert) {
  assert.expect(3);

  Router.map(function() {
    this.route('things', function() {
      this.route('one');
    });
  });

  registry.register('helper:inspect-info', helper(function([info]) {
    assert.equal(info.name, "things.one");
    assert.equal(info.localName, "one");
  }));

  registry.register('template:things.one', compile(
    '{{inspect-info (-get-dynamic-var "outletState") }}'
  ));

  bootApplication();
  handleURL('/things/one');
});


QUnit.test('RouteInfo has model', function(assert) {
  assert.expect(2);

  registry.register('route:index', Route.extend({
    model() {
      return {
        hello: 'world'
      };
    }
  }));

  registry.register('helper:inspect-info', helper(function([info]) {
    assert.equal(info.data.model.hello, "world");
  }));

  registry.register('template:index', compile(
    '{{inspect-info (-get-dynamic-var "outletState") }}'
  ));

  bootApplication();
  handleURL('/');
});


QUnit.test('RouteInfo in parent can see child', function(assert) {
  Router.map(function() {
    this.route('things', function() {
      this.route('one');
    });
  });

  let lastInfo;
  registry.register('helper:inspect-info', helper(function([info]) {
    lastInfo = info;
  }));

  registry.register('template:things', compile(
    '{{inspect-info (-get-dynamic-var "outletState") }}'
  ));

  bootApplication();
  handleURL('/things/one');
  assert.equal(lastInfo.child.localName, "one");
});

QUnit.test('RouteInfo in parent can see child transitions', function(assert) {
  Router.map(function() {
    this.route('things', function() {
      this.route('one');
      this.route('two');
    });
  });

  let lastInfo;
  registry.register('helper:inspect-info', helper(function([info]) {
    lastInfo = info;
  }));

  registry.register('template:things', compile(
    '{{inspect-info (-get-dynamic-var "outletState") }}'
  ));

  bootApplication();
  handleURL('/things/one');
  assert.equal(lastInfo.child.localName, "one");
  handleURL('/things/two');
  assert.equal(lastInfo.child.localName, "two");
});

QUnit.test('RouteInfo can see model-to-model transitions', function(assert) {
  Router.map(function() {
    this.route('things', { path: '/things/:id'});
  });

  registry.register('route:things', Route.extend({
    model({ id }) {
      return { id };
    }
  }));

  let lastInfo;
  registry.register('helper:inspect-info', helper(function([info]) {
    lastInfo = info;
  }));

  registry.register('template:things', compile(
    '{{inspect-info (-get-dynamic-var "outletState") }}'
  ));

  bootApplication();
  handleURL('/things/one');
  assert.equal(lastInfo.data.model.id, "one");
  handleURL('/things/two');
  assert.equal(lastInfo.data.model.id, "two");
});

QUnit.test('RouteInfo can see queryParams', function(assert) {
  Router.map(function() {
    this.route('things');
  });

  registry.register('controller:things', Controller.extend({
    queryParams: [ 'flavor' ],
    flavor: 'chocolate'
  }));

  let lastInfo;
  let helperRunCount = 0;
  registry.register('helper:inspect-info', helper(function([info]) {
    lastInfo = info;
    helperRunCount++;
  }));

  registry.register('template:things', compile(
    '<div class="flavor">{{flavor}}</div>{{inspect-info (-get-dynamic-var "outletState") }}'
  ));

  bootApplication();
  handleURL('/things?flavor=vanilla');
  assert.equal(lastInfo.queryParams.get('flavor'), "vanilla");
  assert.equal(jQuery('.flavor', '#qunit-fixture').text(), 'vanilla', 'sanity check query param');
  assert.equal(helperRunCount, 1, "expected single render pass");
});


QUnit.test('RouteInfo can see queryParam only transition', function(assert) {
  Router.map(function() {
    this.route('things');
  });

  registry.register('controller:things', Controller.extend({
    queryParams: [ 'flavor' ],
    flavor: 'chocolate'
  }));

  let lastInfo;
  registry.register('helper:inspect-info', helper(function([info]) {
    lastInfo = info;
  }));

  registry.register('template:things', compile(
    '<div class="flavor">{{flavor}}</div>{{inspect-info (-get-dynamic-var "outletState") }}'
  ));

  bootApplication();
  handleURL('/things');
  assert.equal(lastInfo.queryParams.get('flavor'), "chocolate");
  assert.equal(jQuery('.flavor', '#qunit-fixture').text(), 'chocolate', 'sanity check query param');
  handleURL('/things?flavor=vanilla');
  assert.equal(lastInfo.queryParams.get('flavor'), "vanilla");
  assert.equal(jQuery('.flavor', '#qunit-fixture').text(), 'vanilla', 'sanity check query param');

});
