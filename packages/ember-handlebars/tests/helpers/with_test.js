/*globals Foo */

var appendView = function(view) {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

var view;
var originalLookup = Ember.lookup, lookup;

module("Handlebars {{#with}} helper", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };

    view = Ember.View.create({
      template: Ember.Handlebars.compile("{{#with person as tom}}{{title}}: {{tom.name}}{{/with}}"),
      context: {
        title: "Señor Engineer",
        person: { name: "Tom Dale" }
      }
    });

    appendView(view);
  },

  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });
    Ember.lookup = originalLookup;
  }
});

test("it should support #with foo as bar", function() {
  equal(view.$().text(), "Señor Engineer: Tom Dale", "should be properly scoped");
});

test("updating the context should update the alias", function() {
  Ember.run(function() {
    view.set('context.person', {
      name: "Yehuda Katz"
    });
  });

  equal(view.$().text(), "Señor Engineer: Yehuda Katz", "should be properly scoped after updating");
});

test("updating a property on the context should update the HTML", function() {
  Ember.run(function() {
    Ember.set(view, 'context.person.name', "Yehuda Katz");
  });

  equal(view.$().text(), "Señor Engineer: Yehuda Katz", "should be properly scoped after updating");
});

test("updating a property on the view should update the HTML", function() {
  Ember.run(function() {
    view.set('context.title', "Señorette Engineer");
  });

  equal(view.$().text(), "Señorette Engineer: Tom Dale", "should be properly scoped after updating");
});

module("Multiple Handlebars {{with}} helpers with 'as'", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };

    view = Ember.View.create({
      template: Ember.Handlebars.compile("Admin: {{#with admin as person}}{{person.name}}{{/with}} User: {{#with user as person}}{{person.name}}{{/with}}"),
      context: {
        admin: { name: "Tom Dale" },
        user: { name: "Yehuda Katz"}
      }
    });

    appendView(view);
  },

  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });
    Ember.lookup = originalLookup;
  }
});

test("re-using the same variable with different #with blocks does not override each other", function(){
  equal(view.$().text(), "Admin: Tom Dale User: Yehuda Katz", "should be properly scoped");
});

test("the scoped variable is not available outside the {{with}} block.", function(){
  Ember.run(function() {
    view.set('template', Ember.Handlebars.compile("{{name}}-{{#with other as name}}{{name}}{{/with}}-{{name}}"));
    view.set('context', {
      name: 'Stef',
      other: 'Yehuda'
    });
  });

  equal(view.$().text(), "Stef-Yehuda-Stef", "should be properly scoped after updating");
});

test("nested {{with}} blocks shadow the outer scoped variable properly.", function(){
  Ember.run(function() {
    view.set('template', Ember.Handlebars.compile("{{#with first as ring}}{{ring}}-{{#with fifth as ring}}{{ring}}-{{#with ninth as ring}}{{ring}}-{{/with}}{{ring}}-{{/with}}{{ring}}{{/with}}"));
    view.set('context', {
      first: 'Limbo',
      fifth: 'Wrath',
      ninth: 'Treachery'
    });
  });

  equal(view.$().text(), "Limbo-Wrath-Treachery-Wrath-Limbo", "should be properly scoped after updating");
});
module("Handlebars {{#with}} globals helper", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };

    lookup.Foo = { bar: 'baz' };
    view = Ember.View.create({
      template: Ember.Handlebars.compile("{{#with Foo.bar as qux}}{{qux}}{{/with}}")
    });

    appendView(view);
  },

  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });
    Ember.lookup = originalLookup;
  }
});

test("it should support #with Foo.bar as qux", function() {
  equal(view.$().text(), "baz", "should be properly scoped");

  Ember.run(function() {
    Ember.set(lookup.Foo, 'bar', 'updated');
  });

  equal(view.$().text(), "updated", "should update");
});

module("Handlebars {{#with keyword as foo}}");

test("it should support #with view as foo", function() {
  var view = Ember.View.create({
    template: Ember.Handlebars.compile("{{#with view as myView}}{{myView.name}}{{/with}}"),
    name: "Sonics"
  });

  appendView(view);
  equal(view.$().text(), "Sonics", "should be properly scoped");

  Ember.run(function() {
    Ember.set(view, 'name', "Thunder");
  });

  equal(view.$().text(), "Thunder", "should update");

  Ember.run(function() {
    view.destroy();
  });
});

test("it should support #with name as food, then #with foo as bar", function() {
  var view = Ember.View.create({
    template: Ember.Handlebars.compile("{{#with name as foo}}{{#with foo as bar}}{{bar}}{{/with}}{{/with}}"),
    context: { name: "caterpillar" }
  });

  appendView(view);
  equal(view.$().text(), "caterpillar", "should be properly scoped");

  Ember.run(function() {
    Ember.set(view, 'context.name', "butterfly");
  });

  equal(view.$().text(), "butterfly", "should update");

  Ember.run(function() {
    view.destroy();
  });
});

module("Handlebars {{#with this as foo}}");

test("it should support #with this as qux", function() {
  var view = Ember.View.create({
    template: Ember.Handlebars.compile("{{#with this as person}}{{person.name}}{{/with}}"),
    controller: Ember.Object.create({ name: "Los Pivots" })
  });

  appendView(view);
  equal(view.$().text(), "Los Pivots", "should be properly scoped");

  Ember.run(function() {
    Ember.set(view, 'controller.name', "l'Pivots");
  });

  equal(view.$().text(), "l'Pivots", "should update");

  Ember.run(function() {
    view.destroy();
  });
});

module("Handlebars {{#with foo}} insideGroup");

test("it should render without fail", function() {
  var View = Ember.View.extend({
    template: Ember.Handlebars.compile("{{#view view.childView}}{{#with person}}{{name}}{{/with}}{{/view}}"),
    controller: Ember.Object.create({ person: { name: "Ivan IV Vasilyevich" } }),
    childView: Ember.View.extend({
      render: function(){
        this.set('templateData.insideGroup', true);
        return this._super.apply(this, arguments);
      }
    })
  });

  var view = View.create();
  appendView(view);
  equal(view.$().text(), "Ivan IV Vasilyevich", "should be properly scoped");

  Ember.run(function() {
    Ember.set(view, 'controller.person.name', "Ivan the Terrible");
  });

  equal(view.$().text(), "Ivan the Terrible", "should update");

  Ember.run(function() {
    view.destroy();
  });
});

module("Handlebars {{#with foo}} with defined controller");

test("it should wrap context with object controller", function() {
  var Controller = Ember.ObjectController.extend({
    controllerName: Ember.computed(function() {
      return "controller:"+this.get('content.name') + ' and ' + this.get('parentController.name');
    })
  });

  var person = Ember.Object.create({name: 'Steve Holt'});
  var container = new Ember.Container();

  var parentController = Ember.Object.create({
    container: container,
    name: 'Bob Loblaw'
  });

  view = Ember.View.create({
    container: container,
    template: Ember.Handlebars.compile('{{#with view.person controller="person"}}{{controllerName}}{{/with}}'),
    person: person,
    controller: parentController
  });

  container.register('controller:person', Controller);

  appendView(view);

  equal(view.$().text(), "controller:Steve Holt and Bob Loblaw");

  Ember.run(function() {
    view.rerender();
  });

  equal(view.$().text(), "controller:Steve Holt and Bob Loblaw");

  Ember.run(function() {
    parentController.set('name', 'Carl Weathers');
    view.rerender();
  });

  equal(view.$().text(), "controller:Steve Holt and Carl Weathers");

  Ember.run(function() {
    person.set('name', 'Gob');
    view.rerender();
  });

  equal(view.$().text(), "controller:Gob and Carl Weathers");

  strictEqual(view.get('_childViews')[0].get('_contextController.target'), parentController, "the target property of the child controllers are set correctly");

  Ember.run(function() { view.destroy(); }); // destroy existing view
});

test("it should still have access to original parentController within an {{#each}}", function() {
  var Controller = Ember.ObjectController.extend({
    controllerName: Ember.computed(function() {
      return "controller:"+this.get('content.name') + ' and ' + this.get('parentController.name');
    })
  });

  var people = Ember.A([{ name: "Steve Holt" }, { name: "Carl Weathers" }]);
  var container = new Ember.Container();

  var parentController = Ember.Object.create({
    container: container,
    name: 'Bob Loblaw'
  });

  view = Ember.View.create({
    container: container,
    template: Ember.Handlebars.compile('{{#each person in people}}{{#with person controller="person"}}{{controllerName}}{{/with}}{{/each}}'),
    context: { people: people },
    controller: parentController
  });

  container.register('controller:person', Controller);

  appendView(view);

  equal(view.$().text(), "controller:Steve Holt and Bob Loblawcontroller:Carl Weathers and Bob Loblaw");

  Ember.run(function() { view.destroy(); }); // destroy existing view
});
