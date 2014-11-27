/*globals EmberDev */
import { set } from "ember-metal/property_set";
import EmberView from "ember-views/views/view";
import Container from 'container/container';
import run from "ember-metal/run_loop";
import jQuery from "ember-views/system/jquery";
import TextField from 'ember-views/views/text_field';
import Namespace from 'ember-runtime/system/namespace';
import EmberObject from 'ember-runtime/system/object';
import ContainerView from 'ember-views/views/container_view';
import _MetamorphView from 'ember-views/views/metamorph_view';
import HTMLBarsSafeString from 'htmlbars-util/safe-string';
import htmlbarsPrecompile from 'ember-htmlbars/compat/precompile';
import EmberHandlebars from "ember-handlebars";
import htmlbarsCompile from "ember-htmlbars/system/compile";
import htmlbarsTemplate from 'ember-htmlbars/system/template';
import { observersFor } from "ember-metal/observer";
import ObjectController from 'ember-runtime/controllers/object_controller';

import { set } from 'ember-metal/property_set';
import { get } from 'ember-metal/property_get';
import { computed } from 'ember-metal/computed';

var compile, SafeString, precompile, template;
if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  compile = htmlbarsCompile;
  template = htmlbarsTemplate;
  precompile = htmlbarsPrecompile;
  SafeString = HTMLBarsSafeString;
} else {
  compile = EmberHandlebars.compile;
  template = EmberHandlebars.template;
  precompile = EmberHandlebars.precompile;
  SafeString = EmberHandlebars.SafeString;
}

var view, originalLookup, container, lookup;

var trim = jQuery.trim;

function firstGrandchild(view) {
  return get(get(view, 'childViews').objectAt(0), 'childViews').objectAt(0);
}

function nthChild(view, nth) {
  return get(view, 'childViews').objectAt(nth || 0);
}

function viewClass(options) {
  options.container = options.container || container;
  return EmberView.extend(options);
}

var firstChild = nthChild;
var appendView = function(view) {
  run(view, 'appendTo', '#qunit-fixture');
};

QUnit.module("ember-htmlbars: {{#view}} helper", {
  setup: function() {
    originalLookup = Ember.lookup;
    Ember.lookup = lookup = {};

    container = new Container();
    container.optionsForType('template', { instantiate: false });
    container.register('view:default', _MetamorphView);
    container.register('view:toplevel', EmberView.extend());
  },

  teardown: function() {
    run(function() {
      if (container) {
        container.destroy();
      }
      if (view) {
        view.destroy();
      }
      container = view = null;
    });

    Ember.lookup = lookup = originalLookup;
  }
});

// https://github.com/emberjs/ember.js/issues/120
test("should not enter an infinite loop when binding an attribute in Handlebars", function() {
  var LinkView = EmberView.extend({
    classNames: ['app-link'],
    tagName: 'a',
    attributeBindings: ['href'],
    href: '#none',

    click: function() {
      return false;
    }
  });

  var parentView = EmberView.create({
    linkView: LinkView,
    test: EmberObject.create({ href: 'test' }),
    template: compile('{{#view view.linkView href=view.test.href}} Test {{/view}}')
  });

  run(parentView, 'appendTo', '#qunit-fixture');

  // Use match, since old IE appends the whole URL
  var href = parentView.$('a').attr('href');
  ok(href.match(/(^|\/)test$/), 'Expected href to be \'test\' but got "'+href+'"');

  run(parentView, 'destroy');
});

test("By default view:toplevel is used", function() {
  var DefaultView = viewClass({
    elementId: 'toplevel-view',
    template: compile('hello world')
  });

  function lookupFactory(fullName) {
    equal(fullName, 'view:toplevel');

    return DefaultView;
  }

  var container = {
    lookupFactory: lookupFactory
  };

  view = EmberView.extend({
    template: compile('{{view}}'),
    container: container
  }).create();

  appendView(view);

  equal(jQuery('#toplevel-view').text(), 'hello world');
});

test("By default, without a container, EmberView is used", function() {
  view = EmberView.extend({
    template: compile('{{view tagName="span"}}')
  }).create();

  appendView(view);

  ok(jQuery('#qunit-fixture').html().toUpperCase().match(/<SPAN/), 'contains view with span');
});

test("View lookup - App.FuView (DEPRECATED)", function() {
  Ember.lookup = {
    App: {
      FuView: viewClass({
        elementId: "fu",
        template: compile("bro")
      })
    }
  };

  view = viewClass({
    template: compile("{{view App.FuView}}")
  }).create();

  expectDeprecation(function(){
    appendView(view);
  }, /Global lookup of App.FuView from a Handlebars template is deprecated./);

  equal(jQuery('#fu').text(), 'bro');
});

test("View lookup - 'fu'", function() {
  var FuView = viewClass({
    elementId: "fu",
    template: compile("bro")
  });

  function lookupFactory(fullName) {
    equal(fullName, 'view:fu');

    return FuView;
  }

  var container = {
    lookupFactory: lookupFactory
  };

  view = EmberView.extend({
    template: compile("{{view 'fu'}}"),
    container: container
  }).create();

  appendView(view);

  equal(jQuery('#fu').text(), 'bro');
});

test("View lookup - 'fu' when fu is a property and a view name", function() {
  var FuView = viewClass({
    elementId: "fu",
    template: compile("bro")
  });

  function lookupFactory(fullName) {
    equal(fullName, 'view:fu');

    return FuView;
  }

  var container = {
    lookupFactory: lookupFactory
  };

  view = EmberView.extend({
    template: compile("{{view 'fu'}}"),
    context: {fu: 'boom!'},
    container: container
  }).create();

  appendView(view);

  equal(jQuery('#fu').text(), 'bro');
});

test("View lookup - view.computed", function() {
  var FuView = viewClass({
    elementId: "fu",
    template: compile("bro")
  });

  function lookupFactory(fullName) {
    equal(fullName, 'view:fu');

    return FuView;
  }

  var container = {
    lookupFactory: lookupFactory
  };

  view = EmberView.extend({
    template: compile("{{view view.computed}}"),
    container: container,
    computed: 'fu'
  }).create();

  appendView(view);

  equal(jQuery('#fu').text(), 'bro');
});

test("id bindings downgrade to one-time property lookup", function() {
  view = EmberView.extend({
    template: compile("{{#view id=view.meshuggah}}{{view.parentView.meshuggah}}{{/view}}"),
    meshuggah: 'stengah'
  }).create();

  appendView(view);

  equal(jQuery('#stengah').text(), 'stengah', "id binding performed property lookup");
  run(view, 'set', 'meshuggah', 'omg');
  equal(jQuery('#stengah').text(), 'omg', "id didn't change");
});

test("specifying `id` as a static value works properly", function() {
  view = EmberView.extend({
    template: compile("{{#view id='blah'}}{{view.parentView.meshuggah}}{{/view}}"),
    meshuggah: 'stengah'
  }).create();

  appendView(view);

  equal(view.$('#blah').text(), 'stengah', "id binding performed property lookup");
});

test("mixing old and new styles of property binding fires a warning, treats value as if it were quoted", function() {
  if (EmberDev && EmberDev.runningProdBuild){
    ok(true, 'Logging does not occur in production builds');
    return;
  }

  expect(2);

  var oldWarn = Ember.warn;

  Ember.warn = function(msg) {
    ok(msg.match(/You're attempting to render a view by passing borfBinding.+, but this syntax is ambiguous./));
  };

  view = EmberView.extend({
    template: compile("{{#view borfBinding=view.snork}}<p id='lol'>{{view.borf}}</p>{{/view}}"),
    snork: "nerd"
  }).create();

  appendView(view);

  equal(jQuery('#lol').text(), "nerd", "awkward mixed syntax treated like binding");

  Ember.warn = oldWarn;
});

test("allows you to pass attributes that will be assigned to the class instance, like class=\"foo\"", function() {
  expect(4);

  var container = new Container();
  container.register('view:toplevel', EmberView.extend());

  view = EmberView.extend({
    template: compile('{{view id="foo" tagName="h1" class="foo"}}{{#view id="bar" class="bar"}}Bar{{/view}}'),
    container: container
  }).create();

  appendView(view);

  ok(jQuery('#foo').hasClass('foo'));
  ok(jQuery('#foo').is('h1'));
  ok(jQuery('#bar').hasClass('bar'));
  equal(jQuery('#bar').text(), 'Bar');
});

test("Should apply class without condition always", function() {
  view = EmberView.create({
    controller: Ember.Object.create(),
    template: compile('{{#view id="foo" classBinding=":foo"}} Foo{{/view}}')
  });

  appendView(view);

  ok(jQuery('#foo').hasClass('foo'), "Always applies classbinding without condition");
});

test("Should apply classes when bound controller.* property specified", function() {
  view = EmberView.create({
    controller: {
      someProp: 'foo'
    },
    template: compile('{{#view id="foo" class=controller.someProp}} Foo{{/view}}')
  });

  appendView(view);

  ok(jQuery('#foo').hasClass('foo'), "Always applies classbinding without condition");
});

test("Should apply classes when bound property specified", function() {
  view = EmberView.create({
    controller: {
      someProp: 'foo'
    },
    template: compile('{{#view id="foo" class=someProp}} Foo{{/view}}')
  });

  appendView(view);

  ok(jQuery('#foo').hasClass('foo'), "Always applies classbinding without condition");
});

test("Should not apply classes when bound property specified is false", function() {
  view = EmberView.create({
    controller: {
      someProp: false
    },
    template: compile('{{#view id="foo" class=someProp}} Foo{{/view}}')
  });

  appendView(view);

  ok(!jQuery('#foo').hasClass('some-prop'), "does not add class when value is falsey");
});

test("Should apply classes of the dasherized property name when bound property specified is true", function() {
  view = EmberView.create({
    controller: {
      someProp: true
    },
    template: compile('{{#view id="foo" class=someProp}} Foo{{/view}}')
  });

  appendView(view);

  ok(jQuery('#foo').hasClass('some-prop'), "adds dasherized class when value is true");
});

test("Should update classes from a bound property", function() {
  var controller = {
    someProp: true
  };

  view = EmberView.create({
    controller: controller,
    template: compile('{{#view id="foo" class=someProp}} Foo{{/view}}')
  });

  appendView(view);

  ok(jQuery('#foo').hasClass('some-prop'), "adds dasherized class when value is true");

  run(function() {
    set(controller, 'someProp', false);
  });

  ok(!jQuery('#foo').hasClass('some-prop'), "does not add class when value is falsey");

  run(function() {
    set(controller, 'someProp', 'fooBar');
  });

  ok(jQuery('#foo').hasClass('fooBar'), "changes property to string value (but does not dasherize)");
});

test("bound properties should be available in the view", function() {
  var FuView = viewClass({
    elementId: 'fu',
    template: compile("{{view.foo}}")
  });

  function lookupFactory(fullName) {
    return FuView;
  }

  var container = {
    lookupFactory: lookupFactory
  };

  view = EmberView.extend({
    template: compile("{{view 'fu' foo=view.someProp}}"),
    container: container,
    someProp: 'initial value'
  }).create();

  appendView(view);

  equal(view.$('#fu').text(), 'initial value');

  run(function() {
    set(view, 'someProp', 'second value');
  });

  equal(view.$('#fu').text(), 'second value');
});

test('should escape HTML in normal mustaches', function() {
  view = EmberView.create({
    template: compile('{{view.output}}'),
    output: 'you need to be more <b>bold</b>'
  });

  appendView(view);
  equal(view.$('b').length, 0, 'does not create an element');
  equal(view.$().text(), 'you need to be more <b>bold</b>', 'inserts entities, not elements');

  run(function() {
    set(view, 'output', 'you are so <i>super</i>');
  });

  equal(view.$().text(), 'you are so <i>super</i>', 'updates with entities, not elements');
  equal(view.$('i').length, 0, 'does not create an element when value is updated');
});

test('should not escape HTML in triple mustaches', function() {
  view = EmberView.create({
    template: compile('{{{view.output}}}'),
    output: 'you need to be more <b>bold</b>'
  });

  appendView(view);

  equal(view.$('b').length, 1, 'creates an element');

  run(function() {
    set(view, 'output', 'you are so <i>super</i>');
  });

  equal(view.$('i').length, 1, 'creates an element when value is updated');
});

test('should not escape HTML if string is a Handlebars.SafeString', function() {
  view = EmberView.create({
    template: compile('{{view.output}}'),
    output: new SafeString('you need to be more <b>bold</b>')
  });

  appendView(view);

  equal(view.$('b').length, 1, 'creates an element');

  run(function() {
    set(view, 'output', new SafeString('you are so <i>super</i>'));
  });

  equal(view.$('i').length, 1, 'creates an element when value is updated');
});

test('should teardown observers from bound properties on rerender', function() {
  view = EmberView.create({
    template: compile('{{view.foo}}'),
    foo: 'bar'
  });

  appendView(view);

  equal(observersFor(view, 'foo').length, 1);

  run(function() {
    view.rerender();
  });

  equal(observersFor(view, 'foo').length, 1);
});

test('should update bound values after the view is removed and then re-appended', function() {
  view = EmberView.create({
    template: compile('{{#if view.showStuff}}{{view.boundValue}}{{else}}Not true.{{/if}}'),
    showStuff: true,
    boundValue: 'foo'
  });

  appendView(view);

  equal(trim(view.$().text()), 'foo');
  run(function() {
    set(view, 'showStuff', false);
  });
  equal(trim(view.$().text()), 'Not true.');

  run(function() {
    set(view, 'showStuff', true);
  });
  equal(trim(view.$().text()), 'foo');

  run(function() {
    view.remove();
    set(view, 'showStuff', false);
  });
  run(function() {
    set(view, 'showStuff', true);
  });
  appendView(view);

  run(function() {
    set(view, 'boundValue', 'bar');
  });
  equal(trim(view.$().text()), 'bar');
});

test('views set the template of their children to a passed block', function() {
  container.register('template:parent', compile('<h1>{{#view}}<span>It worked!</span>{{/view}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'parent'
  });

  appendView(view);
  ok(view.$('h1:has(span)').length === 1, "renders the passed template inside the parent template");
});

test('{{view}} should not override class bindings defined on a child view', function() {
  var LabelView = EmberView.extend({
    container:         container,
    templateName:      'nested',
    classNameBindings: ['something'],
    something:         'visible'
  });

  container.register('controller:label', ObjectController, { instantiate: true });
  container.register('view:label',       LabelView);
  container.register('template:label',   compile('<div id="child-view"></div>'));
  container.register('template:nester',  compile('{{render "label"}}'));

  view = EmberView.create({
    container:    container,
    templateName: 'nester',
    controller:   ObjectController.create({
      container: container
    })
  });

  appendView(view);

  ok(view.$('.visible').length > 0, 'class bindings are not overriden');
});

test('child views can be inserted using the {{view}} helper', function() {
  container.register('template:nester', compile('<h1 id="hello-world">Hello {{world}}</h1>{{view view.labelView}}'));
  container.register('template:nested', compile('<div id="child-view">Goodbye {{cruel}} {{world}}</div>'));

  var context = {
    world: 'world!'
  };

  var LabelView = EmberView.extend({
    container: container,
    tagName: 'aside',
    templateName: 'nested'
  });

  view = EmberView.create({
    labelView: LabelView,
    container: container,
    templateName: 'nester',
    context: context
  });

  set(context, 'cruel', 'cruel');

  appendView(view);

  ok(view.$('#hello-world:contains("Hello world!")').length, 'The parent view renders its contents');
  ok(view.$('#child-view:contains("Goodbye cruel world!")').length === 1, 'The child view renders its content once');
  ok(view.$().text().match(/Hello world!.*Goodbye cruel world\!/), 'parent view should appear before the child view');
});

test('should be able to explicitly set a view\'s context', function() {
  var context = EmberObject.create({
    test: 'test'
  });

  var CustomContextView = EmberView.extend({
    context: context,
    template: compile('{{test}}')
  });

  view = EmberView.create({
    customContextView: CustomContextView,
    template: compile('{{view view.customContextView}}')
  });

  appendView(view);

  equal(view.$().text(), 'test');
});

test('Template views add an elementId to child views created using the view helper', function() {
  container.register('template:parent', compile('<div>{{view view.childView}}</div>'));
  container.register('template:child',  compile('I can\'t believe it\'s not butter.'));

  var ChildView = EmberView.extend({
    container: container,
    templateName: 'child'
  });

  view = EmberView.create({
    container: container,
    childView: ChildView,
    templateName: 'parent'
  });

  appendView(view);

  var childView = get(view, 'childViews.firstObject');
  equal(view.$().children().first().children().first().attr('id'), get(childView, 'elementId'));
});

test('Child views created using the view helper should have their parent view set properly', function() {
  var template = '{{#view}}{{#view}}{{view}}{{/view}}{{/view}}';

  view = EmberView.create({
    template: compile(template)
  });

  appendView(view);

  var childView = firstGrandchild(view);
  equal(childView, get(firstChild(childView), 'parentView'), 'parent view is correct');
});

test('Child views created using the view helper should have their IDs registered for events', function() {
  var template = '{{view}}{{view id="templateViewTest"}}';

  view = EmberView.create({
    template: compile(template)
  });

  appendView(view);

  var childView = firstChild(view);
  var id = childView.$()[0].id;
  equal(EmberView.views[id], childView, 'childView without passed ID is registered with View.views so that it can properly receive events from EventDispatcher');

  childView = nthChild(view, 1);
  id = childView.$()[0].id;
  equal(id, 'templateViewTest', 'precond -- id of childView should be set correctly');
  equal(EmberView.views[id], childView, 'childView with passed ID is registered with View.views so that it can properly receive events from EventDispatcher');
});

test('Child views created using the view helper and that have a viewName should be registered as properties on their parentView', function() {
  var template = '{{#view}}{{view viewName="ohai"}}{{/view}}';

  view = EmberView.create({
    template: compile(template)
  });

  appendView(view);

  var parentView = firstChild(view);
  var childView  = firstGrandchild(view);

  equal(get(parentView, 'ohai'), childView);
});

test('{{view}} id attribute should set id on layer', function() {
  container.register('template:foo', compile('{{#view view.idView id="bar"}}baz{{/view}}'));

  var IdView = EmberView;

  view = EmberView.create({
    idView: IdView,
    container: container,
    templateName: 'foo'
  });

  appendView(view);

  equal(view.$('#bar').length, 1, 'adds id attribute to layer');
  equal(view.$('#bar').text(), 'baz', 'emits content');
});

test('{{view}} tag attribute should set tagName of the view', function() {
  container.register('template:foo', compile('{{#view view.tagView tag="span"}}baz{{/view}}'));

  var TagView = EmberView;

  view = EmberView.create({
    tagView: TagView,
    container: container,
    templateName: 'foo'
  });

  appendView(view);

  equal(view.$('span').length, 1, 'renders with tag name');
  equal(view.$('span').text(), 'baz', 'emits content');
});

test('{{view}} class attribute should set class on layer', function() {
  container.register('template:foo', compile('{{#view view.idView class="bar"}}baz{{/view}}'));

  var IdView = EmberView;

  view = EmberView.create({
    idView: IdView,
    container: container,
    templateName: 'foo'
  });

  appendView(view);

  equal(view.$('.bar').length, 1, 'adds class attribute to layer');
  equal(view.$('.bar').text(), 'baz', 'emits content');
});

test('{{view}} should not allow attributeBindings to be set', function() {
  expectAssertion(function() {
    view = EmberView.create({
      template: compile('{{view attributeBindings="one two"}}')
    });
    appendView(view);
  }, /Setting 'attributeBindings' via template helpers is not allowed/);
});

test('{{view}} should be able to point to a local view', function() {
  view = EmberView.create({
    template: compile('{{view view.common}}'),

    common: EmberView.extend({
      template: compile('common')
    })
  });

  appendView(view);

  equal(view.$().text(), 'common', 'tries to look up view name locally');
});

test('{{view}} should evaluate class bindings set to global paths DEPRECATED', function() {
  var App;

  run(function() {
    lookup.App = App = Namespace.create({
      isApp:       true,
      isGreat:     true,
      directClass: 'app-direct',
      isEnabled:   true
    });
  });

  view = EmberView.create({
    textField: TextField,
    template: compile('{{view view.textField class="unbound" classBinding="App.isGreat:great App.directClass App.isApp App.isEnabled:enabled:disabled"}}')
  });

  expectDeprecation(function() {
    appendView(view);
  });

  ok(view.$('input').hasClass('unbound'),     'sets unbound classes directly');
  ok(view.$('input').hasClass('great'),       'evaluates classes bound to global paths');
  ok(view.$('input').hasClass('app-direct'),  'evaluates classes bound directly to global paths');
  ok(view.$('input').hasClass('is-app'),      'evaluates classes bound directly to booleans in global paths - dasherizes and sets class when true');
  ok(view.$('input').hasClass('enabled'),     'evaluates ternary operator in classBindings');
  ok(!view.$('input').hasClass('disabled'),   'evaluates ternary operator in classBindings');

  run(function() {
    App.set('isApp', false);
    App.set('isEnabled', false);
  });

  ok(!view.$('input').hasClass('is-app'),     'evaluates classes bound directly to booleans in global paths - removes class when false');
  ok(!view.$('input').hasClass('enabled'),    'evaluates ternary operator in classBindings');
  ok(view.$('input').hasClass('disabled'),    'evaluates ternary operator in classBindings');

  run(function() {
    lookup.App.destroy();
  });
});

test('{{view}} should evaluate class bindings set in the current context', function() {
  view = EmberView.create({
    isView:      true,
    isEditable:  true,
    directClass: 'view-direct',
    isEnabled: true,
    textField: TextField,
    template: compile('{{view view.textField class="unbound" classBinding="view.isEditable:editable view.directClass view.isView view.isEnabled:enabled:disabled"}}')
  });

  appendView(view);

  ok(view.$('input').hasClass('unbound'),     'sets unbound classes directly');
  ok(view.$('input').hasClass('editable'),    'evaluates classes bound in the current context');
  ok(view.$('input').hasClass('view-direct'), 'evaluates classes bound directly in the current context');
  ok(view.$('input').hasClass('is-view'),     'evaluates classes bound directly to booleans in the current context - dasherizes and sets class when true');
  ok(view.$('input').hasClass('enabled'),     'evaluates ternary operator in classBindings');
  ok(!view.$('input').hasClass('disabled'),   'evaluates ternary operator in classBindings');

  run(function() {
    view.set('isView', false);
    view.set('isEnabled', false);
  });

  ok(!view.$('input').hasClass('is-view'),    'evaluates classes bound directly to booleans in the current context - removes class when false');
  ok(!view.$('input').hasClass('enabled'),    'evaluates ternary operator in classBindings');
  ok(view.$('input').hasClass('disabled'),    'evaluates ternary operator in classBindings');
});

test('{{view}} should evaluate class bindings set with either classBinding or classNameBindings from globals DEPRECATED', function() {
  var App;

  run(function() {
    lookup.App = App = Namespace.create({
      isGreat: true,
      isEnabled: true
    });
  });

  view = EmberView.create({
    textField: TextField,
    template: compile('{{view view.textField class="unbound" classBinding="App.isGreat:great App.isEnabled:enabled:disabled" classNameBindings="App.isGreat:really-great App.isEnabled:really-enabled:really-disabled"}}')
  });

  expectDeprecation(function() {
    appendView(view);
  });

  ok(view.$('input').hasClass('unbound'),          'sets unbound classes directly');
  ok(view.$('input').hasClass('great'),            'evaluates classBinding');
  ok(view.$('input').hasClass('really-great'),     'evaluates classNameBinding');
  ok(view.$('input').hasClass('enabled'),          'evaluates ternary operator in classBindings');
  ok(view.$('input').hasClass('really-enabled'),   'evaluates ternary operator in classBindings');
  ok(!view.$('input').hasClass('disabled'),        'evaluates ternary operator in classBindings');
  ok(!view.$('input').hasClass('really-disabled'), 'evaluates ternary operator in classBindings');

  run(function() {
    App.set('isEnabled', false);
  });

  ok(!view.$('input').hasClass('enabled'),        'evaluates ternary operator in classBindings');
  ok(!view.$('input').hasClass('really-enabled'), 'evaluates ternary operator in classBindings');
  ok(view.$('input').hasClass('disabled'),        'evaluates ternary operator in classBindings');
  ok(view.$('input').hasClass('really-disabled'), 'evaluates ternary operator in classBindings');

  run(function() {
    lookup.App.destroy();
  });
});

test('{{view}} should evaluate other attribute bindings set to global paths', function() {
  run(function() {
    lookup.App = Namespace.create({
      name: 'myApp'
    });
  });

  view = EmberView.create({
    textField: TextField,
    template: compile('{{view view.textField valueBinding="App.name"}}')
  });

  expectDeprecation(function() {
    appendView(view);
  }, 'Global lookup of App.name from a Handlebars template is deprecated.');

  equal(view.$('input').val(), 'myApp', 'evaluates attributes bound to global paths');

  run(function() {
    lookup.App.destroy();
  });
});

test('{{view}} should evaluate other attributes bindings set in the current context', function() {
  view = EmberView.create({
    name: 'myView',
    textField: TextField,
    template: compile('{{view view.textField valueBinding="view.name"}}')
  });

  appendView(view);

  equal(view.$('input').val(), 'myView', 'evaluates attributes bound in the current context');
});

test('{{view}} should be able to bind class names to truthy properties', function() {
  container.register('template:template', compile('{{#view view.classBindingView classBinding="view.number:is-truthy"}}foo{{/view}}'));

  var ClassBindingView = EmberView.extend();

  view = EmberView.create({
    classBindingView: ClassBindingView,
    container: container,
    number: 5,
    templateName: 'template'
  });

  appendView(view);

  equal(view.$('.is-truthy').length, 1, 'sets class name');

  run(function() {
    set(view, 'number', 0);
  });

  equal(view.$('.is-truthy').length, 0, 'removes class name if bound property is set to falsey');
});

test('{{view}} should be able to bind class names to truthy or falsy properties', function() {
  container.register('template:template', compile('{{#view view.classBindingView classBinding="view.number:is-truthy:is-falsy"}}foo{{/view}}'));

  var ClassBindingView = EmberView.extend();

  view = EmberView.create({
    classBindingView: ClassBindingView,
    container: container,
    number: 5,
    templateName: 'template'
  });

  appendView(view);

  equal(view.$('.is-truthy').length, 1, 'sets class name to truthy value');
  equal(view.$('.is-falsy').length, 0, 'doesn\'t set class name to falsy value');

  run(function() {
    set(view, 'number', 0);
  });

  equal(view.$('.is-truthy').length, 0, "doesn't set class name to truthy value");
  equal(view.$('.is-falsy').length, 1, "sets class name to falsy value");
});

test('a view helper\'s bindings are to the parent context', function() {
  var Subview = EmberView.extend({
    classNameBindings: ['color'],
    controller: EmberObject.create({
      color: 'green',
      name: 'bar'
    }),
    template: compile('{{view.someController.name}} {{name}}')
  });

  var View = EmberView.extend({
    controller: EmberObject.create({
      color: 'mauve',
      name: 'foo'
    }),
    Subview: Subview,
    template: compile('<h1>{{view view.Subview colorBinding="color" someControllerBinding="this"}}</h1>')
  });

  view = View.create();
  appendView(view);

  equal(view.$('h1 .mauve').length, 1, 'renders property on helper declaration from parent context');
  equal(view.$('h1 .mauve').text(), 'foo bar', 'renders property bound in template from subview context');
});

test('should expose a controller keyword when present on the view', function() {
  var templateString = '{{controller.foo}}{{#view}}{{controller.baz}}{{/view}}';
  view = EmberView.create({
    container: container,
    controller: EmberObject.create({
      foo: 'bar',
      baz: 'bang'
    }),

    template: compile(templateString)
  });

  appendView(view);

  equal(view.$().text(), 'barbang', 'renders values from controller and parent controller');

  var controller = get(view, 'controller');

  run(function() {
    controller.set('foo', 'BAR');
    controller.set('baz', 'BLARGH');
  });

  equal(view.$().text(), 'BARBLARGH', 'updates the DOM when a bound value is updated');

  run(function() {
    view.destroy();
  });

  view = EmberView.create({
    controller: 'aString',
    template: compile('{{controller}}')
  });

  appendView(view);

  equal(view.$().text(), 'aString', 'renders the controller itself if no additional path is specified');
});

test('should expose a controller keyword that can be used in conditionals', function() {
  var templateString = '{{#view}}{{#if controller}}{{controller.foo}}{{/if}}{{/view}}';
  view = EmberView.create({
    container: container,
    controller: EmberObject.create({
      foo: 'bar'
    }),

    template: compile(templateString)
  });

  appendView(view);

  equal(view.$().text(), 'bar', 'renders values from controller and parent controller');

  run(function() {
    view.set('controller', null);
  });

  equal(view.$().text(), '', 'updates the DOM when the controller is changed');
});

test('should expose a controller keyword that persists through Ember.ContainerView', function() {
  var templateString = '{{view view.containerView}}';
  view = EmberView.create({
    containerView: ContainerView,
    container: container,
    controller: EmberObject.create({
      foo: 'bar'
    }),

    template: compile(templateString)
  });

  appendView(view);

  var containerView = get(view, 'childViews.firstObject');
  var viewInstanceToBeInserted = EmberView.create({
    template: EmberHandlebars.compile('{{controller.foo}}')
  });

  run(function() {
    containerView.pushObject(viewInstanceToBeInserted);
  });

  equal(trim(viewInstanceToBeInserted.$().text()), 'bar', 'renders value from parent\'s controller');
});

test('should work with precompiled templates', function() {
  var templateString = precompile('{{view.value}}');
  var compiledTemplate = template(eval(templateString));

  view = EmberView.create({
    value: 'rendered',
    template: compiledTemplate
  });

  appendView(view);

  equal(view.$().text(), 'rendered', 'the precompiled template was rendered');

  run(function() {
    view.set('value', 'updated');
  });

  equal(view.$().text(), 'updated', 'the precompiled template was updated');
});

test('bindings should be relative to the current context', function() {
  view = EmberView.create({
    museumOpen: true,

    museumDetails: EmberObject.create({
      name: 'SFMoMA',
      price: 20
    }),

    museumView: EmberView.extend({
      template: compile('Name: {{view.name}} Price: ${{view.dollars}}')
    }),

    template: compile('{{#if view.museumOpen}} {{view view.museumView nameBinding="view.museumDetails.name" dollarsBinding="view.museumDetails.price"}} {{/if}}')
  });

  appendView(view);

  equal(trim(view.$().text()), 'Name: SFMoMA Price: $20', 'should print baz twice');
});

test('bindings should respect keywords', function() {
  view = EmberView.create({
    museumOpen: true,

    controller: {
      museumOpen: true,
      museumDetails: EmberObject.create({
        name: 'SFMoMA',
        price: 20
      })
    },

    museumView: EmberView.extend({
      template: compile('Name: {{view.name}} Price: ${{view.dollars}}')
    }),

    template: compile('{{#if view.museumOpen}}{{view view.museumView nameBinding="controller.museumDetails.name" dollarsBinding="controller.museumDetails.price"}}{{/if}}')
  });

  appendView(view);

  equal(trim(view.$().text()), 'Name: SFMoMA Price: $20', 'should print baz twice');
});

test('should bind to the property if no registered helper found for a mustache without parameters', function() {
  view = EmberView.createWithMixins({
    template: EmberHandlebars.compile('{{view.foobarProperty}}'),
    foobarProperty: computed(function() {
      return 'foobarProperty';
    })
  });

  appendView(view);

  ok(view.$().text() === 'foobarProperty', 'Property was bound to correctly');
});
