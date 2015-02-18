/*jshint newcap:false*/
import run from "ember-metal/run_loop";
import EmberView from "ember-views/views/view";
import { computed } from "ember-metal/computed";
import Container from "ember-runtime/system/container";
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import { A } from "ember-runtime/system/native_array";
import Component from "ember-views/views/component";
import EmberError from "ember-metal/error";
import {
  registerHelper,
  default as helpers
} from "ember-htmlbars/helpers";
import makeViewHelper from "ember-htmlbars/system/make-view-helper";

import compile from "ember-template-compiler/system/compile";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var view, container;

QUnit.module("ember-htmlbars: Support for {{yield}} helper", {
  setup: function() {
    container = new Container();
    container.optionsForType('template', { instantiate: false });
  },
  teardown: function() {
    run(function() {
      Ember.TEMPLATES = {};
    });
    runDestroy(view);
  }
});

test("a view with a layout set renders its template where the {{yield}} helper appears", function() {
  var ViewWithLayout = EmberView.extend({
    layout: compile('<div class="wrapper"><h1>{{title}}</h1>{{yield}}</div>')
  });

  view = EmberView.create({
    withLayout: ViewWithLayout,
    template: compile('{{#view view.withLayout title="My Fancy Page"}}<div class="page-body">Show something interesting here</div>{{/view}}')
  });

  runAppend(view);

  equal(view.$('div.wrapper div.page-body').length, 1, 'page-body is embedded within wrapping my-page');
});

test("block should work properly even when templates are not hard-coded", function() {
  container.register('template:nester', compile('<div class="wrapper"><h1>{{title}}</h1>{{yield}}</div>'));
  container.register('template:nested', compile('{{#view "with-layout" title="My Fancy Page"}}<div class="page-body">Show something interesting here</div>{{/view}}'));

  container.register('view:with-layout', EmberView.extend({
    container: container,
    layoutName: 'nester'
  }));

  view = EmberView.create({
    container: container,
    templateName: 'nested'
  });

  runAppend(view);

  equal(view.$('div.wrapper div.page-body').length, 1, 'page-body is embedded within wrapping my-page');

});

test("templates should yield to block, when the yield is embedded in a hierarchy of virtual views", function() {
  var TimesView = EmberView.extend({
    layout: compile('<div class="times">{{#each item in view.index}}{{yield}}{{/each}}</div>'),
    n: null,
    index: computed(function() {
      var n = get(this, 'n');
      var indexArray = A();
      for (var i=0; i < n; i++) {
        indexArray[i] = i;
      }
      return indexArray;
    })
  });

  view = EmberView.create({
    timesView: TimesView,
    template: compile('<div id="container"><div class="title">Counting to 5</div>{{#view view.timesView n=5}}<div class="times-item">Hello</div>{{/view}}</div>')
  });

  runAppend(view);

  equal(view.$('div#container div.times-item').length, 5, 'times-item is embedded within wrapping container 5 times, as expected');
});

test("templates should yield to block, when the yield is embedded in a hierarchy of non-virtual views", function() {
  var NestingView = EmberView.extend({
    layout: compile('{{#view tagName="div" classNames="nesting"}}{{yield}}{{/view}}')
  });

  view = EmberView.create({
    nestingView: NestingView,
    template: compile('<div id="container">{{#view view.nestingView}}<div id="block">Hello</div>{{/view}}</div>')
  });

  runAppend(view);

  equal(view.$('div#container div.nesting div#block').length, 1, 'nesting view yields correctly even within a view hierarchy in the nesting view');
});

test("block should not be required", function() {
  var YieldingView = EmberView.extend({
    layout: compile('{{#view tagName="div" classNames="yielding"}}{{yield}}{{/view}}')
  });

  view = EmberView.create({
    yieldingView: YieldingView,
    template: compile('<div id="container">{{view view.yieldingView}}</div>')
  });

  runAppend(view);

  equal(view.$('div#container div.yielding').length, 1, 'yielding view is rendered as expected');
});

test("yield uses the outer context", function() {
  var component = Component.extend({
    boundText: "inner",
    layout: compile("<p>{{boundText}}</p><p>{{yield}}</p>")
  });

  view = EmberView.create({
    controller: { boundText: "outer", component: component },
    template: compile('{{#view component}}{{boundText}}{{/view}}')
  });

  runAppend(view);

  equal(view.$('div p:contains(inner) + p:contains(outer)').length, 1, "Yield points at the right context");
});


test("yield inside a conditional uses the outer context [DEPRECATED]", function() {
  var component = Component.extend({
    boundText: "inner",
    truthy: true,
    obj: {},
    layout: compile("<p>{{boundText}}</p><p>{{#if truthy}}{{#with obj}}{{yield}}{{/with}}{{/if}}</p>")
  });

  view = EmberView.create({
    controller: { boundText: "outer", truthy: true, obj: { component: component, truthy: true, boundText: 'insideWith' } },
    template: compile('{{#with obj}}{{#if truthy}}{{#view component}}{{#if truthy}}{{boundText}}{{/if}}{{/view}}{{/if}}{{/with}}')
  });

  expectDeprecation(function() {
    runAppend(view);
  }, 'Using the context switching form of `{{with}}` is deprecated. Please use the keyword form (`{{with foo as bar}}`) instead.');

  equal(view.$('div p:contains(inner) + p:contains(insideWith)').length, 1, "Yield points at the right context");
});

test("outer keyword doesn't mask inner component property", function () {
  var component = Component.extend({
    item: "inner",
    layout: compile("<p>{{item}}</p><p>{{yield}}</p>")
  });

  view = EmberView.create({
    controller: { boundText: "outer", component: component },
    template: compile('{{#with boundText as item}}{{#view component}}{{item}}{{/view}}{{/with}}')
  });

  runAppend(view);

  equal(view.$('div p:contains(inner) + p:contains(outer)').length, 1, "inner component property isn't masked by outer keyword");
});

test("inner keyword doesn't mask yield property", function() {
  var component = Component.extend({
    boundText: "inner",
    layout: compile("{{#with boundText as item}}<p>{{item}}</p><p>{{yield}}</p>{{/with}}")
  });

  view = EmberView.create({
    controller: { item: "outer", component: component },
    template: compile('{{#view component}}{{item}}{{/view}}')
  });

  runAppend(view);

  equal(view.$('div p:contains(inner) + p:contains(outer)').length, 1, "outer property isn't masked by inner keyword");
});

test("can bind a keyword to a component and use it in yield", function() {
  var component = Component.extend({
    content: null,
    layout: compile("<p>{{content}}</p><p>{{yield}}</p>")
  });

  view = EmberView.create({
    controller: { boundText: "outer", component: component },
    template: compile('{{#with boundText as item}}{{#view component contentBinding="item"}}{{item}}{{/view}}{{/with}}')
  });

  runAppend(view);

  equal(view.$('div p:contains(outer) + p:contains(outer)').length, 1, "component and yield have keyword");

  run(function() {
    view.set('controller.boundText', 'update');
  });

  equal(view.$('div p:contains(update) + p:contains(update)').length, 1, "keyword has correctly propagated update");
});

if (!Ember.FEATURES.isEnabled('ember-htmlbars')) {

test("yield uses the layout context for non component [DEPRECATED]", function() {
  view = EmberView.create({
    controller: {
      boundText: "outer",
      inner: {
        boundText: "inner"
      }
    },
    layout: compile("<p>{{boundText}}</p>{{#with inner}}<p>{{yield}}</p>{{/with}}"),
    template: compile('{{boundText}}')
  });

  expectDeprecation(function() {
    runAppend(view);
  }, 'Using the context switching form of `{{with}}` is deprecated. Please use the keyword form (`{{with foo as bar}}`) instead.');

  equal('outerinner', view.$('p').text(), "Yield points at the right context");
});

}

test("yield view should be a virtual view", function() {
  var component = Component.extend({
    isParentComponent: true,

    layout: compile('{{yield}}')
  });

  view = EmberView.create({
    template: compile('{{#view component}}{{view includedComponent}}{{/view}}'),
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

  runAppend(view);
});


test("adding a layout should not affect the context of normal views", function() {
  var parentView = EmberView.create({
    context: "ParentContext"
  });

  view = EmberView.create({
    template:     compile("View context: {{this}}"),
    context:      "ViewContext",
    _parentView:  parentView
  });

  run(function() {
    view.createElement();
  });

  equal(view.$().text(), "View context: ViewContext");


  set(view, 'layout', compile("Layout: {{yield}}"));

  run(function() {
    view.destroyElement();
    view.createElement();
  });

  equal(view.$().text(), "Layout: View context: ViewContext");

  runDestroy(parentView);
});

test("yield should work for views even if _parentView is null", function() {
  view = EmberView.create({
    layout:   compile('Layout: {{yield}}'),
    template: compile("View Content")
  });

  run(function() {
    view.createElement();
  });

  equal(view.$().text(), "Layout: View Content");

});

QUnit.test("simple bindings inside of a yielded template should work properly when the yield is nested inside of another view", function() {
  view = EmberView.create({
    layout:   compile('{{#if view.falsy}}{{else}}{{yield}}{{/if}}'),
    template: compile("{{view.text}}"),
    text: "ohai"
  });

  run(function() {
    view.createElement();
  });

  equal(view.$().text(), "ohai");
});


QUnit.module("ember-htmlbars: Component {{yield}}", {
  setup: function() {},
  teardown: function() {
    runDestroy(view);
    delete helpers['inner-component'];
    delete helpers['outer-component'];
  }
});

test("yield with nested components (#3220)", function(){
  var count = 0;
  var InnerComponent = Component.extend({
    layout: compile("{{yield}}"),
    _yield: function (context, options, morph) {
      count++;
      if (count > 1) throw new EmberError('is looping');
      return this._super(context, options, morph);
    }
  });

  registerHelper('inner-component', makeViewHelper(InnerComponent));

  var OuterComponent = Component.extend({
    layout: compile("{{#inner-component}}<span>{{yield}}</span>{{/inner-component}}")
  });

  registerHelper('outer-component', makeViewHelper(OuterComponent));

  view = EmberView.create({
    template: compile(
      "{{#outer-component}}Hello world{{/outer-component}}"
    )
  });

  runAppend(view);

  equal(view.$('div > span').text(), "Hello world");
});

test("yield works inside a conditional in a component that has Ember._Metamorph mixed in", function() {
  var component = Component.extend(Ember._Metamorph, {
    item: "inner",
    layout: compile("<p>{{item}}</p>{{#if item}}<p>{{yield}}</p>{{/if}}")
  });

  view = Ember.View.create({
    controller: { item: "outer", component: component },
    template: compile('{{#view component}}{{item}}{{/view}}')
  });

  runAppend(view);

  equal(view.$().text(), 'innerouter', "{{yield}} renders yielded content inside metamorph component");
});

test("view keyword works inside component yield", function () {
  var component = Component.extend({
    layout: compile("<p>{{yield}}</p>")
  });

  view = EmberView.create({
    dummyText: 'hello',
    component: component,
    template: compile('{{#view view.component}}{{view.dummyText}}{{/view}}')
  });

  runAppend(view);

  equal(view.$('div > p').text(), "hello", "view keyword inside component yield block should refer to the correct view");
});
