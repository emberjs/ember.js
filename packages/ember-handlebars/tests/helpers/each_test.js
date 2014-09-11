/*jshint newcap:false*/
import Ember from "ember-metal/core"; // Ember.lookup;
import EmberObject from "ember-runtime/system/object";
import run from "ember-metal/run_loop";
import EmberView from "ember-views/views/view";
import _MetamorphView from "ember-handlebars/views/metamorph_view";
import { computed } from "ember-metal/computed";
import ArrayController from "ember-runtime/controllers/array_controller";
import EmberHandlebars from "ember-handlebars-compiler";
// import {expectAssertion} from "ember-metal/tests/debug_helpers";
import { A } from "ember-runtime/system/native_array";
import EmberController from "ember-runtime/controllers/controller";
import ObjectController from "ember-runtime/controllers/object_controller";
import Container from "ember-runtime/system/container";

import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";

var people, view, container;
var template, templateMyView, MyView;

function templateFor(template) {
  return EmberHandlebars.compile(template);
}

var originalLookup = Ember.lookup;
var lookup;

QUnit.module("the #each helper", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };

    template = templateFor("{{#each view.people}}{{name}}{{/each}}");
    people = A([{ name: "Steve Holt" }, { name: "Annabelle" }]);

    container = new Container();
    container.register('view:default', _MetamorphView);
    container.register('view:toplevel', EmberView.extend());

    view = EmberView.create({
      container: container,
      template: template,
      people: people
    });

    templateMyView = templateFor("{{name}}");
    lookup.MyView = MyView = EmberView.extend({
      template: templateMyView
    });

    append(view);
  },

  teardown: function() {
    run(function() {
        if (container) {
          container.destroy();
        }
        if (view) {
          view.destroy();
        }
        container = view = null;
    });
    Ember.lookup = originalLookup;
  }
});


var append = function(view) {
  run(function() {
    view.appendTo('#qunit-fixture');
  });
};

var assertHTML = function(view, expectedHTML) {
  var html = view.$().html();

  // IE 8 (and prior?) adds the \r\n
  html = html.replace(/<script[^>]*><\/script>/ig, '').replace(/[\r\n]/g, '');

  equal(html, expectedHTML);
};

var assertText = function(view, expectedText) {
  equal(view.$().text(), expectedText);
};

test("it renders the template for each item in an array", function() {
  assertHTML(view, "Steve HoltAnnabelle");
});

test("it updates the view if an item is added", function() {
  run(function() {
    people.pushObject({ name: "Tom Dale" });
  });

  assertHTML(view, "Steve HoltAnnabelleTom Dale");
});

test("it allows you to access the current context using {{this}}", function() {
  run(function() { view.destroy(); }); // destroy existing view
  view = EmberView.create({
    template: templateFor("{{#each view.people}}{{this}}{{/each}}"),
    people: A(['Black Francis', 'Joey Santiago', 'Kim Deal', 'David Lovering'])
  });

  append(view);

  assertHTML(view, "Black FrancisJoey SantiagoKim DealDavid Lovering");
});

test("it updates the view if an item is removed", function() {
  run(function() {
    people.removeAt(0);
  });

  assertHTML(view, "Annabelle");
});

test("it updates the view if an item is replaced", function() {
  run(function() {
    people.removeAt(0);
    people.insertAt(0, { name: "Kazuki" });
  });

  assertHTML(view, "KazukiAnnabelle");
});

test("can add and replace in the same runloop", function() {
  run(function() {
    people.pushObject({ name: "Tom Dale" });
    people.removeAt(0);
    people.insertAt(0, { name: "Kazuki" });
  });

  assertHTML(view, "KazukiAnnabelleTom Dale");
});

test("can add and replace the object before the add in the same runloop", function() {
  run(function() {
    people.pushObject({ name: "Tom Dale" });
    people.removeAt(1);
    people.insertAt(1, { name: "Kazuki" });
  });

  assertHTML(view, "Steve HoltKazukiTom Dale");
});

test("can add and replace complicatedly", function() {
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

test("can add and replace complicatedly harder", function() {
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

test("it works inside a ul element", function() {
  var ulView = EmberView.create({
    template: templateFor('<ul>{{#each view.people}}<li>{{name}}</li>{{/each}}</ul>'),
    people: people
  });

  append(ulView);

  equal(ulView.$('li').length, 2, "renders two <li> elements");

  run(function() {
    people.pushObject({name: "Black Francis"});
  });

  equal(ulView.$('li').length, 3, "renders an additional <li> element when an object is added");

  run(function() {
    ulView.destroy();
  });
});

test("it works inside a table element", function() {
  var tableView = EmberView.create({
    template: templateFor('<table><tbody>{{#each view.people}}<tr><td>{{name}}</td></tr>{{/each}}</tbody></table>'),
    people: people
  });

  append(tableView);

  equal(tableView.$('td').length, 2, "renders two <td> elements");

  run(function() {
    people.pushObject({name: "Black Francis"});
  });

  equal(tableView.$('td').length, 3, "renders an additional <td> element when an object is added");

  run(function() {
    people.insertAt(0, {name: "Kim Deal"});
  });

  equal(tableView.$('td').length, 4, "renders an additional <td> when an object is inserted at the beginning of the array");

  run(function() {
    tableView.destroy();
  });
});

test("it supports itemController", function() {
  var Controller = EmberController.extend({
    controllerName: computed(function() {
      return "controller:"+this.get('model.name');
    })
  });

  run(function() { view.destroy(); }); // destroy existing view

  var parentController = {
    container: container
  };

  container.register('controller:array', ArrayController.extend());

  view = EmberView.create({
    container: container,
    template: templateFor('{{#each view.people itemController="person"}}{{controllerName}}{{/each}}'),
    people: people,
    controller: parentController
  });

  container.register('controller:person', Controller);

  append(view);

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

  strictEqual(view.get('_childViews')[0].get('_arrayController.target'), parentController, "the target property of the child controllers are set correctly");
});

test("itemController specified in template gets a parentController property", function() {
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

  container.register('controller:array', ArrayController.extend());
  run(function() { view.destroy(); }); // destroy existing view

  view = EmberView.create({
    container: container,
    template: templateFor('{{#each view.people itemController="person"}}{{controllerName}}{{/each}}'),
    people: people,
    controller: parentController
  });

  container.register('controller:person', Controller);

  append(view);

  equal(view.$().text(), "controller:Steve Holt of Yappcontroller:Annabelle of Yapp");
});

test("itemController specified in ArrayController gets a parentController property", function() {
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

  container.register('controller:people', PeopleController);
  container.register('controller:person', PersonController);
  run(function() { view.destroy(); }); // destroy existing view

  view = EmberView.create({
    container: container,
    template: templateFor('{{#each}}{{controllerName}}{{/each}}'),
    controller: container.lookup('controller:people')
  });


  append(view);

  equal(view.$().text(), "controller:Steve Holt of Yappcontroller:Annabelle of Yapp");
});

test("itemController's parentController property, when the ArrayController has a parentController", function() {
  var PersonController = ObjectController.extend({
        controllerName: computed(function() {
          return "controller:" + get(this, 'model.name') + ' of ' + get(this, 'parentController.company');
        })
      });
  var PeopleController = ArrayController.extend({
        model: people,
        itemController: 'person',
        parentController: computed(function(){
          return this.container.lookup('controller:company');
        }),
        company: 'Yapp'
      });
   var CompanyController = EmberController.extend();

  container.register('controller:company', CompanyController);
  container.register('controller:people', PeopleController);
  container.register('controller:person', PersonController);

  run(function() { view.destroy(); }); // destroy existing view
  view = EmberView.create({
    container: container,
    template: templateFor('{{#each}}{{controllerName}}{{/each}}'),
    controller: container.lookup('controller:people')
  });


  append(view);

  equal(view.$().text(), "controller:Steve Holt of Yappcontroller:Annabelle of Yapp");
});

test("it supports itemController when using a custom keyword", function() {
  var Controller = EmberController.extend({
    controllerName: computed(function() {
      return "controller:"+this.get('model.name');
    })
  });

  container.register('controller:array', ArrayController.extend());

  run(function() { view.destroy(); }); // destroy existing view
  view = EmberView.create({
    container: container,
    template: templateFor('{{#each person in view.people itemController="person"}}{{person.controllerName}}{{/each}}'),
    people: people,
    controller: {
      container: container
    }
  });

  container.register('controller:person', Controller);

  append(view);

  equal(view.$().text(), "controller:Steve Holtcontroller:Annabelle");

  run(function() {
    view.rerender();
  });

  equal(view.$().text(), "controller:Steve Holtcontroller:Annabelle");
});

test("it supports {{itemView=}}", function() {
  var itemView = EmberView.extend({
    template: templateFor('itemView:{{name}}')
  });

  run(function() { view.destroy(); }); // destroy existing view
  view = EmberView.create({
    template: templateFor('{{each view.people itemView="anItemView"}}'),
    people: people,
    controller: {
      container: container
    }
  });

  container.register('view:anItemView', itemView);

  append(view);

  assertText(view, "itemView:Steve HoltitemView:Annabelle");
});


test("it defers all normalization of itemView names to the resolver", function() {
  var itemView = EmberView.extend({
    template: templateFor('itemView:{{name}}')
  });

  run(function() { view.destroy(); }); // destroy existing view
  view = EmberView.create({
    template: templateFor('{{each view.people itemView="an-item-view"}}'),
    people: people,
    controller: {
      container: container
    }
  });

  container.register('view:an-item-view', itemView);
  container.resolve = function(fullname) {
    equal(fullname, "view:an-item-view", "leaves fullname untouched");
    return Container.prototype.resolve.call(this, fullname);
  };
  append(view);

});

test("it supports {{itemViewClass=}} with global (DEPRECATED)", function() {
  run(function() { view.destroy(); }); // destroy existing view
  view = EmberView.create({
    template: templateFor('{{each view.people itemViewClass="MyView"}}'),
    people: people
  });


  expectDeprecation(function(){
    append(view);
  }, /Resolved the view "MyView" on the global context/);

  assertText(view, "Steve HoltAnnabelle");
});

test("it supports {{itemViewClass=}} via container", function() {
  run(function() { view.destroy(); }); // destroy existing view
  view = EmberView.create({
    container: {
      lookupFactory: function(name){
        equal(name, 'view:my-view');
        return MyView;
      }
    },
    template: templateFor('{{each view.people itemViewClass="my-view"}}'),
    people: people
  });

  append(view);

  assertText(view, "Steve HoltAnnabelle");
});

test("it supports {{itemViewClass=}} with tagName (DEPRECATED)", function() {
  run(function() { view.destroy(); }); // destroy existing view
  view = EmberView.create({
      template: templateFor('{{each view.people itemViewClass="MyView" tagName="ul"}}'),
      people: people
  });

  expectDeprecation(/Supplying a tagName to Metamorph views is unreliable and is deprecated./);

  append(view);
  equal(view.$('ul').length, 1, 'rendered ul tag');
  equal(view.$('ul li').length, 2, 'rendered 2 li tags');
  equal(view.$('ul li').text(), 'Steve HoltAnnabelle');
});

test("it supports {{itemViewClass=}} with in format", function() {

  MyView = EmberView.extend({
    template: templateFor("{{person.name}}")
  });

  run(function() { view.destroy(); }); // destroy existing view
  view = EmberView.create({
    container: {
      lookupFactory: function(name){
        return MyView;
      }
    },
    template: templateFor('{{each person in view.people itemViewClass="myView"}}'),
    people: people
  });

  append(view);

  assertText(view, "Steve HoltAnnabelle");

});

test("it supports {{else}}", function() {
  run(function() { view.destroy(); }); // destroy existing view
  view = EmberView.create({
    template: templateFor("{{#each view.items}}{{this}}{{else}}Nothing{{/each}}"),
    items: A(['one', 'two'])
  });

  append(view);

  assertHTML(view, "onetwo");

  run(function() {
    view.set('items', A());
  });

  assertHTML(view, "Nothing");
});

test("it works with the controller keyword", function() {
  var controller = ArrayController.create({
    model: A(["foo", "bar", "baz"])
  });

  run(function() { view.destroy(); }); // destroy existing view
  view = EmberView.create({
    container: container,
    controller: controller,
    template: templateFor("{{#view}}{{#each controller}}{{this}}{{/each}}{{/view}}")
  });

  append(view);

  equal(view.$().text(), "foobarbaz");
});

QUnit.module("{{#each foo in bar}}", {
  setup: function() {
    container = new Container();
    container.register('view:default', _MetamorphView);
    container.register('view:toplevel', EmberView.extend());
  },
  teardown: function() {
    run(function() {
        if (container) {
          container.destroy();
        }
        if (view) {
          view.destroy();
        }
        container = view = null;
    });
  }
});

test("#each accepts a name binding", function() {
  view = EmberView.create({
    template: templateFor("{{#each item in view.items}}{{view.title}} {{item}}{{/each}}"),
    title: "My Cool Each Test",
    items: A([1, 2])
  });

  append(view);

  equal(view.$().text(), "My Cool Each Test 1My Cool Each Test 2");
});

test("#each accepts a name binding and does not change the context", function() {
  var controller = EmberController.create({
    name: 'bob the controller'
  });
  var obj = EmberObject.create({
    name: 'henry the item'
  });

  view = EmberView.create({
    template: templateFor("{{#each item in view.items}}{{name}}{{/each}}"),
    title: "My Cool Each Test",
    items: A([obj]),
    controller: controller
  });

  append(view);

  equal(view.$().text(), "bob the controller");
});


test("#each accepts a name binding and can display child properties", function() {
  view = EmberView.create({
    template: templateFor("{{#each item in view.items}}{{view.title}} {{item.name}}{{/each}}"),
    title: "My Cool Each Test",
    items: A([{ name: 1 }, { name: 2 }])
  });

  append(view);

  equal(view.$().text(), "My Cool Each Test 1My Cool Each Test 2");
});

test("#each accepts 'this' as the right hand side", function() {
  view = EmberView.create({
    template: templateFor("{{#each item in this}}{{view.title}} {{item.name}}{{/each}}"),
    title: "My Cool Each Test",
    controller: A([{ name: 1 }, { name: 2 }])
  });

  append(view);

  equal(view.$().text(), "My Cool Each Test 1My Cool Each Test 2");
});

test("views inside #each preserve the new context", function() {
  var controller = A([ { name: "Adam" }, { name: "Steve" } ]);

  view = EmberView.create({
    container: container,
    controller: controller,
    template: templateFor('{{#each controller}}{{#view}}{{name}}{{/view}}{{/each}}')
  });

  append(view);

  equal(view.$().text(), "AdamSteve");
});

test("controller is assignable inside an #each", function() {
  var controller = ArrayController.create({
    model: A([ { name: "Adam" }, { name: "Steve" } ])
  });

  view = EmberView.create({
    container: container,
    controller: controller,
    template: templateFor('{{#each personController in this}}{{#view controllerBinding="personController"}}{{name}}{{/view}}{{/each}}')
  });

  append(view);

  equal(view.$().text(), "AdamSteve");
});

test("single-arg each defaults to current context", function() {
  view = EmberView.create({
    context: A([ { name: "Adam" }, { name: "Steve" } ]),
    template: templateFor('{{#each}}{{name}}{{/each}}')
  });

  append(view);

  equal(view.$().text(), "AdamSteve");
});

test("single-arg each will iterate over controller if present", function() {
  view = EmberView.create({
    controller: A([ { name: "Adam" }, { name: "Steve" } ]),
    template: templateFor('{{#each}}{{name}}{{/each}}')
  });

  append(view);

  equal(view.$().text(), "AdamSteve");
});

test("it doesn't assert when the morph tags have the same parent", function() {
  view = EmberView.create({
    controller: A(['Cyril', 'David']),
    template: templateFor('<table><tbody>{{#each}}<tr><td>{{this}}</td></tr>{{/each}}<tbody></table>')
  });

  append(view);

  ok(true, "No assertion from valid template");
});

test("itemController specified in template with name binding does not change context", function() {
  var Controller = EmberController.extend({
    controllerName: computed(function() {
      return "controller:"+this.get('model.name');
    })
  });

  var container = new Container();

  people = A([{ name: "Steve Holt" }, { name: "Annabelle" }]);

  var parentController = {
    container: container,
    people: people,
    controllerName: 'controller:parentController'
  };

  container.register('controller:array', ArrayController.extend());

  view = EmberView.create({
    container: container,
    template: templateFor('{{#each person in people itemController="person"}}{{controllerName}} - {{person.controllerName}} - {{/each}}'),
    controller: parentController
  });

  container.register('controller:person', Controller);

  append(view);

  equal(view.$().text(), "controller:parentController - controller:Steve Holt - controller:parentController - controller:Annabelle - ");

  run(function() {
    people.pushObject({ name: "Yehuda Katz" });
  });

  assertText(view, "controller:parentController - controller:Steve Holt - controller:parentController - controller:Annabelle - controller:parentController - controller:Yehuda Katz - ");

  run(function() {
    set(parentController, 'people', A([{ name: "Trek Glowacki" }, { name: "Geoffrey Grosenbach" }]));
  });

  assertText(view, "controller:parentController - controller:Trek Glowacki - controller:parentController - controller:Geoffrey Grosenbach - ");

  strictEqual(view.get('_childViews')[0].get('_arrayController.target'), parentController, "the target property of the child controllers are set correctly");
});

test("itemController specified in ArrayController with name binding does not change context", function() {
  people = A([{ name: "Steve Holt" }, { name: "Annabelle" }]);

  var PersonController = ObjectController.extend({
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
  var container = new Container();

  container.register('controller:people', PeopleController);
  container.register('controller:person', PersonController);

  view = EmberView.create({
    container: container,
    template: templateFor('{{#each person in this}}{{controllerName}} - {{person.controllerName}} - {{/each}}'),
    controller: container.lookup('controller:people')
  });


  append(view);

  equal(view.$().text(), "controller:people - controller:Steve Holt of Yapp - controller:people - controller:Annabelle of Yapp - ");
});
