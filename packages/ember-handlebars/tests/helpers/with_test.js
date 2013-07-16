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
