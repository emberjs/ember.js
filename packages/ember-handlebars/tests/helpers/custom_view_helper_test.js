/*globals TemplateTests*/

var view, get = Ember.get, set = Ember.set;

var appendView = function() {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

module("Handlebars custom view helpers", {
  setup: function() {
    window.TemplateTests = Ember.Namespace.create();
  },
  teardown: function() {
    Ember.run(function() {
      if (view) {
        view.destroy();
      }
    });
    window.TemplateTests = undefined;
  }
});

test("should render an instance of the specified view", function() {
  TemplateTests.OceanView = Ember.View.extend({
    template: Ember.Handlebars.compile('zomg, nice view')
  });

  Ember.Handlebars.helper('oceanView', TemplateTests.OceanView);

  view = Ember.View.create({
    controller: Ember.Object.create(),
    template: Ember.Handlebars.compile('{{oceanView tagName="strong"}}')
  });

  appendView();

  var oceanViews = view.$().find("strong:contains('zomg, nice view')");

  equal(oceanViews.length, 1, "helper rendered an instance of the view");
});

test("Should bind to this keyword", function() {
  TemplateTests.OceanView = Ember.View.extend({
    model: null,
    template: Ember.Handlebars.compile('{{view.model}}')
  });

  Ember.Handlebars.helper('oceanView', TemplateTests.OceanView);

  view = Ember.View.create({
    context: 'foo',
    controller: Ember.Object.create(),
    template: Ember.Handlebars.compile('{{oceanView tagName="strong" viewName="ocean" model=this}}')
  });

  appendView();

  var oceanViews = view.$().find("strong:contains('foo')");

  equal(oceanViews.length, 1, "helper rendered an instance of the view");

  Ember.run(function() {
    set(view, 'ocean.model', 'bar');
  });

  oceanViews = view.$().find("strong:contains('bar')");

  equal(oceanViews.length, 1, "helper rendered an instance of the view");
});
