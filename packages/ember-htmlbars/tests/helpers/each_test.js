/*globals EmberDev */
/*jshint newcap:false*/
import Ember from "ember-metal/core"; // Ember.lookup;
import EmberObject from "ember-runtime/system/object";
import run from "ember-metal/run_loop";
import EmberView from "ember-views/views/view";
import _MetamorphView from "ember-views/views/metamorph_view";
import { computed } from "ember-metal/computed";
import ArrayController from "ember-runtime/controllers/array_controller";
import { A } from "ember-runtime/system/native_array";
import EmberController from "ember-runtime/controllers/controller";
import ObjectController from "ember-runtime/controllers/object_controller";
import { Registry } from "ember-runtime/system/container";

import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

import compile from "ember-template-compiler/system/compile";

var people, view, registry, container;
var template, templateMyView, MyView, MyEmptyView, templateMyEmptyView;

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

QUnit.module("parseEach test helper");

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

var originalLookup = Ember.lookup;
var lookup;

QUnit.module("the #each helper [DEPRECATED]", {
  setup() {
    Ember.lookup = lookup = { Ember: Ember };

    template = templateFor("{{#each view.people}}{{name}}{{/each}}");
    people = A([{ name: "Steve Holt" }, { name: "Annabelle" }]);

    registry = new Registry();
    container = registry.container();

    registry.register('view:default', _MetamorphView);
    registry.register('view:toplevel', EmberView.extend());

    view = EmberView.create({
      container: container,
      template: template,
      people: people
    });

    templateMyView = templateFor("{{name}}");
    lookup.MyView = MyView = EmberView.extend({
      template: templateMyView
    });

    templateMyEmptyView = templateFor("I'm empty");
    lookup.MyEmptyView = MyEmptyView = EmberView.extend({
      template: templateMyEmptyView
    });

    expectDeprecation(function() {
      runAppend(view);
    }, 'Using the context switching form of {{each}} is deprecated. Please use the block param form (`{{#each bar as |foo|}}`) instead.');
  },

  teardown() {
    runDestroy(container);
    runDestroy(view);
    registry = container = view = null;

    Ember.lookup = originalLookup;
  }
});

var assertHTML = function(view, expectedHTML) {
  var html = view.$().html();

  // IE 8 (and prior?) adds the \r\n
  html = html.replace(/<script[^>]*><\/script>/ig, '').replace(/[\r\n]/g, '');

  equal(html, expectedHTML);
};

var assertText = function(view, expectedText) {
  equal(view.$().text(), expectedText);
};

QUnit.test("it renders the template for each item in an array", function() {
  assertHTML(view, "Steve HoltAnnabelle");
});

QUnit.test("it updates the view if an item is added", function() {
  run(function() {
    people.pushObject({ name: "Tom Dale" });
  });

  assertHTML(view, "Steve HoltAnnabelleTom Dale");
});

if (typeof Handlebars === "object") {
  QUnit.test("should be able to use standard Handlebars #each helper", function() {
    runDestroy(view);

    view = EmberView.create({
      context: { items: ['a', 'b', 'c'] },
      template: Handlebars.compile("{{#each items}}{{this}}{{/each}}")
    });

    runAppend(view);

    equal(view.$().html(), "abc");
  });
}

QUnit.test("it allows you to access the current context using {{this}}", function() {
  runDestroy(view);

  view = EmberView.create({
    template: templateFor("{{#each view.people}}{{this}}{{/each}}"),
    people: A(['Black Francis', 'Joey Santiago', 'Kim Deal', 'David Lovering'])
  });

  runAppend(view);

  assertHTML(view, "Black FrancisJoey SantiagoKim DealDavid Lovering");
});

QUnit.test("it updates the view if an item is removed", function() {
  run(function() {
    people.removeAt(0);
  });

  assertHTML(view, "Annabelle");
});

QUnit.test("it updates the view if an item is replaced", function() {
  run(function() {
    people.removeAt(0);
    people.insertAt(0, { name: "Kazuki" });
  });

  assertHTML(view, "KazukiAnnabelle");
});

QUnit.test("can add and replace in the same runloop", function() {
  run(function() {
    people.pushObject({ name: "Tom Dale" });
    people.removeAt(0);
    people.insertAt(0, { name: "Kazuki" });
  });

  assertHTML(view, "KazukiAnnabelleTom Dale");
});

QUnit.test("can add and replace the object before the add in the same runloop", function() {
  run(function() {
    people.pushObject({ name: "Tom Dale" });
    people.removeAt(1);
    people.insertAt(1, { name: "Kazuki" });
  });

  assertHTML(view, "Steve HoltKazukiTom Dale");
});

QUnit.test("can add and replace complicatedly", function() {
  run(function() {
    people.pushObject({ name: "Tom Dale" });
    people.removeAt(1);
    people.insertAt(1, { name: "Kazuki" });
    people.pushObject({ name: "Firestone" });
    people.pushObject({ name: "McMunch" });
    people.removeAt(3);
  });

  assertHTML(view, "Steve HoltKazukiTom DaleMcMunch");
});

QUnit.test("can add and replace complicatedly harder", function() {
  run(function() {
    people.pushObject({ name: "Tom Dale" });
    people.removeAt(1);
    people.insertAt(1, { name: "Kazuki" });
    people.pushObject({ name: "Firestone" });
    people.pushObject({ name: "McMunch" });
    people.removeAt(2);
  });

  assertHTML(view, "Steve HoltKazukiFirestoneMcMunch");
});

QUnit.test("it does not mark each option tag as selected", function() {
  var selectView = EmberView.create({
    template: templateFor('<select id="people-select"><option value="">Please select a name</option>{{#each view.people}}<option {{bind-attr value=name}}>{{name}}</option>{{/each}}</select>'),
    people: people
  });

  runAppend(selectView);

  equal(selectView.$('option').length, 3, "renders 3 <option> elements");

  equal(selectView.$().find(':selected').text(), 'Please select a name', 'first option is selected');

  run(function() {
    people.pushObject({ name: "Black Francis" });
  });

  equal(selectView.$().find(':selected').text(), 'Please select a name', 'first option is selected');

  equal(selectView.$('option').length, 4, "renders an additional <option> element when an object is added");

  runDestroy(selectView);
});

QUnit.test("View should not use keyword incorrectly - Issue #1315", function() {
  runDestroy(view);

  view = EmberView.create({
    container: container,
    template: templateFor('{{#each value in view.content}}{{value}}-{{#each option in view.options}}{{option.value}}:{{option.label}} {{/each}}{{/each}}'),

    content: A(['X', 'Y']),
    options: A([
      { label: 'One', value: 1 },
      { label: 'Two', value: 2 }
    ])
  });

  runAppend(view);

  equal(view.$().text(), 'X-1:One 2:Two Y-1:One 2:Two ');
});

if (EmberDev && !EmberDev.runningProdBuild) {
  if (Ember.EXTEND_PROTOTYPES) {
    QUnit.test("it should not give ye olde assertion error", function() {
      var goodView = EmberView.create({
        template: templateFor('<div>{{#each host in view.funnyHosts}}<span>{{host}}</span>{{/each}}</div>'),
        funnyHosts: ["Conan O'Brien", "Jimmy Kimmel", "David Letterman"]
      });

      runAppend(goodView);

      equal(goodView.$('span').length, 3, "renders two <span> elements");

      runDestroy(goodView);
    });
  } else {
    QUnit.test("it should give the proper assertion error - Issue #3734 from ember-cli", function() {
      var badView = EmberView.create({
        template: templateFor('<div>{{#each host in view.unfunnyHosts}}<span>{{host}}</span>{{/each}}</div>'),
        unfunnyHosts: ["Jimmy Fallon"]
      });

      expectAssertion(function() {
        runAppend(badView);
      }, /and you forgot to wrap your array in Ember\.A/);
      runDestroy(badView);
    });
  }
}

QUnit.test("it works inside a ul element", function() {
  var ulView = EmberView.create({
    template: templateFor('<ul>{{#each view.people}}<li>{{name}}</li>{{/each}}</ul>'),
    people: people
  });

  runAppend(ulView);

  equal(ulView.$('li').length, 2, "renders two <li> elements");

  run(function() {
    people.pushObject({ name: "Black Francis" });
  });

  equal(ulView.$('li').length, 3, "renders an additional <li> element when an object is added");

  runDestroy(ulView);
});

QUnit.test("it works inside a table element", function() {
  var tableView = EmberView.create({
    template: templateFor('<table><tbody>{{#each view.people}}<tr><td>{{name}}</td></tr>{{/each}}</tbody></table>'),
    people: people
  });

  runAppend(tableView);

  equal(tableView.$('td').length, 2, "renders two <td> elements");

  run(function() {
    people.pushObject({ name: "Black Francis" });
  });

  equal(tableView.$('td').length, 3, "renders an additional <td> element when an object is added");

  run(function() {
    people.insertAt(0, { name: "Kim Deal" });
  });

  equal(tableView.$('td').length, 4, "renders an additional <td> when an object is inserted at the beginning of the array");

  runDestroy(tableView);
});

QUnit.test("it supports itemController", function() {
  var Controller = EmberController.extend({
    controllerName: computed(function() {
      return "controller:"+this.get('model.name');
    })
  });

  runDestroy(view);

  var parentController = {
    container: container
  };

  registry.register('controller:array', ArrayController.extend());

  view = EmberView.create({
    container: container,
    template: templateFor('{{#each view.people itemController="person"}}{{controllerName}}{{/each}}'),
    people: people,
    controller: parentController
  });

  registry.register('controller:person', Controller);

  runAppend(view);

  equal(view.$().text(), "controller:Steve Holtcontroller:Annabelle");

  run(function() {
    view.rerender();
  });

  assertText(view, "controller:Steve Holtcontroller:Annabelle");

  run(function() {
    people.pushObject({ name: "Yehuda Katz" });
  });

  assertText(view, "controller:Steve Holtcontroller:Annabellecontroller:Yehuda Katz");

  run(function() {
    set(view, 'people', A([{ name: "Trek Glowacki" }, { name: "Geoffrey Grosenbach" }]));
  });

  assertText(view, "controller:Trek Glowackicontroller:Geoffrey Grosenbach");

  strictEqual(view._childViews[0]._arrayController.get('target'), parentController, "the target property of the child controllers are set correctly");
});

QUnit.test("itemController specified in template gets a parentController property", function() {
  // using an ObjectController for this test to verify that parentController does accidentally get set
  // on the proxied model.
  var Controller = ObjectController.extend({
        controllerName: computed(function() {
          return "controller:" + get(this, 'model.name') + ' of ' + get(this, 'parentController.company');
        })
      });
  var parentController = {
        container: container,
        company: 'Yapp'
      };

  registry.register('controller:array', ArrayController.extend());
  runDestroy(view);

  view = EmberView.create({
    container: container,
    template: templateFor('{{#each view.people itemController="person"}}{{controllerName}}{{/each}}'),
    people: people,
    controller: parentController
  });

  registry.register('controller:person', Controller);

  runAppend(view);

  equal(view.$().text(), "controller:Steve Holt of Yappcontroller:Annabelle of Yapp");
});

QUnit.test("itemController specified in ArrayController gets a parentController property", function() {
  var PersonController = ObjectController.extend({
        controllerName: computed(function() {
          return "controller:" + get(this, 'model.name') + ' of ' + get(this, 'parentController.company');
        })
      });
  var PeopleController = ArrayController.extend({
        model: people,
        itemController: 'person',
        company: 'Yapp'
      });

  registry.register('controller:people', PeopleController);
  registry.register('controller:person', PersonController);
  runDestroy(view);

  view = EmberView.create({
    container: container,
    template: templateFor('{{#each}}{{controllerName}}{{/each}}'),
    controller: container.lookup('controller:people')
  });


  runAppend(view);

  equal(view.$().text(), "controller:Steve Holt of Yappcontroller:Annabelle of Yapp");
});

QUnit.test("itemController's parentController property, when the ArrayController has a parentController", function() {
  var PersonController = ObjectController.extend({
        controllerName: computed(function() {
          return "controller:" + get(this, 'model.name') + ' of ' + get(this, 'parentController.company');
        })
      });
  var PeopleController = ArrayController.extend({
        model: people,
        itemController: 'person',
        parentController: computed(function() {
          return this.container.lookup('controller:company');
        }),
        company: 'Yapp'
      });
  var CompanyController = EmberController.extend();

  registry.register('controller:company', CompanyController);
  registry.register('controller:people', PeopleController);
  registry.register('controller:person', PersonController);

  runDestroy(view);
  view = EmberView.create({
    container: container,
    template: templateFor('{{#each}}{{controllerName}}{{/each}}'),
    controller: container.lookup('controller:people')
  });


  runAppend(view);

  equal(view.$().text(), "controller:Steve Holt of Yappcontroller:Annabelle of Yapp");
});

QUnit.test("it supports itemController when using a custom keyword", function() {
  var Controller = EmberController.extend({
    controllerName: computed(function() {
      return "controller:"+this.get('model.name');
    })
  });

  registry.register('controller:array', ArrayController.extend());

  runDestroy(view);
  view = EmberView.create({
    container: container,
    template: templateFor('{{#each person in view.people itemController="person"}}{{person.controllerName}}{{/each}}'),
    people: people,
    controller: {
      container: container
    }
  });

  registry.register('controller:person', Controller);

  runAppend(view);

  equal(view.$().text(), "controller:Steve Holtcontroller:Annabelle");

  run(function() {
    view.rerender();
  });

  equal(view.$().text(), "controller:Steve Holtcontroller:Annabelle");
});

QUnit.test("it supports {{itemView=}}", function() {
  var itemView = EmberView.extend({
    template: templateFor('itemView:{{name}}')
  });

  runDestroy(view);
  view = EmberView.create({
    template: templateFor('{{each view.people itemView="anItemView"}}'),
    people: people,
    container: container
  });

  registry.register('view:anItemView', itemView);

  runAppend(view);

  assertText(view, "itemView:Steve HoltitemView:Annabelle");
});


QUnit.test("it defers all normalization of itemView names to the resolver", function() {
  var itemView = EmberView.extend({
    template: templateFor('itemView:{{name}}')
  });

  runDestroy(view);
  view = EmberView.create({
    template: templateFor('{{each view.people itemView="an-item-view"}}'),
    people: people,
    container: container
  });

  registry.register('view:an-item-view', itemView);
  registry.resolve = function(fullname) {
    equal(fullname, "view:an-item-view", "leaves fullname untouched");
    return Registry.prototype.resolve.call(this, fullname);
  };
  runAppend(view);

});

QUnit.test("it supports {{itemViewClass=}} with global (DEPRECATED)", function() {
  runDestroy(view);
  view = EmberView.create({
    template: templateFor('{{each view.people itemViewClass=MyView}}'),
    people: people
  });

  var deprecation = /Global lookup of MyView from a Handlebars template is deprecated/;

  expectDeprecation(function() {
    runAppend(view);
  }, deprecation);

  assertText(view, "Steve HoltAnnabelle");
});

QUnit.test("it supports {{itemViewClass=}} via container", function() {
  runDestroy(view);
  view = EmberView.create({
    container: {
      lookupFactory(name) {
        equal(name, 'view:my-view');
        return MyView;
      }
    },
    template: templateFor('{{each view.people itemViewClass="my-view"}}'),
    people: people
  });

  runAppend(view);

  assertText(view, "Steve HoltAnnabelle");
});

QUnit.test("it supports {{itemViewClass=}} with tagName (DEPRECATED)", function() {
  runDestroy(view);
  view = EmberView.create({
    template: templateFor('{{each view.people itemViewClass=MyView tagName="ul"}}'),
    people: people
  });

  expectDeprecation(/Supplying a tagName to Metamorph views is unreliable and is deprecated./);

  runAppend(view);
  equal(view.$('ul').length, 1, 'rendered ul tag');
  equal(view.$('ul li').length, 2, 'rendered 2 li tags');
  equal(view.$('ul li').text(), 'Steve HoltAnnabelle');
});

QUnit.test("it supports {{itemViewClass=}} with in format", function() {

  MyView = EmberView.extend({
    template: templateFor("{{person.name}}")
  });

  runDestroy(view);
  view = EmberView.create({
    container: {
      lookupFactory(name) {
        return MyView;
      }
    },
    template: templateFor('{{each person in view.people itemViewClass="myView"}}'),
    people: people
  });

  runAppend(view);

  assertText(view, "Steve HoltAnnabelle");

});

QUnit.test("it supports {{emptyView=}}", function() {
  var emptyView = EmberView.extend({
    template: templateFor('emptyView:sad panda')
  });

  runDestroy(view);

  view = EmberView.create({
    template: templateFor('{{each view.people emptyView="anEmptyView"}}'),
    people: A(),
    container: container
  });

  registry.register('view:anEmptyView', emptyView);

  runAppend(view);

  assertText(view, "emptyView:sad panda");
});

QUnit.test("it defers all normalization of emptyView names to the resolver", function() {
  var emptyView = EmberView.extend({
    template: templateFor('emptyView:sad panda')
  });

  runDestroy(view);

  view = EmberView.create({
    template: templateFor('{{each view.people emptyView="an-empty-view"}}'),
    people: A(),
    container: container
  });

  registry.register('view:an-empty-view', emptyView);

  registry.resolve = function(fullname) {
    equal(fullname, "view:an-empty-view", "leaves fullname untouched");
    return Registry.prototype.resolve.call(this, fullname);
  };

  runAppend(view);
});

QUnit.test("it supports {{emptyViewClass=}} with global (DEPRECATED)", function() {
  runDestroy(view);

  view = EmberView.create({
    template: templateFor('{{each view.people emptyViewClass=MyEmptyView}}'),
    people: A()
  });

  var deprecation = /Global lookup of MyEmptyView from a Handlebars template is deprecated/;

  expectDeprecation(function() {
    runAppend(view);
  }, deprecation);

  assertText(view, "I'm empty");
});

QUnit.test("it supports {{emptyViewClass=}} via container", function() {
  runDestroy(view);

  view = EmberView.create({
    container: {
      lookupFactory(name) {
        equal(name, 'view:my-empty-view');
        return MyEmptyView;
      }
    },
    template: templateFor('{{each view.people emptyViewClass="my-empty-view"}}'),
    people: A()
  });

  runAppend(view);

  assertText(view, "I'm empty");
});

QUnit.test("it supports {{emptyViewClass=}} with tagName (DEPRECATED)", function() {
  runDestroy(view);

  view = EmberView.create({
    template: templateFor('{{each view.people emptyViewClass=MyEmptyView tagName="b"}}'),
    people: A()
  });

  expectDeprecation(/Supplying a tagName to Metamorph views is unreliable and is deprecated./);

  runAppend(view);

  equal(view.$('b').length, 1, 'rendered b tag');
  equal(view.$('b').text(), "I'm empty");
});

QUnit.test("it supports {{emptyViewClass=}} with in format", function() {
  runDestroy(view);

  view = EmberView.create({
    container: {
      lookupFactory(name) {
        return MyEmptyView;
      }
    },
    template: templateFor('{{each person in view.people emptyViewClass="myEmptyView"}}'),
    people: A()
  });

  runAppend(view);

  assertText(view, "I'm empty");
});

QUnit.test("it supports {{else}}", function() {
  runDestroy(view);
  view = EmberView.create({
    template: templateFor("{{#each view.items}}{{this}}{{else}}Nothing{{/each}}"),
    items: A(['one', 'two'])
  });

  runAppend(view);

  assertHTML(view, "onetwo");

  run(function() {
    view.set('items', A());
  });

  assertHTML(view, "Nothing");
});

QUnit.test("it works with the controller keyword", function() {
  runDestroy(view);

  var controller = ArrayController.create({
    model: A(["foo", "bar", "baz"])
  });

  runDestroy(view);
  view = EmberView.create({
    container: container,
    controller: controller,
    template: templateFor("{{#view}}{{#each controller}}{{this}}{{/each}}{{/view}}")
  });

  runAppend(view);

  equal(view.$().text(), "foobarbaz");
});

QUnit.test("views inside #each preserve the new context [DEPRECATED]", function() {
  runDestroy(view);

  var controller = A([{ name: "Adam" }, { name: "Steve" }]);

  view = EmberView.create({
    container: container,
    controller: controller,
    template: templateFor('{{#each controller}}{{#view}}{{name}}{{/view}}{{/each}}')
  });


  expectDeprecation(function() {
    runAppend(view);
  }, 'Using the context switching form of {{each}} is deprecated. Please use the block param form (`{{#each bar as |foo|}}`) instead.');

  equal(view.$().text(), "AdamSteve");
});

QUnit.test("single-arg each defaults to current context [DEPRECATED]", function() {
  runDestroy(view);

  view = EmberView.create({
    context: A([{ name: "Adam" }, { name: "Steve" }]),
    template: templateFor('{{#each}}{{name}}{{/each}}')
  });

  expectDeprecation(function() {
    runAppend(view);
  }, 'Using the context switching form of {{each}} is deprecated. Please use the block param form (`{{#each bar as |foo|}}`) instead.');

  equal(view.$().text(), "AdamSteve");
});

QUnit.test("single-arg each will iterate over controller if present [DEPRECATED]", function() {
  runDestroy(view);

  view = EmberView.create({
    controller: A([{ name: "Adam" }, { name: "Steve" }]),
    template: templateFor('{{#each}}{{name}}{{/each}}')
  });

  expectDeprecation(function() {
    runAppend(view);
  }, 'Using the context switching form of {{each}} is deprecated. Please use the block param form (`{{#each bar as |foo|}}`) instead.');

  equal(view.$().text(), "AdamSteve");
});

function testEachWithItem(moduleName, useBlockParams) {
  QUnit.module(moduleName, {
    setup() {
      registry = new Registry();
      container = registry.container();

      registry.register('view:default', _MetamorphView);
      registry.register('view:toplevel', EmberView.extend());
    },
    teardown() {
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
      }, 'Using the context switching form of {{each}} is deprecated. Please use the block param form (`{{#each bar as |foo|}}`) instead.');

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
      template: templateFor('{{#EACH|this|personController}}{{#view controller=personController}}{{name}}{{/view}}{{/each}}', useBlockParams)
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
      }, 'Using the context switching form of {{each}} is deprecated. Please use the block param form (`{{#each bar as |foo|}}`) instead.');

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
      }, 'Using the context switching form of {{each}} is deprecated. Please use the block param form (`{{#each bar as |foo|}}`) instead.');

      equal(view.$().text(), "AdamSteve");
    });
  }

  if (useBlockParams) {
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

testEachWithItem("{{#each foo in bar}}", false);
testEachWithItem("{{#each bar as |foo|}}", true);
