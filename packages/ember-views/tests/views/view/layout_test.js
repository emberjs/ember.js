var set = Ember.set, get = Ember.get;

module("Ember.View - Template Functionality");

test("should call the function of the associated layout", function() {
  var view;
  var templateCalled = 0, layoutCalled = 0;

  view = Ember.View.create({
    layoutName: 'layout',
    templateName: 'template',

    templates: {
      template: function() {
        templateCalled++;
      },

      layout: function() {
        layoutCalled++;
      }
    }
  });

  view.createElement();

  equal(templateCalled, 0, "template is not called when layout is present");
  equal(layoutCalled, 1, "layout is called when layout is present");
});

test("should call the function of the associated template with itself as the context", function() {
  var view;

  view = Ember.View.create({
    layoutName: 'test_template',

    personName: "Tom DAAAALE",

    templates: Ember.Object.create({
      test_template: function(dataSource) {
        return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>";
      }
    })
  });

  view.createElement();

  equal("template was called for Tom DAAAALE", view.$('#twas-called').text(), "the named template was called with the view as the data source");
});

test("should fall back to defaultTemplate if neither template nor templateName are provided", function() {
  var View, view;

  View = Ember.View.extend({
    defaultLayout: function(dataSource) { return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>"; }
  });

  view = View.create({
    personName: "Tom DAAAALE"
  });

  view.createElement();

  equal("template was called for Tom DAAAALE", view.$('#twas-called').text(), "the named template was called with the view as the data source");
});

test("should not use defaultLayout if layout is provided", function() {
  var View, view;

  View = Ember.View.extend({
    layout:  function() { return "foo"; },
    defaultLayout: function(dataSource) { return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>"; }
  });

  view = View.create();
  view.createElement();

  equal("foo", view.$().text(), "default layout was not printed");
});

test("the template property is available to the layout template", function() {
  var view = Ember.View.create({
    template: function(context, options) {
      options.data.buffer.push(" derp");
    },

    layout: function(context, options) {
      options.data.buffer.push("Herp");
      get(context, 'template')(context, options);
    }
  });

  view.createElement();

  equal("Herp derp", view.$().text(), "the layout has access to the template");
});
