import Registry from "container/registry";
import run from "ember-metal/run_loop";
import ComponentLookup from 'ember-views/component_lookup';
import View from "ember-views/views/view";
import Component from "ember-views/views/component";
import compile from "ember-template-compiler/system/compile";
import makeBoundHelper from "ember-htmlbars/system/make_bound_helper";
import makeViewHelper from "ember-htmlbars/system/make-view-helper";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var registry, container, view;

var blockParamsEnabled;
if (Ember.FEATURES.isEnabled('ember-htmlbars-block-params')) {
  blockParamsEnabled = true;
}

if (Ember.FEATURES.isEnabled('ember-htmlbars-scoped-helpers')) {
// jscs:disable validateIndentation

QUnit.module("ember-htmlbars: helper lookup -- scoped helpers", {
  setup: function() {
    registry = new Registry();
    container = registry.container();
    registry.optionsForType('component', { singleton: false });
    registry.optionsForType('view', { singleton: false });
    registry.optionsForType('template', { instantiate: false });
    registry.optionsForType('helper', { instantiate: false });
    registry.register('component-lookup:main', ComponentLookup);
  },

  teardown: function() {
    runDestroy(container);
    runDestroy(view);

    registry = container = view = null;
  }
});

test("basic scoped helper usage", function() {
  view = View.create({
    name: 'lucy',

    capitalize: makeBoundHelper(function(params) {
      return params[0].toUpperCase();
    }),

    template: compile('{{view.name}} - {{view.capitalize view.name}}')
  });

  runAppend(view);

  equal(view.$().text(), "lucy - LUCY");

  run(function() {
    view.set('name', "molly");
  });

  equal(view.$().text(), "molly - MOLLY");
});

if (blockParamsEnabled) {
  test("scoped helper usage through block param", function() {
    registry.register('template:components/form-for', compile('{{yield formHelpers}}'));

    registry.register('component:form-for', Component.extend({
      tagName: 'form',

      formHelpers: {
        input: makeViewHelper(Component.extend({
          layout: compile('<label {{bind-attr for=inputId.elementId}}>{{label}}</label>{{input value=value viewName="inputId"}}')
        }))
      }
    }));

    view = View.create({
      firstName: 'Robert',
      container: container,
      template: compile('{{#form-for as |f|}} {{f.input label="First Name" value=view.firstName}} {{/form-for}}')
    });

    runAppend(view);

    equal(view.$('form').length, 1, 'form was created');
    equal(view.$('label').text(), 'First Name', 'label was created');
    equal(view.$('input').val(), 'Robert', 'input was created');

    run(function() {
      view.set('firstName', 'Jacquie');
    });

    equal(view.$('input').val(), 'Jacquie', 'input was updated');
  });
}

// jscs:enable validateIndentation
}
