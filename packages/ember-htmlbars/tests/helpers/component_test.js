import ComponentLookup from "ember-views/component_lookup";
import Registry from "container/registry";
import EmberView from "ember-views/views/view";
import compile from "ember-template-compiler/system/compile";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";
import run from "ember-metal/run_loop";
import { set } from "ember-metal/property_set";
import { get } from "ember-metal/property_get";
import Component from "ember-views/views/component";

var view, registry, container;

if (Ember.FEATURES.isEnabled('ember-htmlbars-component-helper')) {
  QUnit.module("ember-htmlbars: {{#component}} helper", {
    setup() {
      registry = new Registry();
      container = registry.container();

      registry.optionsForType('template', { instantiate: false });
      registry.register('component-lookup:main', ComponentLookup);
    },

    teardown() {
      runDestroy(view);
      runDestroy(container);
      registry = container = view = null;
    }
  });

  QUnit.test("component helper with unquoted string is bound", function() {
    registry.register('template:components/foo-bar', compile('yippie! {{attrs.location}} {{yield}}'));
    registry.register('template:components/baz-qux', compile('yummy {{attrs.location}} {{yield}}'));

    view = EmberView.create({
      container: container,
      dynamicComponent: 'foo-bar',
      location: 'Caracas',
      template: compile('{{#component view.dynamicComponent location=view.location}}arepas!{{/component}}')
    });

    runAppend(view);
    equal(view.$().text(), 'yippie! Caracas arepas!', 'component was looked up and rendered');

    Ember.run(function() {
      set(view, "dynamicComponent", 'baz-qux');
      set(view, "location", 'Loisaida');
    });
    equal(view.$().text(), 'yummy Loisaida arepas!', 'component was updated and re-rendered');
  });

  QUnit.test("component helper with actions", function() {
    registry.register('template:components/foo-bar', compile('yippie! {{yield}}'));
    registry.register('component:foo-bar', Ember.Component.extend({
      classNames: 'foo-bar',
      didInsertElement() {
        // trigger action on click in absence of app's EventDispatcher
        var self = this;
        this.$().on('click', function() {
          self.sendAction('fooBarred');
        });
      },
      willDestroyElement() {
        this.$().off('click');
      }
    }));

    var actionTriggered = 0;
    var controller = Ember.Controller.extend({
      dynamicComponent: 'foo-bar',
      actions: {
        mappedAction() {
          actionTriggered++;
        }
      }
    }).create();
    view = EmberView.create({
      container: container,
      controller: controller,
      template: compile('{{#component dynamicComponent fooBarred="mappedAction"}}arepas!{{/component}}')
    });

    runAppend(view);
    Ember.run(function() {
      view.$('.foo-bar').trigger('click');
    });
    equal(actionTriggered, 1, 'action was triggered');
  });

  QUnit.test('component helper maintains expected logical parentView', function() {
    registry.register('template:components/foo-bar', compile('yippie! {{yield}}'));
    var componentInstance;
    registry.register('component:foo-bar', Ember.Component.extend({
      didInsertElement() {
        componentInstance = this;
      }
    }));

    view = EmberView.create({
      container: container,
      dynamicComponent: 'foo-bar',
      template: compile('{{#component view.dynamicComponent}}arepas!{{/component}}')
    });

    runAppend(view);
    equal(get(componentInstance, 'parentView'), view, 'component\'s parentView is the view invoking the helper');
  });

  QUnit.test("nested component helpers", function() {
    registry.register('template:components/foo-bar', compile('yippie! {{attrs.location}} {{yield}}'));
    registry.register('template:components/baz-qux', compile('yummy {{attrs.location}} {{yield}}'));
    registry.register('template:components/corge-grault', compile('delicious {{attrs.location}} {{yield}}'));

    view = EmberView.create({
      container: container,
      dynamicComponent1: 'foo-bar',
      dynamicComponent2: 'baz-qux',
      location: 'Caracas',
      template: compile('{{#component view.dynamicComponent1 location=view.location}}{{#component view.dynamicComponent2 location=view.location}}arepas!{{/component}}{{/component}}')
    });

    runAppend(view);
    equal(view.$().text(), 'yippie! Caracas yummy Caracas arepas!', 'components were looked up and rendered');

    Ember.run(function() {
      set(view, "dynamicComponent1", 'corge-grault');
      set(view, "location", 'Loisaida');
    });
    equal(view.$().text(), 'delicious Loisaida yummy Loisaida arepas!', 'components were updated and re-rendered');
  });

  QUnit.test("component helper can be used with a quoted string (though you probably would not do this)", function() {
    registry.register('template:components/foo-bar', compile('yippie! {{attrs.location}} {{yield}}'));

    view = EmberView.create({
      container: container,
      location: 'Caracas',
      template: compile('{{#component "foo-bar" location=view.location}}arepas!{{/component}}')
    });

    runAppend(view);

    equal(view.$().text(), 'yippie! Caracas arepas!', 'component was looked up and rendered');
  });

  QUnit.test("component with unquoted param resolving to non-existent component", function() {
    view = EmberView.create({
      container: container,
      dynamicComponent: 'does-not-exist',
      location: 'Caracas',
      template: compile('{{#component view.dynamicComponent location=view.location}}arepas!{{/component}}')
    });

    expectAssertion(function() {
      runAppend(view);
    }, /HTMLBars error: Could not find component named "does-not-exist"./, "Expected missing component to generate an exception");
  });

  QUnit.test("component with unquoted param resolving to a component, then non-existent component", function() {
    registry.register('template:components/foo-bar', compile('yippie! {{attrs.location}} {{yield}}'));
    view = EmberView.create({
      container: container,
      dynamicComponent: 'foo-bar',
      location: 'Caracas',
      template: compile('{{#component view.dynamicComponent location=view.location}}arepas!{{/component}}')
    });

    runAppend(view);

    equal(view.$().text(), 'yippie! Caracas arepas!', 'component was looked up and rendered');

    Ember.run(function() {
      set(view, "dynamicComponent", undefined);
    });

    equal(view.$().text(), '', 'component correctly deals with falsey values set post-render');
  });

  QUnit.test("component with quoted param for non-existent component", function() {
    view = EmberView.create({
      container: container,
      location: 'Caracas',
      template: compile('{{#component "does-not-exist" location=view.location}}arepas!{{/component}}')
    });

    expectAssertion(function() {
      runAppend(view);
    }, /HTMLBars error: Could not find component named "does-not-exist"./);
  });

  QUnit.test("component helper properly invalidates hash params inside an {{each}} invocation #11044", function() {
    registry.register('component:foo-bar', Component.extend({
      willRender() {
        // store internally available name to ensure that the name available in `this.attrs.name`
        // matches the template lookup name
        set(this, 'internalName', this.attrs.name);
      }
    }));
    registry.register('template:components/foo-bar', compile('{{internalName}} - {{attrs.name}}|'));

    view = EmberView.create({
      container: container,
      items: [
        { name: 'Robert' },
        { name: 'Jacquie' }
      ],
      template: compile('{{#each view.items as |item|}}{{component "foo-bar" name=item.name}}{{/each}}')
    });

    runAppend(view);
    equal(view.$().text(), 'Robert - Robert|Jacquie - Jacquie|', 'component was rendered');

    run(function() {
      set(view, 'items', [
        { name: 'Max' },
        { name: 'James' }
      ]);
    });
    equal(view.$().text(), 'Max - Max|James - James|', 'component was updated and re-rendered');
  });
}
