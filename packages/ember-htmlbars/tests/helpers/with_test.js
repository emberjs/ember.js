/*jshint newcap:false*/
import EmberView from "ember-views/views/view";
import run from "ember-metal/run_loop";
import EmberObject from "ember-runtime/system/object";
import { computed } from "ember-metal/computed";
import { set } from "ember-metal/property_set";
import { get } from "ember-metal/property_get";
import ObjectController from "ember-runtime/controllers/object_controller";
import {
  objectControllerDeprecation
} from "ember-runtime/controllers/object_controller";
import EmberController from 'ember-runtime/controllers/controller';
import { Registry } from "ember-runtime/system/container";
import compile from "ember-template-compiler/system/compile";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var view, lookup;
var originalLookup = Ember.lookup;

function testWithAs(moduleName, templateString) {
  QUnit.module(moduleName, {
    setup() {
      Ember.lookup = lookup = { Ember: Ember };

      view = EmberView.create({
        template: compile(templateString),
        context: {
          title: "Señor Engineer",
          person: { name: "Tom Dale" }
        }
      });

      runAppend(view);
    },

    teardown() {
      runDestroy(view);
      Ember.lookup = originalLookup;
    }
  });

  QUnit.test("it should support #with-as syntax", function() {
    equal(view.$().text(), "Señor Engineer: Tom Dale", "should be properly scoped");
  });

  QUnit.skip("updating the context should update the alias", function() {
    run(function() {
      view.set('context.person', {
        name: "Yehuda Katz"
      });
    });

    equal(view.$().text(), "Señor Engineer: Yehuda Katz", "should be properly scoped after updating");
  });

  QUnit.test("updating a property on the context should update the HTML", function() {
    equal(view.$().text(), "Señor Engineer: Tom Dale", "precond - should be properly scoped after updating");

    run(function() {
      set(view, 'context.person.name', "Yehuda Katz");
    });

    equal(view.$().text(), "Señor Engineer: Yehuda Katz", "should be properly scoped after updating");
  });

  QUnit.test("updating a property on the view should update the HTML", function() {
    run(function() {
      view.set('context.title', "Señorette Engineer");
    });

    equal(view.$().text(), "Señorette Engineer: Tom Dale", "should be properly scoped after updating");
  });
}

testWithAs("ember-htmlbars: {{#with}} helper", "{{#with person as tom}}{{title}}: {{tom.name}}{{/with}}");

QUnit.module("Multiple Handlebars {{with foo as bar}} helpers", {
  setup() {
    Ember.lookup = lookup = { Ember: Ember };

    view = EmberView.create({
      template: compile("Admin: {{#with admin as person}}{{person.name}}{{/with}} User: {{#with user as person}}{{person.name}}{{/with}}"),
      context: {
        admin: { name: "Tom Dale" },
        user: { name: "Yehuda Katz" }
      }
    });

    runAppend(view);
  },

  teardown() {
    runDestroy(view);

    Ember.lookup = originalLookup;
  }
});

QUnit.test("re-using the same variable with different #with blocks does not override each other", function() {
  equal(view.$().text(), "Admin: Tom Dale User: Yehuda Katz", "should be properly scoped");
});

QUnit.skip("the scoped variable is not available outside the {{with}} block.", function() {
  run(function() {
    view.set('template', compile("{{name}}-{{#with other as name}}{{name}}{{/with}}-{{name}}"));
    view.set('context', {
      name: 'Stef',
      other: 'Yehuda'
    });
  });

  equal(view.$().text(), "Stef-Yehuda-Stef", "should be properly scoped after updating");
});

QUnit.skip("nested {{with}} blocks shadow the outer scoped variable properly.", function() {
  run(function() {
    view.set('template', compile("{{#with first as ring}}{{ring}}-{{#with fifth as ring}}{{ring}}-{{#with ninth as ring}}{{ring}}-{{/with}}{{ring}}-{{/with}}{{ring}}{{/with}}"));
    view.set('context', {
      first: 'Limbo',
      fifth: 'Wrath',
      ninth: 'Treachery'
    });
  });

  equal(view.$().text(), "Limbo-Wrath-Treachery-Wrath-Limbo", "should be properly scoped after updating");
});

QUnit.module("Handlebars {{#with}} globals helper [DEPRECATED]", {
  setup() {
    Ember.lookup = lookup = { Ember: Ember };

    lookup.Foo = { bar: 'baz' };
    view = EmberView.create({
      template: compile("{{#with Foo.bar as qux}}{{qux}}{{/with}}")
    });
  },

  teardown() {
    runDestroy(view);
    Ember.lookup = originalLookup;
  }
});

QUnit.skip("it should support #with Foo.bar as qux [DEPRECATED]", function() {
  expectDeprecation(function() {
    runAppend(view);
  }, /Global lookup of Foo from a Handlebars template is deprecated/);

  equal(view.$().text(), "baz", "should be properly scoped");

  run(function() {
    set(lookup.Foo, 'bar', 'updated');
  });

  equal(view.$().text(), "updated", "should update");
});

QUnit.module("Handlebars {{#with keyword as foo}}");

QUnit.test("it should support #with view as foo", function() {
  var view = EmberView.create({
    template: compile("{{#with view as myView}}{{myView.name}}{{/with}}"),
    name: "Sonics"
  });

  runAppend(view);
  equal(view.$().text(), "Sonics", "should be properly scoped");

  run(function() {
    set(view, 'name', "Thunder");
  });

  equal(view.$().text(), "Thunder", "should update");

  runDestroy(view);
});

QUnit.skip("it should support #with name as food, then #with foo as bar", function() {
  var view = EmberView.create({
    template: compile("{{#with name as foo}}{{#with foo as bar}}{{bar}}{{/with}}{{/with}}"),
    context: { name: "caterpillar" }
  });

  runAppend(view);
  equal(view.$().text(), "caterpillar", "should be properly scoped");

  run(function() {
    set(view, 'context.name', "butterfly");
  });

  equal(view.$().text(), "butterfly", "should update");

  runDestroy(view);
});

QUnit.module("Handlebars {{#with this as foo}}");

QUnit.test("it should support #with this as qux", function() {
  var view = EmberView.create({
    template: compile("{{#with this as person}}{{person.name}}{{/with}}"),
    controller: EmberObject.create({ name: "Los Pivots" })
  });

  runAppend(view);
  equal(view.$().text(), "Los Pivots", "should be properly scoped");

  run(function() {
    set(view, 'controller.name', "l'Pivots");
  });

  equal(view.$().text(), "l'Pivots", "should update");

  runDestroy(view);
});

QUnit.module("Handlebars {{#with foo}} with defined controller");

QUnit.skip("it should wrap context with object controller [DEPRECATED]", function() {
  var childController;

  var Controller = ObjectController.extend({
    init: function() {
      if (childController) { throw new Error("Did not expect controller.init to be invoked twice"); }
      childController = this;
      this._super();
    },
    controllerName: computed(function() {
      return "controller:"+this.get('model.name') + ' and ' + this.get('parentController.name');
    }).property('model.name', 'parentController.name')
  });

  var person = EmberObject.create({ name: 'Steve Holt' });
  var registry = new Registry();
  var container = registry.container();

  var parentController = EmberObject.create({
    container: container,
    name: 'Bob Loblaw'
  });

  view = EmberView.create({
    container: container,
    template: compile('{{#with view.person controller="person"}}{{controllerName}}{{/with}}'),
    person: person,
    controller: parentController
  });

  registry.register('controller:person', Controller);

  expectDeprecation(objectControllerDeprecation);
  expectDeprecation(function() {
    runAppend(view);
  }, 'Using the context switching form of `{{with}}` is deprecated. Please use the keyword form (`{{with foo as bar}}`) instead.');

  equal(view.$().text(), "controller:Steve Holt and Bob Loblaw");

  run(function() {
    view.rerender();
  });

  equal(view.$().text(), "controller:Steve Holt and Bob Loblaw");

  run(function() {
    parentController.set('name', 'Carl Weathers');
    view.rerender();
  });

  equal(view.$().text(), "controller:Steve Holt and Carl Weathers");

  run(function() {
    person.set('name', 'Gob');
    view.rerender();
  });

  equal(view.$().text(), "controller:Gob and Carl Weathers");

  strictEqual(childController.get('target'), parentController, "the target property of the child controllers are set correctly");

  runDestroy(view);
});

/* requires each
QUnit.test("it should still have access to original parentController within an {{#each}}", function() {
  var Controller = ObjectController.extend({
    controllerName: computed(function() {
      return "controller:"+this.get('model.name') + ' and ' + this.get('parentController.name');
    })
  });

  var people = A([{ name: "Steve Holt" }, { name: "Carl Weathers" }]);
  var registry = new Registry();
  var container = registry.container();

  var parentController = EmberObject.create({
    container: container,
    name: 'Bob Loblaw',
    people: people
  });

  view = EmberView.create({
    container: container,
    template: compile('{{#each person in people}}{{#with person controller="person"}}{{controllerName}}{{/with}}{{/each}}'),
    controller: parentController
  });

  registry.register('controller:person', Controller);

  runAppend(view);

  equal(view.$().text(), "controller:Steve Holt and Bob Loblawcontroller:Carl Weathers and Bob Loblaw");

  runDestroy(view);
});
*/

QUnit.test("it should wrap keyword with object controller [DEPRECATED]", function() {
  expectDeprecation(objectControllerDeprecation);

  var PersonController = ObjectController.extend({
    name: computed('model.name', function() {
      return get(this, 'model.name').toUpperCase();
    })
  });

  var person = EmberObject.create({ name: 'Steve Holt' });
  var registry = new Registry();
  var container = registry.container();

  var parentController = EmberObject.create({
    container: container,
    person: person,
    name: 'Bob Loblaw'
  });

  view = EmberView.create({
    container: container,
    template: compile('{{#with person as steve controller="person"}}{{name}} - {{steve.name}}{{/with}}'),
    controller: parentController
  });

  registry.register('controller:person', PersonController);

  runAppend(view);

  equal(view.$().text(), "Bob Loblaw - STEVE HOLT");

  run(function() {
    view.rerender();
  });

  equal(view.$().text(), "Bob Loblaw - STEVE HOLT");

  run(function() {
    parentController.set('name', 'Carl Weathers');
    view.rerender();
  });

  equal(view.$().text(), "Carl Weathers - STEVE HOLT");

  run(function() {
    person.set('name', 'Gob');
    view.rerender();
  });

  equal(view.$().text(), "Carl Weathers - GOB");

  runDestroy(view);
});

QUnit.test("destroys the controller generated with {{with foo controller='blah'}} [DEPRECATED]", function() {
  var destroyed = false;
  var Controller = EmberController.extend({
    willDestroy() {
      this._super.apply(this, arguments);
      destroyed = true;
    }
  });

  var person = EmberObject.create({ name: 'Steve Holt' });
  var registry = new Registry();
  var container = registry.container();

  var parentController = EmberObject.create({
    container: container,
    person: person,
    name: 'Bob Loblaw'
  });

  view = EmberView.create({
    container: container,
    template: compile('{{#with person controller="person"}}{{controllerName}}{{/with}}'),
    controller: parentController
  });

  registry.register('controller:person', Controller);

  expectDeprecation(function() {
    runAppend(view);
  }, 'Using the context switching form of `{{with}}` is deprecated. Please use the keyword form (`{{with foo as bar}}`) instead.');

  runDestroy(view);

  ok(destroyed, 'controller was destroyed properly');
});

QUnit.test("destroys the controller generated with {{with foo as bar controller='blah'}}", function() {
  var destroyed = false;
  var Controller = EmberController.extend({
    willDestroy() {
      this._super.apply(this, arguments);
      destroyed = true;
    }
  });

  var person = EmberObject.create({ name: 'Steve Holt' });
  var registry = new Registry();
  var container = registry.container();

  var parentController = EmberObject.create({
    container: container,
    person: person,
    name: 'Bob Loblaw'
  });

  view = EmberView.create({
    container: container,
    template: compile('{{#with person as steve controller="person"}}{{controllerName}}{{/with}}'),
    controller: parentController
  });

  registry.register('controller:person', Controller);

  runAppend(view);

  runDestroy(view);

  ok(destroyed, 'controller was destroyed properly');
});

QUnit.module("{{#with}} helper binding to view keyword", {
  setup() {
    Ember.lookup = lookup = { Ember: Ember };

    view = EmberView.create({
      template: compile("We have: {{#with view.thing as fromView}}{{fromView.name}} and {{fromContext.name}}{{/with}}"),
      thing: { name: 'this is from the view' },
      context: {
        fromContext: { name: "this is from the context" }
      }
    });

    runAppend(view);
  },

  teardown() {
    runDestroy(view);
    Ember.lookup = originalLookup;
  }
});

QUnit.test("{{with}} helper can bind to keywords with 'as'", function() {
  equal(view.$().text(), "We have: this is from the view and this is from the context", "should render");
});

testWithAs("ember-htmlbars: {{#with x as |y|}}", "{{#with person as |tom|}}{{title}}: {{tom.name}}{{/with}}");

QUnit.module("Multiple Handlebars {{with foo as |bar|}} helpers", {
  setup() {
    Ember.lookup = lookup = { Ember: Ember };

    view = EmberView.create({
      template: compile("Admin: {{#with admin as |person|}}{{person.name}}{{/with}} User: {{#with user as |person|}}{{person.name}}{{/with}}"),
      context: {
        admin: { name: "Tom Dale" },
        user: { name: "Yehuda Katz" }
      }
    });

    runAppend(view);
  },

  teardown() {
    runDestroy(view);
    Ember.lookup = originalLookup;
  }
});

QUnit.test("re-using the same variable with different #with blocks does not override each other", function() {
  equal(view.$().text(), "Admin: Tom Dale User: Yehuda Katz", "should be properly scoped");
});

QUnit.skip("the scoped variable is not available outside the {{with}} block.", function() {
  run(function() {
    view.set('template', compile("{{name}}-{{#with other as |name|}}{{name}}{{/with}}-{{name}}"));
    view.set('context', {
      name: 'Stef',
      other: 'Yehuda'
    });
  });

  equal(view.$().text(), "Stef-Yehuda-Stef", "should be properly scoped after updating");
});

QUnit.skip("nested {{with}} blocks shadow the outer scoped variable properly.", function() {
  run(function() {
    view.set('template', compile("{{#with first as |ring|}}{{ring}}-{{#with fifth as |ring|}}{{ring}}-{{#with ninth as |ring|}}{{ring}}-{{/with}}{{ring}}-{{/with}}{{ring}}{{/with}}"));
    view.set('context', {
      first: 'Limbo',
      fifth: 'Wrath',
      ninth: 'Treachery'
    });
  });

  equal(view.$().text(), "Limbo-Wrath-Treachery-Wrath-Limbo", "should be properly scoped after updating");
});
