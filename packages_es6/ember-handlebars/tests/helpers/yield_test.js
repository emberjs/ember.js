
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
    Ember.run(function() {
      Ember.TEMPLATES = {};
      if (view) {
        view.destroy();
      }
    });

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
  container.register('template:nester', Ember.Handlebars.compile('<div class="wrapper"><h1>{{title}}</h1>{{yield}}</div>'));
  container.register('template:nested', Ember.Handlebars.compile('{{#view TemplateTests.ViewWithLayout title="My Fancy Page"}}<div class="page-body">Show something interesting here</div>{{/view}}'));

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
      var n = Ember.get(this, 'n'), indexArray = Ember.A();
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

test("yield uses the outer context", function() {
  var component = Ember.Component.extend({
    boundText: "inner",
    layout: Ember.Handlebars.compile("<p>{{boundText}}</p><p>{{yield}}</p>")
  });

  view = Ember.View.create({
    controller: { boundText: "outer", component: component },
    template: Ember.Handlebars.compile('{{#view component}}{{boundText}}{{/view}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div p:contains(inner) + p:contains(outer)').length, 1, "Yield points at the right context");
});

test("yield inside a conditional uses the outer context", function() {
  var component = Ember.Component.extend({
    boundText: "inner",
    truthy: true,
    obj: {},
    layout: Ember.Handlebars.compile("<p>{{boundText}}</p><p>{{#if truthy}}{{#with obj}}{{yield}}{{/with}}{{/if}}</p>")
  });

  view = Ember.View.create({
    controller: { boundText: "outer", truthy: true, obj: { component: component, truthy: true, boundText: 'insideWith' } },
    template: Ember.Handlebars.compile('{{#with obj}}{{#if truthy}}{{#view component}}{{#if truthy}}{{boundText}}{{/if}}{{/view}}{{/if}}{{/with}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div p:contains(inner) + p:contains(insideWith)').length, 1, "Yield points at the right context");
});

test("outer keyword doesn't mask inner component property", function () {
  var component = Ember.Component.extend({
    item: "inner",
    layout: Ember.Handlebars.compile("<p>{{item}}</p><p>{{yield}}</p>")
  });

  view = Ember.View.create({
    controller: { boundText: "outer", component: component },
    template: Ember.Handlebars.compile('{{#with boundText as item}}{{#view component}}{{item}}{{/view}}{{/with}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div p:contains(inner) + p:contains(outer)').length, 1, "inner component property isn't masked by outer keyword");
});

test("inner keyword doesn't mask yield property", function() {
  var component = Ember.Component.extend({
    boundText: "inner",
    layout: Ember.Handlebars.compile("{{#with boundText as item}}<p>{{item}}</p><p>{{yield}}</p>{{/with}}")
  });

  view = Ember.View.create({
    controller: { item: "outer", component: component },
    template: Ember.Handlebars.compile('{{#view component}}{{item}}{{/view}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div p:contains(inner) + p:contains(outer)').length, 1, "outer property isn't masked by inner keyword");
});

test("can bind a keyword to a component and use it in yield", function() {
  var component = Ember.Component.extend({
    content: null,
    layout: Ember.Handlebars.compile("<p>{{content}}</p><p>{{yield}}</p>")
  });

  view = Ember.View.create({
    controller: { boundText: "outer", component: component },
    template: Ember.Handlebars.compile('{{#with boundText as item}}{{#view component contentBinding="item"}}{{item}}{{/view}}{{/with}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div p:contains(outer) + p:contains(outer)').length, 1, "component and yield have keyword");

  Ember.run(function() {
    view.set('controller.boundText', 'update');
  });

  equal(view.$('div p:contains(update) + p:contains(update)').length, 1, "keyword has correctly propagated update");
});

test("yield uses the layout context for non component", function() {
  view = Ember.View.create({
    controller: {
      boundText: "outer",
      inner: {
        boundText: "inner"
      }
    },
    layout: Ember.Handlebars.compile("<p>{{boundText}}</p>{{#with inner}}<p>{{yield}}</p>{{/with}}"),
    template: Ember.Handlebars.compile('{{boundText}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal('outerinner', view.$('p').text(), "Yield points at the right context");
});

test("yield view should be a virtual view", function() {
  var component = Ember.Component.extend({
    isParentComponent: true,

    layout: Ember.Handlebars.compile('{{yield}}')
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#view component}}{{view includedComponent}}{{/view}}'),
    controller: {
      component: component,
      includedComponent: Ember.Component.extend({
        didInsertElement: function() {
          var parentView = this.get('parentView');

          ok(parentView.get('isParentComponent'), "parent view is the parent component");
        }
      })
    }
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });
});


test("adding a layout should not affect the context of normal views", function() {
  var parentView = Ember.View.create({
    context: "ParentContext"
  });

  view = Ember.View.create({
    template:     Ember.Handlebars.compile("View context: {{this}}"),
    context:      "ViewContext",
    _parentView:  parentView
  });

  Ember.run(function() {
    view.createElement();
  });

  equal(view.$().text(), "View context: ViewContext");


  set(view, 'layout', Ember.Handlebars.compile("Layout: {{yield}}"));

  Ember.run(function() {
    view.destroyElement();
    view.createElement();
  });

  equal(view.$().text(), "Layout: View context: ViewContext");

  Ember.run(function() {
    parentView.destroy();
  });
});

test("yield should work for views even if _parentView is null", function() {
  view = Ember.View.create({
    layout:   Ember.Handlebars.compile('Layout: {{yield}}'),
    template: Ember.Handlebars.compile("View Content")
  });

  Ember.run(function() {
    view.createElement();
  });

  equal(view.$().text(), "Layout: View Content");

});

module("Component {{yield}}", {
  setup: function() {},
  teardown: function() {
    Ember.run(function() {
      if (view) {
        view.destroy();
      }
      delete Ember.Handlebars.helpers['inner-component'];
      delete Ember.Handlebars.helpers['outer-component'];
    });
  }
});

test("yield with nested components (#3220)", function(){
  var count = 0;
  var InnerComponent = Ember.Component.extend({
    layout: Ember.Handlebars.compile("{{yield}}"),
    _yield: function (context, options) {
      count++;
      if (count > 1) throw new Ember.Error('is looping');
      return this._super(context, options);
    }
  });

  Ember.Handlebars.helper('inner-component', InnerComponent);

  var OuterComponent = Ember.Component.extend({
    layout: Ember.Handlebars.compile("{{#inner-component}}<span>{{yield}}</span>{{/inner-component}}")
  });

  Ember.Handlebars.helper('outer-component', OuterComponent);

  view = Ember.View.create({
    template: Ember.Handlebars.compile(
      "{{#outer-component}}Hello world{{/outer-component}}"
    )
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div > span').text(), "Hello world");
});
