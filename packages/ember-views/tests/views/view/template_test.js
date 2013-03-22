var set = Ember.set, get = Ember.get, container, view;

module("Ember.View - Template Functionality", {
  setup: function() {
    container = new Ember.Container();
    container.optionsForType('template', { instantiate: false });
  },
  teardown: function() {
    Ember.run(function() {
      if (view) { view.destroy(); }
    });
  }
});

test("should call the function of the associated template", function() {
  container.register('template:testTemplate', function() {
    return "<h1 id='twas-called'>template was called</h1>";
  });

  view = Ember.View.create({
    container: container,
    templateName: 'testTemplate'
  });

  Ember.run(function(){
    view.createElement();
  });

  ok(view.$('#twas-called').length, "the named template was called");
});

test("should call the function of the associated template with itself as the context", function() {
  container.register('template:testTemplate', function(dataSource) {
    return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>";
  });

  view = Ember.View.create({
    container: container,
    templateName: 'testTemplate',

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
    defaultTemplate: function(dataSource) { return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>"; }
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

test("should not use defaultTemplate if template is provided", function() {
  var View;

  View = Ember.View.extend({
    template:  function() { return "foo"; },
    defaultTemplate: function(dataSource) { return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>"; }
  });

  view = View.create();
  Ember.run(function(){
    view.createElement();
  });

  equal("foo", view.$().text(), "default template was not printed");
});

test("should not use defaultTemplate if template is provided", function() {
  var View;

  container.register('template:foobar', function() { return 'foo'; });

  View = Ember.View.extend({
    container: container,
    templateName: 'foobar',
    defaultTemplate: function(dataSource) { return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>"; }
  });

  view = View.create();
  Ember.run(function(){
    view.createElement();
  });

  equal("foo", view.$().text(), "default template was not printed");
});

test("should render an empty element if no template is specified", function() {
  view = Ember.View.create();
  Ember.run(function(){
    view.createElement();
  });

  equal(view.$().html(), '', "view div should be empty");
});

test("should provide a controller to the template if a controller is specified on the view", function() {
  expect(7);

  var Controller1 = Ember.Object.extend({
    toString: function() { return "Controller1"; }
  });

  var Controller2 = Ember.Object.extend({
    toString: function() { return "Controller2"; }
  });

  var controller1 = Controller1.create(),
      controller2 = Controller2.create(),
      optionsDataKeywordsControllerForView,
      optionsDataKeywordsControllerForChildView,
      contextForView,
      contextForControllerlessView;

  view = Ember.View.create({
    controller: controller1,

    template: function(buffer, options) {
      optionsDataKeywordsControllerForView = options.data.keywords.controller;
    }
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  strictEqual(optionsDataKeywordsControllerForView, controller1, "passes the controller in the data");

  Ember.run(function(){
    view.destroy();
  });

  var parentView = Ember.View.create({
    controller: controller1,

    template: function(buffer, options) {
      options.data.view.appendChild(Ember.View.create({
        controller: controller2,
        templateData: options.data,
        template: function(context, options) {
          contextForView = context;
          optionsDataKeywordsControllerForChildView = options.data.keywords.controller;
        }
      }));
      optionsDataKeywordsControllerForView = options.data.keywords.controller;
    }
  });

  Ember.run(function() {
    parentView.appendTo('#qunit-fixture');
  });

  strictEqual(optionsDataKeywordsControllerForView, controller1, "passes the controller in the data");
  strictEqual(optionsDataKeywordsControllerForChildView, controller2, "passes the child view's controller in the data");

  Ember.run(function(){
    parentView.destroy();
  });

  var parentViewWithControllerlessChild = Ember.View.create({
    controller: controller1,

    template: function(buffer, options) {
      options.data.view.appendChild(Ember.View.create({
        templateData: options.data,
        template: function(context, options) {
          contextForControllerlessView = context;
          optionsDataKeywordsControllerForChildView = options.data.keywords.controller;
        }
      }));
      optionsDataKeywordsControllerForView = options.data.keywords.controller;
    }
  });

  Ember.run(function() {
    parentViewWithControllerlessChild.appendTo('#qunit-fixture');
  });

  strictEqual(optionsDataKeywordsControllerForView, controller1, "passes the original controller in the data");
  strictEqual(optionsDataKeywordsControllerForChildView, controller1, "passes the controller in the data to child views");
  strictEqual(contextForView, controller2, "passes the controller in as the main context of the parent view");
  strictEqual(contextForControllerlessView, controller1, "passes the controller in as the main context of the child view");

  Ember.run(function() {
    parentView.destroy();
    parentViewWithControllerlessChild.destroy();
  });
});
