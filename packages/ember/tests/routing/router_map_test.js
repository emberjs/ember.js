import run from 'ember-metal/run_loop';
import compile from 'ember-template-compiler/system/compile';
import Application from 'ember-application/system/application';
import Router from 'ember-routing/system/router';
import jQuery from 'ember-views/system/jquery';
import { setTemplates, set as setTemplate } from 'ember-templates/template_registry';

var router, App, container;

function bootApplication() {
  router = container.lookup('router:main');
  run(App, 'advanceReadiness');
}

function handleURL(path) {
  return run(function() {
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
    run(function() {
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
    run(function() {
      App.destroy();
      App = null;

      setTemplates({});
    });
  }
});

QUnit.test('Router.map returns an Ember Router class', function () {
  expect(1);

  var ret = App.Router.map(function() {
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
