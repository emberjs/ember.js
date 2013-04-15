var set = Ember.set, get = Ember.get, container, view;

module("Ember.View - Layout Functionality", {
  setup: function() {
    container = new Ember.Container();
    container.optionsForType('template', { instantiate: false });
  },
  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });
  }
});

test("should call the function of the associated layout", function() {
  var templateCalled = 0, layoutCalled = 0;

  container.register('template:template', function() { templateCalled++; });
  container.register('template:layout', function() { layoutCalled++; });

  view = Ember.View.create({
    container: container,
    layoutName: 'layout',
    templateName: 'template'
  });

  Ember.run(function(){
    view.createElement();
  });

  equal(templateCalled, 0, "template is not called when layout is present");
  equal(layoutCalled, 1, "layout is called when layout is present");
});

test("should call the function of the associated template with itself as the context", function() {
  container.register('template:testTemplate', function(dataSource) {
    return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>";
  });

  view = Ember.View.create({
    container: container,
    layoutName: 'testTemplate',

    context: {
      personName: "Tom DAAAALE"
    }
  });

  Ember.run(function(){
    view.createElement();
  });

  equal("template was called for Tom DAAAALE", view.$('#twas-called').text(), "the named template was called with the view as the data source");
});

test("should fall back to defaultTemplate if neither template nor templateName are provided", function() {
  var View;

  View = Ember.View.extend({
    defaultLayout: function(dataSource) { return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>"; }
  });

  view = View.create({
    context: {
      personName: "Tom DAAAALE"
    }
  });

  Ember.run(function(){
    view.createElement();
  });

  equal("template was called for Tom DAAAALE", view.$('#twas-called').text(), "the named template was called with the view as the data source");
});

test("should not use defaultLayout if layout is provided", function() {
  var View;

  View = Ember.View.extend({
    layout:  function() { return "foo"; },
    defaultLayout: function(dataSource) { return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>"; }
  });

  view = View.create();
  Ember.run(function(){
    view.createElement();
  });


  equal("foo", view.$().text(), "default layout was not printed");
});

test("the template property is available to the layout template", function() {
  view = Ember.View.create({
    template: function(context, options) {
      options.data.buffer.push(" derp");
    },

    layout: function(context, options) {
      options.data.buffer.push("Herp");
      get(options.data.view, 'template')(context, options);
    }
  });

  Ember.run(function(){
    view.createElement();
  });

  equal("Herp derp", view.$().text(), "the layout has access to the template");
});
