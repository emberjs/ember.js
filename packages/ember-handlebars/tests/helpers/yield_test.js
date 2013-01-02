var set = Ember.set, get = Ember.get;

var originalLookup = Ember.lookup, lookup, TemplateTests, view, container;

module("Support for {{yield}} helper (#307)", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };

    lookup.TemplateTests = TemplateTests = Ember.Namespace.create();

    container = new Ember.Container();
    container.optionsForType('template', { instantiate: false });
  },
  teardown: function() {
    Ember.run(function(){
      if (view) {
        view.destroy();
      }}
    );

    Ember.lookup = originalLookup;
  }
});

test("a view with a layout set renders its template where the {{yield}} helper appears", function() {
  TemplateTests.ViewWithLayout = Ember.View.extend({
    layout: Ember.Handlebars.compile('<div class="wrapper"><h1>{{title}}</h1>{{yield}}</div>')
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#view TemplateTests.ViewWithLayout title="My Fancy Page"}}<div class="page-body">Show something interesting here</div>{{/view}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div.wrapper div.page-body').length, 1, 'page-body is embedded within wrapping my-page');
});

test("block should work properly even when templates are not hard-coded", function() {
  container.register('template', 'nester', Ember.Handlebars.compile('<div class="wrapper"><h1>{{title}}</h1>{{yield}}</div>'));
  container.register('template', 'nested', Ember.Handlebars.compile('{{#view TemplateTests.ViewWithLayout title="My Fancy Page"}}<div class="page-body">Show something interesting here</div>{{/view}}'));

  TemplateTests.ViewWithLayout = Ember.View.extend({
    container: container,
    layoutName: 'nester'
  });

  view = Ember.View.create({
    container: container,
    templateName: 'nested'
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div.wrapper div.page-body').length, 1, 'page-body is embedded within wrapping my-page');

});

test("templates should yield to block, when the yield is embedded in a hierarchy of virtual views", function() {
  TemplateTests.TimesView = Ember.View.extend({
    layout: Ember.Handlebars.compile('<div class="times">{{#each view.index}}{{yield}}{{/each}}</div>'),
    n: null,
    index: Ember.computed(function() {
      var n = Ember.get(this, 'n'), indexArray = Ember.A([]);
      for (var i=0; i < n; i++) {
        indexArray[i] = i;
      }
      return indexArray;
    })
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<div id="container"><div class="title">Counting to 5</div>{{#view TemplateTests.TimesView n=5}}<div class="times-item">Hello</div>{{/view}}</div>')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div#container div.times-item').length, 5, 'times-item is embedded within wrapping container 5 times, as expected');
});

test("templates should yield to block, when the yield is embedded in a hierarchy of non-virtual views", function() {
  TemplateTests.NestingView = Ember.View.extend({
    layout: Ember.Handlebars.compile('{{#view Ember.View tagName="div" classNames="nesting"}}{{yield}}{{/view}}')
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<div id="container">{{#view TemplateTests.NestingView}}<div id="block">Hello</div>{{/view}}</div>')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div#container div.nesting div#block').length, 1, 'nesting view yields correctly even within a view hierarchy in the nesting view');
});

test("block should not be required", function() {
  TemplateTests.YieldingView = Ember.View.extend({
    layout: Ember.Handlebars.compile('{{#view Ember.View tagName="div" classNames="yielding"}}{{yield}}{{/view}}')
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<div id="container">{{view TemplateTests.YieldingView}}</div>')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div#container div.yielding').length, 1, 'yielding view is rendered as expected');
});

