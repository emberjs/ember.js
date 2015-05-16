import EmberApplication from 'ember-application/system/application';
import run from 'ember-metal/run_loop';
import { getTopLevelNode } from 'ember-extension-support/render_debug';
import compile from 'ember-template-compiler/system/compile';
import Route from 'ember-routing/system/route';
import Component from 'ember-views/views/component';
import Controller from 'ember-runtime/controllers/controller';

var app;

function lookup(name) {
  return app.__container__.lookup(name);
}

function flattenComponentNodes(node) {
  var array = [];
  if (node.isComponentNode()) {
    array.push(node);
  }
  node.buildChildren().forEach(child => {
    array = array.concat(flattenComponentNodes(child));
  });
  return array;
}

QUnit.module('Debug - Render Debug', {
  setup() {
    run(() => {
      app = EmberApplication.create();
      app.deferReadiness();
    });
  },

  teardown() {
    run(app, 'destroy');
    app = null;
  }
});

QUnit.test('Simple render tree', function() {
  let model = {};
  app.register('template:application', compile('{{outlet}}', { moduleName: 'application' }));
  app.register('template:index', compile('<h1>Index Page</h1>', { moduleName: 'index' }));
  app.register('route:application', Route.extend({
    model() {
      return model;
    }
  }));

  run(app, 'advanceReadiness');

  var nodes = flattenComponentNodes(getTopLevelNode(app));
  var node = nodes[0];
  equal(node.isComponentNode(), true, 'correctly identified as a component node');
  equal(node.hasOwnController(), true, 'top level always has its own controller');
  equal(node.hasComponentInstance(), true, 'Top level always has its own View instance');
  equal(node.getController(), lookup('controller:application'), 'returns the correct controller');
  equal(node.getTemplateName(), 'application', 'Gets the correct template name');
  equal(node.isEmberComponent(), false, 'top level is a view not a component');
  equal(node.getModel(), model, 'returns the correct model');
  equal(node.getComponentInstanceName(), 'toplevel', 'returns the correct view instance name');
  equal(node.getName(), 'application', 'returns the correct name');
  ok(node.getBoundingClientRect());

  node = nodes[1];
  equal(node.isComponentNode(), true, 'index correctly identified as a component node');
  equal(node.hasOwnController(), true, 'route nodes always have their own controller');
  equal(node.hasComponentInstance(), false, 'index is virtual - no view instance');
  equal(node.getController(), lookup('controller:index'), 'returns the correct controller');
  equal(node.getTemplateName(), 'index', 'index gets the correct template name');
  equal(node.isEmberComponent(), false, 'index is a view not a component');
  equal(node.getModel(), model, 'index has the same model as application');
  equal(node.getName(), 'index', 'returns the correct name');
  ok(node.getBoundingClientRect());
});

QUnit.test('Ember component node', function() {
  app.register('template:application', compile('{{foo-bar}}', { moduleName: 'application' }));
  app.register('template:components/foo-bar', compile('Foo bar', { moduleName: 'fooBar' }));
  app.register('component:foo-bar', Component);

  run(app, 'advanceReadiness');

  var nodes = flattenComponentNodes(getTopLevelNode(app));
  var component = nodes[1];

  equal(component.isComponentNode(), true, 'correctly identified as a component node');
  equal(component.hasComponentInstance(), true, 'Ember component instance detected');
  equal(component.getTemplateName(), 'fooBar', 'has the correct template name');
  equal(component.isEmberComponent(), true, 'correctly identified as an Ember Component');
  equal(component.getName(), 'fooBar', 'returns the correct name');
});

QUnit.test('Components in each helper', function() {
  app.register('controller:application', Controller.extend({
    model: [1, 2, 3]
  }));
  app.register('template:application', compile('{{#each model as |item|}}{{foo-bar}}{{/each}}', { moduleName: 'application' }));
  app.register('template:components/foo-bar', compile('Foo bar', { moduleName: 'fooBar' }));

  run(app, 'advanceReadiness');

  var nodes = flattenComponentNodes(getTopLevelNode(app));
  equal(nodes.length, 4, 'components inside each helper are detected');
});
