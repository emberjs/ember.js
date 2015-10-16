import { get } from 'ember-metal/property_get';
import run from 'ember-metal/run_loop';
import EmberView from 'ember-views/views/view';
import { compile } from 'ember-template-compiler';
import { registerHelper } from 'ember-htmlbars/helpers';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';

var owner, view;

QUnit.module('EmberView - Layout Functionality', {
  setup() {
    owner = buildOwner();
    owner.registerOptionsForType('template', { instantiate: false });
  },

  teardown() {
    run(function() {
      view.destroy();
      owner.destroy();
    });
    owner = view = null;
  }
});

QUnit.test('Layout views return throw if their layout cannot be found', function() {
  view = EmberView.create({
    [OWNER]: {
      lookup() { }
    },
    layoutName: 'cantBeFound'
  });

  expectAssertion(function() {
    get(view, 'layout');
  }, /cantBeFound/);
});

QUnit.test('should use the template of the associated layout', function() {
  var templateCalled = 0;
  var layoutCalled = 0;

  registerHelper('call-template', function() {
    templateCalled++;
  });

  registerHelper('call-layout', function() {
    layoutCalled++;
  });

  owner.register('template:template', compile('{{call-template}}'));
  owner.register('template:layout', compile('{{call-layout}}'));

  view = EmberView.create({
    [OWNER]: owner,
    layoutName: 'layout',
    templateName: 'template'
  });

  run(function() {
    view.createElement();
  });

  equal(templateCalled, 0, 'template is not called when layout is present');
  equal(layoutCalled, 1, 'layout is called when layout is present');
});

QUnit.test('should use the associated template with itself as the context', function() {
  owner.register('template:testTemplate', compile(
    '<h1 id=\'twas-called\'>template was called for {{personName}}</h1>'
  ));

  view = EmberView.create({
    [OWNER]: owner,
    layoutName: 'testTemplate',
    context: {
      personName: 'Tom DAAAALE'
    }
  });

  run(function() {
    view.createElement();
  });

  equal('template was called for Tom DAAAALE', view.$('#twas-called').text(),
        'the named template was called with the view as the data source');
});

QUnit.test('should fall back to defaultLayout if neither template nor templateName are provided', function() {
  var View = EmberView.extend({
    defaultLayout: compile('used default layout')
  });

  view = View.create();

  run(function() {
    view.createElement();
  });

  equal('used default layout', view.$().text(),
        'the named template was called with the view as the data source');
});

QUnit.test('should not use defaultLayout if layout is provided', function() {
  var View = EmberView.extend({
    layout: compile('used layout'),
    defaultLayout: compile('used default layout')
  });

  view = View.create();
  run(function() {
    view.createElement();
  });

  equal('used layout', view.$().text(), 'default layout was not printed');
});
