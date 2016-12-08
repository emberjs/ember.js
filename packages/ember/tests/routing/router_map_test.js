import { run } from 'ember-metal';
import { compile } from 'ember-template-compiler';
import { Application } from 'ember-application';
import { Router } from 'ember-routing';
import { jQuery } from 'ember-views';
import { setTemplates, setTemplate } from 'ember-glimmer';

let router, App, container;

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

QUnit.module('Router.map', {
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

      container = App.__container__;
    });
  },

  teardown() {
    run(() => {
      App.destroy();
      App = null;

      setTemplates({});
    });
  }
});

QUnit.test('Router.map returns an Ember Router class', function () {
  expect(1);

  let ret = App.Router.map(function() {
    this.route('hello');
  });

  ok(Router.detect(ret));
});

QUnit.test('Router.map can be called multiple times', function () {
  expect(4);

  setTemplate('hello', compile('Hello!'));
  setTemplate('goodbye', compile('Goodbye!'));

  App.Router.map(function() {
    this.route('hello');
  });

  App.Router.map(function() {
    this.route('goodbye');
  });

  bootApplication();

  handleURL('/hello');

  equal(jQuery('#qunit-fixture').text(), 'Hello!', 'The hello template was rendered');

  handleURL('/goodbye');

  equal(jQuery('#qunit-fixture').text(), 'Goodbye!', 'The goodbye template was rendered');
});
