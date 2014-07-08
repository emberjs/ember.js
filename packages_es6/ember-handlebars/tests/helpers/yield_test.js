/*jshint newcap:false*/
import run from "ember-metal/run_loop";
import {View as EmberView} from "ember-views/views/view";
import {computed} from "ember-metal/computed";
import Namespace from "ember-runtime/system/namespace";
import Container from "ember-runtime/system/container";
import EmberHandlebars from "ember-handlebars-compiler";
import {get} from "ember-metal/property_get";
import {set} from "ember-metal/property_set";
import {A} from "ember-runtime/system/native_array";
import Component from "ember-views/views/component";
import EmberError from "ember-metal/error";

var originalLookup = Ember.lookup, lookup, TemplateTests, view, container;

module("Support for {{yield}} helper", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };

    lookup.TemplateTests = TemplateTests = Namespace.create();

    container = new Container();
    container.optionsForType('template', { instantiate: false });
  },
  teardown: function() {
    run(function() {
      Ember.TEMPLATES = {};
      if (view) {
        view.destroy();
      }
    });

    Ember.lookup = originalLookup;
  }
});

test("a view with a layout set renders its template where the {{yield}} helper appears", function() {
  TemplateTests.ViewWithLayout = EmberView.extend({
    layout: EmberHandlebars.compile('<div class="wrapper"><h1>{{title}}</h1>{{yield}}</div>')
  });

  view = EmberView.create({
    template: EmberHandlebars.compile('{{#view TemplateTests.ViewWithLayout title="My Fancy Page"}}<div class="page-body">Show something interesting here</div>{{/view}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div.wrapper div.page-body').length, 1, 'page-body is embedded within wrapping my-page');
});

test("block should work properly even when templates are not hard-coded", function() {
  container.register('template:nester', EmberHandlebars.compile('<div class="wrapper"><h1>{{title}}</h1>{{yield}}</div>'));
  container.register('template:nested', EmberHandlebars.compile('{{#view TemplateTests.ViewWithLayout title="My Fancy Page"}}<div class="page-body">Show something interesting here</div>{{/view}}'));

  TemplateTests.ViewWithLayout = EmberView.extend({
    container: container,
    layoutName: 'nester'
  });

  view = EmberView.create({
    container: container,
    templateName: 'nested'
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div.wrapper div.page-body').length, 1, 'page-body is embedded within wrapping my-page');

});

test("templates should yield to block, when the yield is embedded in a hierarchy of virtual views", function() {
  TemplateTests.TimesView = EmberView.extend({
    layout: EmberHandlebars.compile('<div class="times">{{#each view.index}}{{yield}}{{/each}}</div>'),
    n: null,
    index: computed(function() {
      var n = get(this, 'n'), indexArray = A();
      for (var i=0; i < n; i++) {
        indexArray[i] = i;
      }
      return indexArray;
    })
  });

  view = EmberView.create({
    template: EmberHandlebars.compile('<div id="container"><div class="title">Counting to 5</div>{{#view TemplateTests.TimesView n=5}}<div class="times-item">Hello</div>{{/view}}</div>')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div#container div.times-item').length, 5, 'times-item is embedded within wrapping container 5 times, as expected');
});

test("templates should yield to block, when the yield is embedded in a hierarchy of non-virtual views", function() {
  TemplateTests.NestingView = EmberView.extend({
    layout: EmberHandlebars.compile('{{#view Ember.View tagName="div" classNames="nesting"}}{{yield}}{{/view}}')
  });

  view = EmberView.create({
    template: EmberHandlebars.compile('<div id="container">{{#view TemplateTests.NestingView}}<div id="block">Hello</div>{{/view}}</div>')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div#container div.nesting div#block').length, 1, 'nesting view yields correctly even within a view hierarchy in the nesting view');
});

test("block should not be required", function() {
  TemplateTests.YieldingView = EmberView.extend({
    layout: EmberHandlebars.compile('{{#view Ember.View tagName="div" classNames="yielding"}}{{yield}}{{/view}}')
  });

  view = EmberView.create({
    template: EmberHandlebars.compile('<div id="container">{{view TemplateTests.YieldingView}}</div>')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div#container div.yielding').length, 1, 'yielding view is rendered as expected');
});

test("yield uses the outer context", function() {
  var component = Component.extend({
    boundText: "inner",
    layout: EmberHandlebars.compile("<p>{{boundText}}</p><p>{{yield}}</p>")
  });

  view = EmberView.create({
    controller: { boundText: "outer", component: component },
    template: EmberHandlebars.compile('{{#view component}}{{boundText}}{{/view}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div p:contains(inner) + p:contains(outer)').length, 1, "Yield points at the right context");
});

test("yield inside a conditional uses the outer context", function() {
  var component = Component.extend({
    boundText: "inner",
    truthy: true,
    obj: {},
    layout: EmberHandlebars.compile("<p>{{boundText}}</p><p>{{#if truthy}}{{#with obj}}{{yield}}{{/with}}{{/if}}</p>")
  });

  view = EmberView.create({
    controller: { boundText: "outer", truthy: true, obj: { component: component, truthy: true, boundText: 'insideWith' } },
    template: EmberHandlebars.compile('{{#with obj}}{{#if truthy}}{{#view component}}{{#if truthy}}{{boundText}}{{/if}}{{/view}}{{/if}}{{/with}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div p:contains(inner) + p:contains(insideWith)').length, 1, "Yield points at the right context");
});

test("outer keyword doesn't mask inner component property", function () {
  var component = Component.extend({
    item: "inner",
    layout: EmberHandlebars.compile("<p>{{item}}</p><p>{{yield}}</p>")
  });

  view = EmberView.create({
    controller: { boundText: "outer", component: component },
    template: EmberHandlebars.compile('{{#with boundText as item}}{{#view component}}{{item}}{{/view}}{{/with}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div p:contains(inner) + p:contains(outer)').length, 1, "inner component property isn't masked by outer keyword");
});

test("inner keyword doesn't mask yield property", function() {
  var component = Component.extend({
    boundText: "inner",
    layout: EmberHandlebars.compile("{{#with boundText as item}}<p>{{item}}</p><p>{{yield}}</p>{{/with}}")
  });

  view = EmberView.create({
    controller: { item: "outer", component: component },
    template: EmberHandlebars.compile('{{#view component}}{{item}}{{/view}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div p:contains(inner) + p:contains(outer)').length, 1, "outer property isn't masked by inner keyword");
});

test("can bind a keyword to a component and use it in yield", function() {
  var component = Component.extend({
    content: null,
    layout: EmberHandlebars.compile("<p>{{content}}</p><p>{{yield}}</p>")
  });

  view = EmberView.create({
    controller: { boundText: "outer", component: component },
    template: EmberHandlebars.compile('{{#with boundText as item}}{{#view component contentBinding="item"}}{{item}}{{/view}}{{/with}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div p:contains(outer) + p:contains(outer)').length, 1, "component and yield have keyword");

  run(function() {
    view.set('controller.boundText', 'update');
  });

  equal(view.$('div p:contains(update) + p:contains(update)').length, 1, "keyword has correctly propagated update");
});

test("yield uses the layout context for non component", function() {
  view = EmberView.create({
    controller: {
      boundText: "outer",
      inner: {
        boundText: "inner"
      }
    },
    layout: EmberHandlebars.compile("<p>{{boundText}}</p>{{#with inner}}<p>{{yield}}</p>{{/with}}"),
    template: EmberHandlebars.compile('{{boundText}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal('outerinner', view.$('p').text(), "Yield points at the right context");
});

test("yield view should be a virtual view", function() {
  var component = Component.extend({
    isParentComponent: true,

    layout: EmberHandlebars.compile('{{yield}}')
  });

  view = EmberView.create({
    template: EmberHandlebars.compile('{{#view component}}{{view includedComponent}}{{/view}}'),
    controller: {
      component: component,
      includedComponent: Component.extend({
        didInsertElement: function() {
          var parentView = this.get('parentView');

          ok(parentView.get('isParentComponent'), "parent view is the parent component");
        }
      })
    }
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });
});


test("adding a layout should not affect the context of normal views", function() {
  var parentView = EmberView.create({
    context: "ParentContext"
  });

  view = EmberView.create({
    template:     EmberHandlebars.compile("View context: {{this}}"),
    context:      "ViewContext",
    _parentView:  parentView
  });

  run(function() {
    view.createElement();
  });

  equal(view.$().text(), "View context: ViewContext");


  set(view, 'layout', EmberHandlebars.compile("Layout: {{yield}}"));

  run(function() {
    view.destroyElement();
    view.createElement();
  });

  equal(view.$().text(), "Layout: View context: ViewContext");

  run(function() {
    parentView.destroy();
  });
});

test("yield should work for views even if _parentView is null", function() {
  view = EmberView.create({
    layout:   EmberHandlebars.compile('Layout: {{yield}}'),
    template: EmberHandlebars.compile("View Content")
  });

  run(function() {
    view.createElement();
  });

  equal(view.$().text(), "Layout: View Content");

});

module("Component {{yield}}", {
  setup: function() {},
  teardown: function() {
    run(function() {
      if (view) {
        view.destroy();
      }
      delete EmberHandlebars.helpers['inner-component'];
      delete EmberHandlebars.helpers['outer-component'];
    });
  }
});

test("yield with nested components (#3220)", function(){
  var count = 0;
  var InnerComponent = Component.extend({
    layout: EmberHandlebars.compile("{{yield}}"),
    _yield: function (context, options) {
      count++;
      if (count > 1) throw new EmberError('is looping');
      return this._super(context, options);
    }
  });

  EmberHandlebars.helper('inner-component', InnerComponent);

  var OuterComponent = Component.extend({
    layout: EmberHandlebars.compile("{{#inner-component}}<span>{{yield}}</span>{{/inner-component}}")
  });

  EmberHandlebars.helper('outer-component', OuterComponent);

  view = EmberView.create({
    template: EmberHandlebars.compile(
      "{{#outer-component}}Hello world{{/outer-component}}"
    )
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div > span').text(), "Hello world");
});

test("yield works inside a conditional in a component that has Ember._Metamorph mixed in", function() {
  var component = Component.extend(Ember._Metamorph, {
    item: "inner",
    layout: Ember.Handlebars.compile("<p>{{item}}</p>{{#if item}}<p>{{yield}}</p>{{/if}}")
  });

  view = Ember.View.create({
    controller: { item: "outer", component: component },
    template: Ember.Handlebars.compile('{{#view component}}{{item}}{{/view}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$().text(), 'innerouter', "{{yield}} renders yielded content inside metamorph component");
});
