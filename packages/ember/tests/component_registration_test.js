import { Controller } from 'ember-runtime';
import { run } from 'ember-metal';

import { Application } from 'ember-application';
import { Router } from 'ember-routing';
import { compile } from 'ember-template-compiler';
import {
  Component,
  setTemplates,
  setTemplate
} from 'ember-glimmer';
import { jQuery } from 'ember-views';

let App, appInstance;

function prepare() {
  setTemplate('components/expand-it', compile('<p>hello {{yield}}</p>'));
  setTemplate('application', compile('Hello world {{#expand-it}}world{{/expand-it}}'));
}

function cleanup() {
  run(() => {
    try {
      if (App) {
        App.destroy();
      }
      App = appInstance = null;
    } finally {
      setTemplates({});
    }
  });
}

QUnit.module('Application Lifecycle - Component Registration', {
  setup: prepare,
  teardown: cleanup
});

function boot(callback, startURL = '/') {
  run(() => {
    App = Application.create({
      name: 'App',
      rootElement: '#qunit-fixture'
    });

    App.deferReadiness();

    App.Router = Router.extend({
      location: 'none'
    });

    appInstance = App.__deprecatedInstance__;

    if (callback) { callback(); }
  });

  let router = appInstance.lookup('router:main');

  run(App, 'advanceReadiness');
  run(() => router.handleURL(startURL));
}

QUnit.test('The helper becomes the body of the component', function() {
  boot();
  equal(jQuery('div.ember-view > div.ember-view', '#qunit-fixture').text(), 'hello world', 'The component is composed correctly');
});

QUnit.test('If a component is registered, it is used', function() {
  boot(() => {
    appInstance.register('component:expand-it', Component.extend({
      classNames: 'testing123'
    }));
  });

  equal(jQuery('div.testing123', '#qunit-fixture').text(), 'hello world', 'The component is composed correctly');
});

QUnit.test('Late-registered components can be rendered with custom `layout` property', function() {
  setTemplate('application', compile('<div id=\'wrapper\'>there goes {{my-hero}}</div>'));

  boot(() => {
    appInstance.register('component:my-hero', Component.extend({
      classNames: 'testing123',
      layout: compile('watch him as he GOES')
    }));
  });

  equal(jQuery('#wrapper').text(), 'there goes watch him as he GOES', 'The component is composed correctly');
});

QUnit.test('Late-registered components can be rendered with template registered on the container', function() {
  setTemplate('application', compile('<div id=\'wrapper\'>hello world {{sally-rutherford}}-{{#sally-rutherford}}!!!{{/sally-rutherford}}</div>'));

  boot(() => {
    appInstance.register('template:components/sally-rutherford', compile('funkytowny{{yield}}'));
    appInstance.register('component:sally-rutherford', Component);
  });

  equal(jQuery('#wrapper').text(), 'hello world funkytowny-funkytowny!!!', 'The component is composed correctly');
});

QUnit.test('Late-registered components can be rendered with ONLY the template registered on the container', function() {
  setTemplate('application', compile('<div id=\'wrapper\'>hello world {{borf-snorlax}}-{{#borf-snorlax}}!!!{{/borf-snorlax}}</div>'));

  boot(() => {
    appInstance.register('template:components/borf-snorlax', compile('goodfreakingTIMES{{yield}}'));
  });

  equal(jQuery('#wrapper').text(), 'hello world goodfreakingTIMES-goodfreakingTIMES!!!', 'The component is composed correctly');
});

QUnit.test('Assigning layoutName to a component should setup the template as a layout', function() {
  expect(1);

  setTemplate('application', compile('<div id=\'wrapper\'>{{#my-component}}{{text}}{{/my-component}}</div>'));
  setTemplate('foo-bar-baz', compile('{{text}}-{{yield}}'));

  boot(() => {
    appInstance.register('controller:application', Controller.extend({
      'text': 'outer'
    }));

    appInstance.register('component:my-component', Component.extend({
      text: 'inner',
      layoutName: 'foo-bar-baz'
    }));
  });

  equal(jQuery('#wrapper').text(), 'inner-outer', 'The component is composed correctly');
});

QUnit.test('Assigning layoutName and layout to a component should use the `layout` value', function() {
  expect(1);

  setTemplate('application', compile('<div id=\'wrapper\'>{{#my-component}}{{text}}{{/my-component}}</div>'));
  setTemplate('foo-bar-baz', compile('No way!'));

  boot(() => {
    appInstance.register('controller:application', Controller.extend({
      'text': 'outer'
    }));

    appInstance.register('component:my-component', Component.extend({
      text: 'inner',
      layoutName: 'foo-bar-baz',
      layout: compile('{{text}}-{{yield}}')
    }));
  });

  equal(jQuery('#wrapper').text(), 'inner-outer', 'The component is composed correctly');
});

QUnit.test('Assigning defaultLayout to a component should set it up as a layout if no layout was found [DEPRECATED]', function() {
  expect(2);

  setTemplate('application', compile('<div id=\'wrapper\'>{{#my-component}}{{text}}{{/my-component}}</div>'));

  expectDeprecation(() => {
    boot(() => {
      appInstance.register('controller:application', Controller.extend({
        'text': 'outer'
      }));

      appInstance.register('component:my-component', Component.extend({
        text: 'inner',
        defaultLayout: compile('{{text}}-{{yield}}')
      }));
    });
  }, /Specifying `defaultLayout` to .+ is deprecated\./);

  equal(jQuery('#wrapper').text(), 'inner-outer', 'The component is composed correctly');
});

QUnit.test('Assigning defaultLayout to a component should set it up as a layout if layout was found [DEPRECATED]', function() {
  expect(2);

  setTemplate('application', compile('<div id=\'wrapper\'>{{#my-component}}{{text}}{{/my-component}}</div>'));
  setTemplate('components/my-component', compile('{{text}}-{{yield}}'));

  expectDeprecation(() => {
    boot(() => {
      appInstance.register('controller:application', Controller.extend({
        'text': 'outer'
      }));

      appInstance.register('component:my-component', Component.extend({
        text: 'inner',
        defaultLayout: compile('should not see this!')
      }));
    });
  }, /Specifying `defaultLayout` to .+ is deprecated\./);

  equal(jQuery('#wrapper').text(), 'inner-outer', 'The component is composed correctly');
});

QUnit.test('Using name of component that does not exist', function () {
  setTemplate('application', compile('<div id=\'wrapper\'>{{#no-good}} {{/no-good}}</div>'));

  expectAssertion(() => boot(), /.* named "no-good" .*/);
});