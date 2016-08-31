import run from 'ember-metal/run_loop';
import { compile } from 'ember-template-compiler/tests/utils/helpers';
import Application from 'ember-application/system/application';
import jQuery from 'ember-views/system/jquery';
import NoneLocation from 'ember-routing/location/none_location';
import { setTemplates, setTemplate } from 'ember-glimmer';

let App, templates, router, container;

function bootApplication() {
  for (let name in templates) {
    setTemplate(name, compile(templates[name]));
  }
  router = container.lookup('router:main');
  run(App, 'advanceReadiness');
}

QUnit.module('Top Level DOM Structure', {
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

      templates = {
        application: 'hello world'
      };
    });
  },

  teardown() {
    run(() => {
      App.destroy();
      App = null;
      setTemplates({});
    });

    NoneLocation.reopen({
      path: ''
    });
  }
});

QUnit.test('Topmost template always get an element', function() {
  bootApplication();
  equal(jQuery('#qunit-fixture > .ember-view').text(), 'hello world');
});
