/*globals Foo */

var appendView = function(view) {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

var view;

module("Handlebars {{#with}} helper", {
  setup: function() {
    view = Ember.View.create({
      template: Ember.Handlebars.compile("{{#with person as tom}}{{title}}: {{tom.name}}{{/with}}"),
      title: "Señor Engineer",
      person: { name: "Tom Dale" }
    });

    appendView(view);
  },

  teardown: function() {
    Ember.run(function(){
      view.destroy();
    });
  }
});

test("it should support #with foo as bar", function() {
  equal(view.$().text(), "Señor Engineer: Tom Dale", "should be properly scoped");
});

test("updating the context should update the alias", function() {
  Ember.run(function() {
    view.set('person', {
      name: "Yehuda Katz"
    });
  });

  equal(view.$().text(), "Señor Engineer: Yehuda Katz", "should be properly scoped after updating");
});

test("updating a property on the context should update the HTML", function() {
  Ember.run(function() {
    Ember.set(view, 'person.name', "Yehuda Katz");
  });

  equal(view.$().text(), "Señor Engineer: Yehuda Katz", "should be properly scoped after updating");
});

test("updating a property on the view should update the HTML", function() {
  Ember.run(function() {
    view.set('title', "Señorette Engineer");
  });

  equal(view.$().text(), "Señorette Engineer: Tom Dale", "should be properly scoped after updating");
});

module("Handlebars {{#with}} globals helper", {
  setup: function() {
    window.Foo = { bar: 'baz' };
    view = Ember.View.create({
      template: Ember.Handlebars.compile("{{#with Foo.bar as qux}}{{qux}}{{/with}}")
    });

    appendView(view);
  },

  teardown: function() {
    Ember.run(function(){
      window.Foo = null;
      view.destroy();
    });
  }
});

test("it should support #with Foo.bar as qux", function() {
  equal(view.$().text(), "baz", "should be properly scoped");

  Ember.run(function() {
    Ember.set(Foo, 'bar', 'updated');
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
});

test("it should support #with foo as bar, then #with bar as qux", function() {
  var view = Ember.View.create({
    template: Ember.Handlebars.compile("{{#with view.name as foo}}{{#with foo as bar}}{{bar}}{{/with}}{{/with}}"),
    name: "caterpillar"
  });

  appendView(view);
  equal(view.$().text(), "caterpillar", "should be properly scoped");

  Ember.run(function() {
    Ember.set(view, 'name', "butterfly");
  });

  equal(view.$().text(), "butterfly", "should update");
});

if (Ember.VIEW_PRESERVES_CONTEXT) {
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
  });
}
