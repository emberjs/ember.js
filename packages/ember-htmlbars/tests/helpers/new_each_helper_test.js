/*jshint newcap:false*/
import Ember from "ember-metal/core"; // Ember.lookup;
import EmberObject from "ember-runtime/system/object";
import run from "ember-metal/run_loop";
import EmberView from "ember-views/views/view";
import _MetamorphView from "ember-views/views/metamorph_view";
import { computed } from "ember-metal/computed";
import ArrayController from "ember-runtime/controllers/array_controller";
import { A } from "ember-runtime/system/native_array";
import { default as EmberController } from "ember-runtime/controllers/controller";
import { Registry } from "ember-runtime/system/container";

import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

import compile from "ember-template-compiler/system/compile";

var people, view, registry, container;

// This function lets us write {{#EACH|people|p}} {{p}} {{/each}}
// and generate:
//
// - {{#each p in people}} (legacy)
// - {{#each people as |p|}} (legacy)
function makeReplacer(useBlockParams) {
  return function(_, matchString) {
    var values = matchString.split("|");
    if (values.length === 1) { return "each"; }

    var arr = useBlockParams ?
      ["each", values[1], "as", "|" + values[2] + "|"] :
      ["each", values[2], "in", values[1]];

    var options = values[3];
    if (options) {
      if (useBlockParams) {
        arr.splice(2, 0, options);
      } else {
        arr.push(options);
      }
    }

    return arr.join(" ");
  };
}

var parseEachReplacerBlockParam    = makeReplacer(true);
var parseEachReplacerNonBlockParam = makeReplacer(false);

var EACH_REGEX = /(EACH[^\}]*)/g;

function parseEach(str, useBlockParams) {
  return str.replace(EACH_REGEX, useBlockParams ? parseEachReplacerBlockParam : parseEachReplacerNonBlockParam);
}

QUnit.module("#each new world - parseEach test helper");

QUnit.test("block param syntax substitution", function() {
  equal(parseEach("{{#EACH|people|p}}p people{{/EACH}}", true), "{{#each people as |p|}}p people{{/each}}");
  equal(parseEach("{{#EACH|people|p|a='b' c='d'}}p people{{/EACH}}", true), "{{#each people a='b' c='d' as |p|}}p people{{/each}}");
});

QUnit.test("non-block param syntax substitution", function() {
  equal(parseEach("{{#EACH|people|p}}p people{{/EACH}}", false), "{{#each p in people}}p people{{/each}}");
  equal(parseEach("{{#EACH|people|p|a='b' c='d'}}p people{{/EACH}}", false), "{{#each p in people a='b' c='d'}}p people{{/each}}");
});

function templateFor(templateString, useBlockParams) {
  return compile(parseEach(templateString, useBlockParams));
}

function assertText(view, expectedText) {
  equal(view.$().text(), expectedText);
}

function testEachWithItem(moduleName, useBlockParams) {
  QUnit.module(moduleName, {
    setup: function() {
      registry = new Registry();
      container = registry.container();

      registry.register('view:default', _MetamorphView);
      registry.register('view:toplevel', EmberView.extend());
    },
    teardown: function() {
      runDestroy(container);
      runDestroy(view);
      container = view = null;
    }
  });

  QUnit.test("#each accepts a name binding", function() {
    view = EmberView.create({
      template: templateFor("{{#EACH|view.items|item}}{{view.title}} {{item}}{{/each}}", useBlockParams),
      title: "My Cool Each Test",
      items: A([1, 2])
    });

    runAppend(view);

    equal(view.$().text(), "My Cool Each Test 1My Cool Each Test 2");
  });

  QUnit.test("#each accepts a name binding and does not change the context", function() {
    var controller = EmberController.create({
      name: 'bob the controller'
    });
    var obj = EmberObject.create({
      name: 'henry the item'
    });

    view = EmberView.create({
      template: templateFor("{{#EACH|view.items|item}}{{name}}{{/each}}", useBlockParams),
      title: "My Cool Each Test",
      items: A([obj]),
      controller: controller
    });

    runAppend(view);

    equal(view.$().text(), "bob the controller");
  });


  QUnit.test("#each accepts a name binding and can display child properties", function() {
    view = EmberView.create({
      template: templateFor("{{#EACH|view.items|item}}{{view.title}} {{item.name}}{{/each}}", useBlockParams),
      title: "My Cool Each Test",
      items: A([{ name: 1 }, { name: 2 }])
    });

    runAppend(view);

    equal(view.$().text(), "My Cool Each Test 1My Cool Each Test 2");
  });

  QUnit.test("#each accepts 'this' as the right hand side", function() {
    view = EmberView.create({
      template: templateFor("{{#EACH|this|item}}{{view.title}} {{item.name}}{{/each}}", useBlockParams),
      title: "My Cool Each Test",
      controller: A([{ name: 1 }, { name: 2 }])
    });

    runAppend(view);

    equal(view.$().text(), "My Cool Each Test 1My Cool Each Test 2");
  });

  if (!useBlockParams) {
    QUnit.test("views inside #each preserve the new context [DEPRECATED]", function() {
      var controller = A([{ name: "Adam" }, { name: "Steve" }]);

      view = EmberView.create({
        container: container,
        controller: controller,
        template: templateFor('{{#each controller}}{{#view}}{{name}}{{/view}}{{/each}}', useBlockParams)
      });

      expectDeprecation(function() {
        runAppend(view);
      }, 'Using the context switching form of {{each}} is deprecated. Please use the keyword form (`{{#each foo in bar}}`) instead.');

      equal(view.$().text(), "AdamSteve");
    });
  }

  QUnit.test("controller is assignable inside an #each", function() {
    var controller = ArrayController.create({
      model: A([{ name: "Adam" }, { name: "Steve" }])
    });

    view = EmberView.create({
      container: container,
      controller: controller,
      template: templateFor('{{#EACH|this|personController}}{{#view controllerBinding="personController"}}{{name}}{{/view}}{{/each}}', useBlockParams)
    });

    runAppend(view);

    equal(view.$().text(), "AdamSteve");
  });

  QUnit.test("it doesn't assert when the morph tags have the same parent", function() {
    view = EmberView.create({
      controller: A(['Cyril', 'David']),
      template: templateFor('<table><tbody>{{#EACH|this|name}}<tr><td>{{name}}</td></tr>{{/each}}</tbody></table>', useBlockParams)
    });

    runAppend(view);

    ok(true, "No assertion from valid template");
  });

  QUnit.test("itemController specified in template with name binding does not change context", function() {
    var Controller = EmberController.extend({
      controllerName: computed(function() {
        return "controller:"+this.get('model.name');
      })
    });

    registry = new Registry();
    container = registry.container();

    people = A([{ name: "Steve Holt" }, { name: "Annabelle" }]);

    var parentController = {
      container: container,
      people: people,
      controllerName: 'controller:parentController'
    };

    registry.register('controller:array', ArrayController.extend());

    view = EmberView.create({
      container: container,
      template: templateFor('{{#EACH|people|person|itemController="person"}}{{controllerName}} - {{person.controllerName}} - {{/each}}', useBlockParams),
      controller: parentController
    });

    registry.register('controller:person', Controller);

    runAppend(view);

    equal(view.$().text(), "controller:parentController - controller:Steve Holt - controller:parentController - controller:Annabelle - ");

    run(function() {
      people.pushObject({ name: "Yehuda Katz" });
    });

    assertText(view, "controller:parentController - controller:Steve Holt - controller:parentController - controller:Annabelle - controller:parentController - controller:Yehuda Katz - ");

    run(function() {
      set(parentController, 'people', A([{ name: "Trek Glowacki" }, { name: "Geoffrey Grosenbach" }]));
    });

    assertText(view, "controller:parentController - controller:Trek Glowacki - controller:parentController - controller:Geoffrey Grosenbach - ");

    strictEqual(view._childViews[0]._arrayController.get('target'), parentController, "the target property of the child controllers are set correctly");
  });

  QUnit.test("itemController specified in ArrayController with name binding does not change context", function() {
    people = A([{ name: "Steve Holt" }, { name: "Annabelle" }]);

    var PersonController = EmberController.extend({
          controllerName: computed(function() {
            return "controller:" + get(this, 'model.name') + ' of ' + get(this, 'parentController.company');
          })
        });
    var PeopleController = ArrayController.extend({
          model: people,
          itemController: 'person',
          company: 'Yapp',
          controllerName: 'controller:people'
        });
    registry = new Registry();
    container = registry.container();

    registry.register('controller:people', PeopleController);
    registry.register('controller:person', PersonController);

    view = EmberView.create({
      container: container,
      template: templateFor('{{#EACH|this|person}}{{controllerName}} - {{person.controllerName}} - {{/each}}', useBlockParams),
      controller: container.lookup('controller:people')
    });


    runAppend(view);

    equal(view.$().text(), "controller:people - controller:Steve Holt of Yapp - controller:people - controller:Annabelle of Yapp - ");
  });

  if (!useBlockParams) {
    QUnit.test("{{each}} without arguments [DEPRECATED]", function() {
      expect(2);

      view = EmberView.create({
        controller: A([{ name: "Adam" }, { name: "Steve" }]),
        template: templateFor('{{#each}}{{name}}{{/each}}', useBlockParams)
      });

      expectDeprecation(function() {
        runAppend(view);
      }, 'Using the context switching form of {{each}} is deprecated. Please use the keyword form (`{{#each foo in bar}}`) instead.');

      equal(view.$().text(), "AdamSteve");
    });

    QUnit.test("{{each this}} without keyword [DEPRECATED]", function() {
      expect(2);

      view = EmberView.create({
        controller: A([{ name: "Adam" }, { name: "Steve" }]),
        template: templateFor('{{#each this}}{{name}}{{/each}}', useBlockParams)
      });

      expectDeprecation(function() {
        runAppend(view);
      }, 'Using the context switching form of {{each}} is deprecated. Please use the keyword form (`{{#each foo in bar}}`) instead.');

      equal(view.$().text(), "AdamSteve");
    });
  }

  if (useBlockParams) {
    if (Ember.FEATURES.isEnabled('ember-htmlbars-each-with-index')) {
      QUnit.test("the index is passed as the second parameter to #each blocks", function() {
        expect(3);

        var adam = { name: "Adam" };
        view = EmberView.create({
          controller: A([adam, { name: "Steve" }]),
          template: templateFor('{{#each this as |person index|}}{{index}}. {{person.name}}{{/each}}', true)
        });
        runAppend(view);
        equal(view.$().text(), "0. Adam1. Steve");

        run(function() {
          view.get('controller').unshiftObject({ name: "Bob" });
        });
        equal(view.$().text(), "0. Bob1. Adam2. Steve");

        run(function() {
          view.get('controller').removeObject(adam);
        });
        equal(view.$().text(), "0. Bob1. Steve");
      });
    }
  }
}

testEachWithItem("new world - {{#each bar as |foo|}}", true);

