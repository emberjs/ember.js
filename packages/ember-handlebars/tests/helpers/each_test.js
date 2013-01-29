var get = Ember.get, set = Ember.set;
var people, view;
var template, templateMyView;
var templateFor = function(template) {
  return Ember.Handlebars.compile(template);
};

var originalLookup = Ember.lookup, lookup;

module("the #each helper", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };

    template = templateFor("{{#each view.people}}{{name}}{{/each}}");
    people = Ember.A([{ name: "Steve Holt" }, { name: "Annabelle" }]);

    view = Ember.View.create({
      template: template,
      people: people
    });


    templateMyView = templateFor("{{name}}");
    lookup.MyView = Ember.View.extend({
        template: templateMyView
    });

    append(view);
  },

  teardown: function() {
    Ember.run(function(){
      view.destroy();
      view = null;
    });
    Ember.lookup = originalLookup;
  }
});


var append = function(view) {
  Ember.run(function() {
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
  Ember.run(function() {
    people.pushObject({ name: "Tom Dale" });
  });

  assertHTML(view, "Steve HoltAnnabelleTom Dale");
});

test("it allows you to access the current context using {{this}}", function() {
  view = Ember.View.create({
    template: templateFor("{{#each view.people}}{{this}}{{/each}}"),
    people: Ember.A(['Black Francis', 'Joey Santiago', 'Kim Deal', 'David Lovering'])
  });

  append(view);

  assertHTML(view, "Black FrancisJoey SantiagoKim DealDavid Lovering");
});

test("it updates the view if an item is removed", function() {
  Ember.run(function() {
    people.removeAt(0);
  });

  assertHTML(view, "Annabelle");
});

test("it updates the view if an item is replaced", function() {
  Ember.run(function() {
    people.removeAt(0);
    people.insertAt(0, { name: "Kazuki" });
  });

  assertHTML(view, "KazukiAnnabelle");
});

test("can add and replace in the same runloop", function() {
  Ember.run(function() {
    people.pushObject({ name: "Tom Dale" });
    people.removeAt(0);
    people.insertAt(0, { name: "Kazuki" });
  });

  assertHTML(view, "KazukiAnnabelleTom Dale");
});

test("can add and replace the object before the add in the same runloop", function() {
  Ember.run(function() {
    people.pushObject({ name: "Tom Dale" });
    people.removeAt(1);
    people.insertAt(1, { name: "Kazuki" });
  });

  assertHTML(view, "Steve HoltKazukiTom Dale");
});

test("can add and replace complicatedly", function() {
  Ember.run(function() {
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
  Ember.run(function() {
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
  var ulView = Ember.View.create({
    template: templateFor('<ul>{{#each view.people}}<li>{{name}}</li>{{/each}}</ul>'),
    people: people
  });

  append(ulView);

  equal(ulView.$('li').length, 2, "renders two <li> elements");

  Ember.run(function() {
    people.pushObject({name: "Black Francis"});
  });

  equal(ulView.$('li').length, 3, "renders an additional <li> element when an object is added");
});

test("it works inside a table element", function() {
  var tableView = Ember.View.create({
    template: templateFor('<table><tbody>{{#each view.people}}<tr><td>{{name}}</td></tr>{{/each}}</tbody></table>'),
    people: people
  });

  append(tableView);

  equal(tableView.$('td').length, 2, "renders two <td> elements");

  Ember.run(function() {
    people.pushObject({name: "Black Francis"});
  });

  equal(tableView.$('td').length, 3, "renders an additional <td> element when an object is added");

  Ember.run(function() {
    people.insertAt(0, {name: "Kim Deal"});
  });

  equal(tableView.$('td').length, 4, "renders an additional <td> when an object is inserted at the beginning of the array");
});

test("it supports itemController", function() {
  var Controller = Ember.Controller.extend({
    controllerName: Ember.computed(function() {
      return "controller:"+this.get('content.name');
    })
  });

  var container = new Ember.Container();
  view = Ember.View.create({
    template: templateFor('{{#each view.people itemController="person"}}{{controllerName}}{{/each}}'),
    people: people,
    controller: {
      container: container
    }
  });

  container.register('controller', 'person', Controller);

  append(view);

  equal(view.$().text(), "controller:Steve Holtcontroller:Annabelle");

  Ember.run(function() {
    view.rerender();
  });

  assertText(view, "controller:Steve Holtcontroller:Annabelle");

  Ember.run(function() {
    people.pushObject({ name: "Yehuda Katz" });
  });

  assertText(view, "controller:Steve Holtcontroller:Annabellecontroller:Yehuda Katz");

  Ember.run(function() {
    set(view, 'people', Ember.A([{ name: "Trek Glowacki" }, { name: "Geoffrey Grosenbach" }]));
  });

  assertText(view, "controller:Trek Glowackicontroller:Geoffrey Grosenbach");
});

test("it supports itemController when using a custom keyword", function() {
  var Controller = Ember.Controller.extend({
    controllerName: Ember.computed(function() {
      return "controller:"+this.get('content.name');
    })
  });

  var container = new Ember.Container();
  view = Ember.View.create({
    template: templateFor('{{#each person in view.people itemController="person"}}{{person.controllerName}}{{/each}}'),
    people: people,
    controller: {
      container: container
    }
  });

  container.register('controller', 'person', Controller);

  append(view);

  equal(view.$().text(), "controller:Steve Holtcontroller:Annabelle");

  Ember.run(function() {
    view.rerender();
  });

  equal(view.$().text(), "controller:Steve Holtcontroller:Annabelle");
});

test("it supports {{itemViewClass=}}", function() {
  view = Ember.View.create({
    template: templateFor('{{each view.people itemViewClass="MyView"}}'),
    people: people
  });

  append(view);

  assertText(view, "Steve HoltAnnabelle");

});

test("it supports {{itemViewClass=}} with tagName", function() {

  view = Ember.View.create({
      template: templateFor('{{each view.people itemViewClass="MyView" tagName="ul"}}'),
      people: people
  });

  append(view);

  var html = view.$().html();

  // IE 8 (and prior?) adds the \r\n
  html = html.replace(/<script[^>]*><\/script>/ig, '').replace(/[\r\n]/g, '');
  html = html.replace(/<div[^>]*><\/div>/ig, '').replace(/[\r\n]/g, '');
  html = html.replace(/<li[^>]*/ig, '<li');

  // Use lowercase since IE 8 make tagnames uppercase
  equal(html.toLowerCase(), "<ul><li>steve holt</li><li>annabelle</li></ul>");

});

test("it supports {{itemViewClass=}} with in format", function() {

  lookup.MyView = Ember.View.extend({
      template: templateFor("{{person.name}}")
  });

  view = Ember.View.create({
    template: templateFor('{{each person in view.people itemViewClass="MyView"}}'),
    people: people
  });

  append(view);

  assertText(view, "Steve HoltAnnabelle");

});

test("it supports {{else}}", function() {
  view = Ember.View.create({
    template: templateFor("{{#each view.items}}{{this}}{{else}}Nothing{{/each}}"),
    items: Ember.A(['one', 'two'])
  });

  append(view);

  assertHTML(view, "onetwo");

  stop();

  // We really need to make sure we get to the re-render
  Ember.run.next(function() {
    Ember.run(function() {
      view.set('items', Ember.A([]));
    });

    start();

    assertHTML(view, "Nothing");
  });
});

test("it works with the controller keyword", function() {
  var controller = Ember.ArrayController.create({
    content: Ember.A(["foo", "bar", "baz"])
  });

  view = Ember.View.create({
    controller: controller,
    template: templateFor("{{#view}}{{#each controller}}{{this}}{{/each}}{{/view}}")
  });

  append(view);

  equal(view.$().text(), "foobarbaz");
});

module("{{#each foo in bar}}");

test("#each accepts a name binding", function() {
  view = Ember.View.create({
    template: templateFor("{{#each item in view.items}}{{view.title}} {{item}}{{/each}}"),
    title: "My Cool Each Test",
    items: Ember.A([1, 2])
  });

  append(view);

  equal(view.$().text(), "My Cool Each Test 1My Cool Each Test 2");
});

test("#each accepts a name binding and does not change the context", function() {
  var controller = Ember.Controller.create({
    name: 'bob the controller'
  }),
  obj = Ember.Object.create({
    name: 'henry the item'
  });

  view = Ember.View.create({
    template: templateFor("{{#each item in view.items}}{{name}}{{/each}}"),
    title: "My Cool Each Test",
    items: Ember.A([obj]),
    controller: controller
  });

  append(view);

  equal(view.$().text(), "bob the controller");
});


test("#each accepts a name binding and can display child properties", function() {
  view = Ember.View.create({
    template: templateFor("{{#each item in view.items}}{{view.title}} {{item.name}}{{/each}}"),
    title: "My Cool Each Test",
    items: Ember.A([{ name: 1 }, { name: 2 }])
  });

  append(view);

  equal(view.$().text(), "My Cool Each Test 1My Cool Each Test 2");
});

test("#each accepts 'this' as the right hand side", function() {
  view = Ember.View.create({
    template: templateFor("{{#each item in this}}{{view.title}} {{item.name}}{{/each}}"),
    title: "My Cool Each Test",
    controller: Ember.A([{ name: 1 }, { name: 2 }])
  });

  append(view);

  equal(view.$().text(), "My Cool Each Test 1My Cool Each Test 2");
});
test("#each accepts 'this' as the right hand side", function() {
  view = Ember.View.create({
    template: templateFor("{{#each item in this}}{{view.title}} {{item.name}}{{/each}}"),
    title: "My Cool Each Test",
    controller: Ember.A([{ name: 1 }, { name: 2 }])
  });

  append(view);

  equal(view.$().text(), "My Cool Each Test 1My Cool Each Test 2");
});

test("views inside #each preserve the new context", function() {
  var controller = Ember.A([ { name: "Adam" }, { name: "Steve" } ]);

  view = Ember.View.create({
    controller: controller,
    template: templateFor('{{#each controller}}{{#view}}{{name}}{{/view}}{{/each}}')
  });

  append(view);

  equal(view.$().text(), "AdamSteve");
});

test("controller is assignable inside an #each", function() {
  var controller = Ember.ArrayController.create({
    content: Ember.A([ { name: "Adam" }, { name: "Steve" } ])
  });

  view = Ember.View.create({
    controller: controller,
    template: templateFor('{{#each itemController in this}}{{#view controllerBinding="itemController"}}{{name}}{{/view}}{{/each}}')
  });

  append(view);

  equal(view.$().text(), "AdamSteve");
});
