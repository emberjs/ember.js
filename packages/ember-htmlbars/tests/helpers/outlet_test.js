import run from 'ember-metal/run_loop';
import Controller from 'ember-runtime/controllers/controller';
import EmberView from 'ember-views/views/view';
import jQuery from 'ember-views/system/jquery';
import { compile } from '../utils/helpers';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import { buildAppInstance } from 'ember-htmlbars/tests/utils';

let { trim } = jQuery;

let appInstance, top;

QUnit.module('ember-htmlbars: {{outlet}} helper', {
  setup() {
    appInstance = buildAppInstance();
    let CoreOutlet = appInstance._lookupFactory('view:core-outlet');
    top = CoreOutlet.create();
  },

  teardown() {
    runDestroy(appInstance);
    runDestroy(top);
    appInstance = top = null;
  }
});

QUnit.test('a top-level outlet should always be a view', function() {
  appInstance.register('view:toplevel', EmberView.extend({
    elementId: 'top-level'
  }));
  let routerState = withTemplate('<h1>HI</h1>{{outlet}}');
  top.setOutletState(routerState);
  routerState.outlets.main = withTemplate('<p>BYE</p>');
  runAppend(top);

  // Replace whitespace for older IE
  equal(trim(top.$('#top-level').text()), 'HIBYE');
});

QUnit.test('view should render the outlet when set before dom insertion', function() {
  let routerState = withTemplate('<h1>HI</h1>{{outlet}}');
  routerState.outlets.main = withTemplate('<p>BYE</p>');
  top.setOutletState(routerState);
  runAppend(top);

  // Replace whitespace for older IE
  equal(trim(top.$().text()), 'HIBYE');
});


QUnit.test('outlet should support an optional name', function() {
  let routerState = withTemplate('<h1>HI</h1>{{outlet \'mainView\'}}');
  top.setOutletState(routerState);
  runAppend(top);

  equal(top.$().text(), 'HI');

  routerState.outlets.mainView = withTemplate('<p>BYE</p>');

  run(() => top.setOutletState(routerState));

  // Replace whitespace for older IE
  equal(trim(top.$().text()), 'HIBYE');
});

QUnit.test('Outlets bind to the current view, not the current concrete view', function() {
  let routerState = withTemplate('<h1>HI</h1>{{outlet}}');
  top.setOutletState(routerState);
  runAppend(top);
  routerState.outlets.main = withTemplate('<h2>MIDDLE</h2>{{outlet}}');
  run(() => top.setOutletState(routerState));
  routerState.outlets.main.outlets.main = withTemplate('<h3>BOTTOM</h3>');
  run(() => top.setOutletState(routerState));

  let output = jQuery('#qunit-fixture h1 ~ h2 ~ h3').text();
  equal(output, 'BOTTOM', 'all templates were rendered');
});

QUnit.test('Outlets bind to the current template\'s view, not inner contexts [DEPRECATED]', function() {
  let parentTemplate = '<h1>HI</h1>{{#if view.alwaysTrue}}{{outlet}}{{/if}}';
  let bottomTemplate = '<h3>BOTTOM</h3>';

  let routerState = {
    render: {
      ViewClass: EmberView.extend({
        alwaysTrue: true,
        template: compile(parentTemplate)
      })
    },
    outlets: {}
  };

  top.setOutletState(routerState);

  runAppend(top);

  routerState.outlets.main = withTemplate(bottomTemplate);

  run(() => {
    top.setOutletState(routerState);
  });

  let output = jQuery('#qunit-fixture h1 ~ h3').text();
  equal(output, 'BOTTOM', 'all templates were rendered');
});

QUnit.test('should not throw deprecations if {{outlet}} is used without a name', function() {
  expectNoDeprecation();
  top.setOutletState(withTemplate('{{outlet}}'));
  runAppend(top);
});

QUnit.test('should not throw deprecations if {{outlet}} is used with a quoted name', function() {
  expectNoDeprecation();
  top.setOutletState(withTemplate('{{outlet "foo"}}'));
  runAppend(top);
});

QUnit.test('{{outlet}} should work with an unquoted name', function() {
  let routerState = {
    render: {
      controller: Controller.create({
        outletName: 'magical'
      }),
      template: compile('{{outlet outletName}}')
    },
    outlets: {
      magical: withTemplate('It\'s magic')
    }
  };

  top.setOutletState(routerState);
  runAppend(top);

  equal(top.$().text().trim(), 'It\'s magic');
});

QUnit.test('{{outlet}} should rerender when bound name changes', function() {
  let routerState = {
    render: {
      controller: Controller.create({
        outletName: 'magical'
      }),
      template: compile('{{outlet outletName}}')
    },
    outlets: {
      magical: withTemplate('It\'s magic'),
      second: withTemplate('second')
    }
  };

  top.setOutletState(routerState);
  runAppend(top);
  equal(top.$().text().trim(), 'It\'s magic');
  run(() => routerState.render.controller.set('outletName', 'second'));
  equal(top.$().text().trim(), 'second');
});

QUnit.test('views created by {{outlet}} should get destroyed', function() {
  let inserted = 0;
  let destroyed = 0;
  let routerState = {
    render: {
      ViewClass: EmberView.extend({
        didInsertElement() {
          inserted++;
        },
        willDestroyElement() {
          destroyed++;
        }
      })
    },
    outlets: {}
  };
  top.setOutletState(routerState);
  runAppend(top);
  equal(inserted, 1, 'expected to see view inserted');
  run(() => top.setOutletState(withTemplate('hello world')));
  equal(destroyed, 1, 'expected to see view destroyed');
});

function withTemplate(string) {
  return {
    render: {
      template: compile(string)
    },
    outlets: {}
  };
}
