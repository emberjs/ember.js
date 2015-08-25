/*globals EmberDev */
import Ember from 'ember-metal/core';
import { getDebugFunction, setDebugFunction } from 'ember-metal/debug';
import EmberView from 'ember-views/views/view';
import EmberComponent from 'ember-views/components/component';
import Registry from 'container/registry';
import ComponentLookup from 'ember-views/component_lookup';
import run from 'ember-metal/run_loop';
import jQuery from 'ember-views/system/jquery';
import TextField from 'ember-views/views/text_field';
import EmberObject from 'ember-runtime/system/object';
import ContainerView from 'ember-views/views/container_view';
import SafeString from 'htmlbars-util/safe-string';
import precompile from 'ember-template-compiler/compat/precompile';
import compile from 'ember-template-compiler/system/compile';
import template from 'ember-template-compiler/system/template';
import { observersFor } from 'ember-metal/observer';
import Controller from 'ember-runtime/controllers/controller';
import { helper as makeHelper } from 'ember-htmlbars/helper';

import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import { set } from 'ember-metal/property_set';
import { get } from 'ember-metal/property_get';
import { computed } from 'ember-metal/computed';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';

var view, originalLookup, registry, container, lookup, originalViewKeyword;

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

QUnit.module('ember-htmlbars: {{#view}} helper', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);

    originalLookup = Ember.lookup;
    Ember.lookup = lookup = {};

    registry = new Registry();
    container = registry.container();
    registry.optionsForType('template', { instantiate: false });
    registry.register('view:toplevel', EmberView.extend());
    registry.register('component-lookup:main', ComponentLookup);
  },

  teardown() {
    runDestroy(container);
    runDestroy(view);
    registry = container = view = null;

    Ember.lookup = lookup = originalLookup;

    resetKeyword('view', originalViewKeyword);
  }
});

// https://github.com/emberjs/ember.js/issues/120
QUnit.test('should not enter an infinite loop when binding an attribute in Handlebars', function() {
  var LinkView = EmberView.extend({
    classNames: ['app-link'],
    tagName: 'a',
    attributeBindings: ['href'],
    href: '#none',

    click() {
      return false;
    }
  });

  var parentView = EmberView.create({
    linkView: LinkView,
    test: EmberObject.create({ href: 'test' }),
    template: compile('{{#view view.linkView href=view.test.href}} Test {{/view}}')
  });

  runAppend(parentView);

  // Use match, since old IE appends the whole URL
  var href = parentView.$('a').attr('href');
  var classNames = parentView.$('a').attr('class');
  ok(href.match(/(^|\/)test$/), `Expected href to be 'test' but got "${href}"`);
  equal(classNames, 'ember-view app-link');

  runDestroy(parentView);
});

QUnit.test('By default view:toplevel is used', function() {
  var registry = new Registry();

  var DefaultView = viewClass({
    elementId: 'toplevel-view',
    template: compile('hello world')
  });

  registry.register('view:toplevel', DefaultView);

  view = EmberView.extend({
    template: compile('{{view}}'),
    container: registry.container()
  }).create();

  runAppend(view);

  equal(jQuery('#toplevel-view').text(), 'hello world');
});

QUnit.test('By default, without a container, EmberView is used', function() {
  view = EmberView.extend({
    template: compile('{{view tagName="span"}}')
  }).create();

  runAppend(view);

  ok(jQuery('#qunit-fixture').html().toUpperCase().match(/<SPAN/), 'contains view with span');
});

QUnit.test('View lookup - \'fu\'', function() {
  var FuView = viewClass({
    elementId: 'fu',
    template: compile('bro')
  });

  registry.register('view:fu', FuView);

  view = EmberView.extend({
    template: compile('{{view \'fu\'}}'),
    container: container
  }).create();

  runAppend(view);

  equal(jQuery('#fu').text(), 'bro');
});

QUnit.test('View lookup - \'fu\' when fu is a property and a view name', function() {
  var FuView = viewClass({
    elementId: 'fu',
    template: compile('bro')
  });

  registry.register('view:fu', FuView);

  view = EmberView.extend({
    template: compile('{{view \'fu\'}}'),
    context: { fu: 'boom!' },
    container: container
  }).create();

  runAppend(view);

  equal(jQuery('#fu').text(), 'bro');
});

QUnit.test('View lookup - view.computed', function() {
  var FuView = viewClass({
    elementId: 'fu',
    template: compile('bro')
  });

  registry.register('view:fu', FuView);

  view = EmberView.extend({
    template: compile('{{view view.computed}}'),
    container: container,
    computed: 'fu'
  }).create();

  runAppend(view);

  equal(jQuery('#fu').text(), 'bro');
});

QUnit.test('id bindings downgrade to one-time property lookup', function() {
  view = EmberView.extend({
    template: compile('{{#view id=view.meshuggah}}{{view.parentView.meshuggah}}{{/view}}'),
    meshuggah: 'stengah'
  }).create();

  runAppend(view);

  equal(jQuery('#stengah').text(), 'stengah', 'id binding performed property lookup');
  run(view, 'set', 'meshuggah', 'omg');
  equal(jQuery('#stengah').text(), 'omg', 'id didn\'t change');
});

QUnit.test('specifying `id` as a static value works properly', function() {
  view = EmberView.extend({
    template: compile('{{#view id=\'blah\'}}{{view.parentView.meshuggah}}{{/view}}'),
    meshuggah: 'stengah'
  }).create();

  runAppend(view);

  equal(view.$('#blah').text(), 'stengah', 'id binding performed property lookup');
});

QUnit.test('mixing old and new styles of property binding fires a warning, treats value as if it were quoted', function() {
  if (EmberDev && EmberDev.runningProdBuild) {
    ok(true, 'Logging does not occur in production builds');
    return;
  }

  expect(2);

  let oldWarn = getDebugFunction('warn');
  setDebugFunction('warn', function(msg, disableWarning) {
    if (!disableWarning) {
      ok(msg.match(/You're attempting to render a view by passing borfBinding.+, but this syntax is ambiguous./));
    }
  });

  let compiled;
  expectDeprecation(function() {
    compiled = compile('{{#view borfBinding=view.snork}}<p id=\'lol\'>{{view.borf}}</p>{{/view}}');
  }, 'You\'re using legacy binding syntax: borfBinding=view.snork (L1:C8) . Please replace with borf=view.snork');

  view = EmberView.extend({
    template: compiled,
    snork: 'nerd'
  }).create();

  runAppend(view);

  equal(jQuery('#lol').text(), 'nerd', 'awkward mixed syntax treated like binding');

  setDebugFunction('warn', oldWarn);
});

QUnit.test('"Binding"-suffixed bindings are runloop-synchronized [DEPRECATED]', function() {
  var subview;

  var Subview = EmberView.extend({
    init() {
      subview = this;
      return this._super.apply(this, arguments);
    },
    template: compile('<div class="color">{{view.color}}</div>')
  });

  let compiled;
  expectDeprecation(function() {
    compiled = compile('<h1>{{view view.Subview colorBinding="view.color"}}</h1>');
  }, `You're using legacy binding syntax: colorBinding="view.color" (L1:C24) . Please replace with color=view.color`);

  var View = EmberView.extend({
    color: 'mauve',
    Subview: Subview,
    template: compiled
  });

  view = View.create();

  runAppend(view);

  equal(view.$('h1 .color').text(), 'mauve', 'renders bound value');

  run(function() {
    run.schedule('sync', function() {
      equal(get(subview, 'color'), 'mauve', 'bound property is correctly scheduled into the sync queue');
    });

    view.set('color', 'persian rose');

    run.schedule('sync', function() {
      equal(get(subview, 'color'), 'mauve', 'bound property is correctly scheduled into the sync queue');
    });

    run.schedule('afterRender', function() {
      equal(get(subview, 'color'), 'persian rose', 'bound property is correctly scheduled into the sync queue');
    });

    equal(get(subview, 'color'), 'mauve', 'bound property does not update immediately');
  });

  equal(get(subview, 'color'), 'persian rose', 'bound property is updated after runloop flush');
});

QUnit.test('Non-"Binding"-suffixed bindings are runloop-synchronized', function() {
  var subview;

  var Subview = EmberView.extend({
    init() {
      subview = this;
      return this._super.apply(this, arguments);
    },
    template: compile('<div class="color">{{view.attrs.color}}</div>')
  });

  var View = EmberView.extend({
    color: 'mauve',
    Subview: Subview,
    template: compile('<h1>{{view view.Subview color=view.color}}</h1>')
  });

  view = View.create();
  runAppend(view);

  equal(view.$('h1 .color').text(), 'mauve', 'renders bound value');

  run(function() {
    run.schedule('sync', function() {
      equal(get(subview, 'color'), 'mauve', 'bound property is correctly scheduled into the sync queue');
    });

    view.set('color', 'persian rose');

    run.schedule('sync', function() {
      equal(get(subview, 'color'), 'mauve', 'bound property is correctly scheduled into the sync queue');
    });

    run.schedule('afterRender', function() {
      equal(get(subview, 'color'), 'persian rose', 'bound property is correctly scheduled into the sync queue');
    });

    equal(get(subview, 'color'), 'mauve', 'bound property does not update immediately');
  });

  equal(get(subview, 'color'), 'persian rose', 'bound property is updated after runloop flush');
});

QUnit.test('allows you to pass attributes that will be assigned to the class instance, like class="foo"', function() {
  expect(4);

  registry = new Registry();
  container = registry.container();
  registry.register('view:toplevel', EmberView.extend());

  view = EmberView.extend({
    template: compile('{{view id="foo" tagName="h1" class="foo"}}{{#view id="bar" class="bar"}}Bar{{/view}}'),
    container: container
  }).create();

  runAppend(view);

  ok(jQuery('#foo').hasClass('foo'));
  ok(jQuery('#foo').is('h1'));
  ok(jQuery('#bar').hasClass('bar'));
  equal(jQuery('#bar').text(), 'Bar');
});

QUnit.test('Should apply class without condition always', function() {
  view = EmberView.create({
    controller: Ember.Object.create(),
    template: compile('{{#view id="foo" classBinding=":foo"}} Foo{{/view}}')
  });

  runAppend(view);

  ok(jQuery('#foo').hasClass('foo'), 'Always applies classbinding without condition');
});

QUnit.test('Should apply classes when bound controller.* property specified', function() {
  view = EmberView.create({
    controller: {
      someProp: 'foo'
    },
    template: compile('{{#view id="foo" class=controller.someProp}} Foo{{/view}}')
  });

  runAppend(view);

  ok(jQuery('#foo').hasClass('foo'), 'Always applies classbinding without condition');
});

QUnit.test('Should apply classes when bound property specified', function() {
  view = EmberView.create({
    controller: {
      someProp: 'foo'
    },
    template: compile('{{#view id="foo" class=someProp}} Foo{{/view}}')
  });

  runAppend(view);

  ok(jQuery('#foo').hasClass('foo'), 'Always applies classbinding without condition');
});

QUnit.test('Should apply a class from a sub expression', function() {
  registry.register('helper:string-concat', makeHelper(function(params) {
    return params.join('');
  }));

  view = EmberView.create({
    container: container,
    controller: {
      type: 'btn',
      size: 'large'
    },
    template: compile('{{#view id="foo" class=(string-concat type "-" size)}} Foo{{/view}}')
  });

  runAppend(view);

  ok(jQuery('#foo').hasClass('btn-large'), 'applies classname from subexpression');

  run(view, view.set, 'controller.size', 'medium');

  ok(!jQuery('#foo').hasClass('btn-large'), 'removes classname from subexpression update');
  ok(jQuery('#foo').hasClass('btn-medium'), 'adds classname from subexpression update');
});

QUnit.test('Should not apply classes when bound property specified is false', function() {
  view = EmberView.create({
    controller: {
      someProp: false
    },
    template: compile('{{#view id="foo" class=someProp}} Foo{{/view}}')
  });

  runAppend(view);

  ok(!jQuery('#foo').hasClass('some-prop'), 'does not add class when value is falsey');
});

QUnit.test('Should apply classes of the dasherized property name when bound property specified is true', function() {
  view = EmberView.create({
    controller: {
      someProp: true
    },
    template: compile('{{#view id="foo" class=someProp}} Foo{{/view}}')
  });

  runAppend(view);

  ok(jQuery('#foo').hasClass('some-prop'), 'adds dasherized class when value is true');
});

QUnit.test('Should update classes from a bound property', function() {
  var controller = {
    someProp: true
  };

  view = EmberView.create({
    controller: controller,
    template: compile('{{#view id="foo" class=someProp}} Foo{{/view}}')
  });

  runAppend(view);

  ok(jQuery('#foo').hasClass('some-prop'), 'adds dasherized class when value is true');

  run(function() {
    set(controller, 'someProp', false);
  });

  ok(!jQuery('#foo').hasClass('some-prop'), 'does not add class when value is falsey');

  run(function() {
    set(controller, 'someProp', 'fooBar');
  });

  ok(jQuery('#foo').hasClass('fooBar'), 'changes property to string value (but does not dasherize)');
});

QUnit.test('bound properties should be available in the view', function() {
  var FuView = viewClass({
    elementId: 'fu',
    template: compile('{{view.attrs.foo}}')
  });

  registry.register('view:fu', FuView);

  view = EmberView.extend({
    template: compile('{{view \'fu\' foo=view.someProp}}'),
    container: container,
    someProp: 'initial value'
  }).create();

  runAppend(view);

  equal(view.$('#fu').text(), 'initial value');

  run(function() {
    set(view, 'someProp', 'second value');
  });

  equal(view.$('#fu').text(), 'second value');
});

QUnit.test('should escape HTML in normal mustaches', function() {
  view = EmberView.create({
    template: compile('{{view.output}}'),
    output: 'you need to be more <b>bold</b>'
  });

  runAppend(view);
  equal(view.$('b').length, 0, 'does not create an element');
  equal(view.$().text(), 'you need to be more <b>bold</b>', 'inserts entities, not elements');

  run(function() {
    set(view, 'output', 'you are so <i>super</i>');
  });

  equal(view.$().text(), 'you are so <i>super</i>', 'updates with entities, not elements');
  equal(view.$('i').length, 0, 'does not create an element when value is updated');
});

QUnit.test('should not escape HTML in triple mustaches', function() {
  view = EmberView.create({
    template: compile('{{{view.output}}}'),
    output: 'you need to be more <b>bold</b>'
  });

  runAppend(view);

  equal(view.$('b').length, 1, 'creates an element');

  run(function() {
    set(view, 'output', 'you are so <i>super</i>');
  });

  equal(view.$('i').length, 1, 'creates an element when value is updated');
});

QUnit.test('should not escape HTML if string is a Handlebars.SafeString', function() {
  view = EmberView.create({
    template: compile('{{view.output}}'),
    output: new SafeString('you need to be more <b>bold</b>')
  });

  runAppend(view);

  equal(view.$('b').length, 1, 'creates an element');

  run(function() {
    set(view, 'output', new SafeString('you are so <i>super</i>'));
  });

  equal(view.$('i').length, 1, 'creates an element when value is updated');
});

QUnit.test('should teardown observers from bound properties on rerender', function() {
  view = EmberView.create({
    template: compile('{{view.foo}}'),
    foo: 'bar'
  });

  runAppend(view);

  equal(observersFor(view, 'foo').length, 1);

  run(function() {
    view.rerender();
  });

  equal(observersFor(view, 'foo').length, 1);
});

QUnit.test('should update bound values after the view is removed and then re-appended', function() {
  view = EmberView.create({
    template: compile('{{#if view.showStuff}}{{view.boundValue}}{{else}}Not true.{{/if}}'),
    showStuff: true,
    boundValue: 'foo'
  });

  runAppend(view);

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
  runAppend(view);

  run(function() {
    set(view, 'boundValue', 'bar');
  });
  equal(trim(view.$().text()), 'bar');
});

QUnit.test('views set the template of their children to a passed block', function() {
  registry.register('template:parent', compile('<h1>{{#view}}<span>It worked!</span>{{/view}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'parent'
  });

  runAppend(view);
  ok(view.$('h1:has(span)').length === 1, 'renders the passed template inside the parent template');
});

QUnit.test('{{view}} should not override class bindings defined on a child view', function() {
  var LabelView = EmberView.extend({
    container:         container,
    classNameBindings: ['something'],
    something:         'visible'
  });

  registry.register('controller:label', Controller, { instantiate: true });
  registry.register('view:label', LabelView);
  registry.register('template:label', compile('<div id="child-view"></div>'));
  registry.register('template:nester', compile('{{render "label"}}'));

  view = EmberView.create({
    container:    container,
    templateName: 'nester',
    controller:   Controller.create({
      container: container
    })
  });

  runAppend(view);

  ok(view.$('.visible').length > 0, 'class bindings are not overriden');
});

QUnit.test('child views can be inserted using the {{view}} helper', function() {
  registry.register('template:nester', compile('<h1 id="hello-world">Hello {{world}}</h1>{{view view.labelView}}'));
  registry.register('template:nested', compile('<div id="child-view">Goodbye {{cruel}} {{world}}</div>'));

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

  runAppend(view);

  ok(view.$('#hello-world:contains("Hello world!")').length, 'The parent view renders its contents');
  ok(view.$('#child-view:contains("Goodbye cruel world!")').length === 1, 'The child view renders its content once');
  ok(view.$().text().match(/Hello world!.*Goodbye cruel world\!/), 'parent view should appear before the child view');
});

QUnit.test('should be able to explicitly set a view\'s context', function() {
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

  runAppend(view);

  equal(view.$().text(), 'test');
});

QUnit.test('Template views add an elementId to child views created using the view helper', function() {
  registry.register('template:parent', compile('<div>{{view view.childView}}</div>'));
  registry.register('template:child', compile('I can\'t believe it\'s not butter.'));

  var ChildView = EmberView.extend({
    container: container,
    templateName: 'child'
  });

  view = EmberView.create({
    container: container,
    childView: ChildView,
    templateName: 'parent'
  });

  runAppend(view);

  var childView = get(view, 'childViews.firstObject');
  equal(view.$().children().first().children().first().attr('id'), get(childView, 'elementId'));
});

QUnit.test('Child views created using the view helper should have their parent view set properly', function() {
  var template = '{{#view}}{{#view}}{{view}}{{/view}}{{/view}}';

  view = EmberView.create({
    template: compile(template)
  });

  runAppend(view);

  var childView = firstGrandchild(view);
  equal(childView, get(firstChild(childView), 'parentView'), 'parent view is correct');
});

QUnit.test('Child views created using the view helper should have their IDs registered for events', function() {
  var template = '{{view}}{{view id="templateViewTest"}}';

  view = EmberView.create({
    template: compile(template)
  });

  runAppend(view);

  var childView = firstChild(view);
  var id = childView.$()[0].id;
  equal(EmberView.views[id], childView, 'childView without passed ID is registered with View.views so that it can properly receive events from EventDispatcher');

  childView = nthChild(view, 1);
  id = childView.$()[0].id;
  equal(id, 'templateViewTest', 'precond -- id of childView should be set correctly');
  equal(EmberView.views[id], childView, 'childView with passed ID is registered with View.views so that it can properly receive events from EventDispatcher');
});

QUnit.test('Child views created using the view helper and that have a viewName should be registered as properties on their parentView', function() {
  var template = '{{#view}}{{view viewName="ohai"}}{{/view}}';

  view = EmberView.create({
    template: compile(template)
  });

  runAppend(view);

  var parentView = firstChild(view);
  var childView  = firstGrandchild(view);

  equal(get(parentView, 'ohai'), childView);
});

QUnit.test('{{view}} id attribute should set id on layer', function() {
  registry.register('template:foo', compile('{{#view view.idView id="bar"}}baz{{/view}}'));

  var IdView = EmberView;

  view = EmberView.create({
    idView: IdView,
    container: container,
    templateName: 'foo'
  });

  runAppend(view);

  equal(view.$('#bar').length, 1, 'adds id attribute to layer');
  equal(view.$('#bar').text(), 'baz', 'emits content');
});

QUnit.test('{{view}} tag attribute should set tagName of the view', function() {
  registry.register('template:foo', compile('{{#view view.tagView tag="span"}}baz{{/view}}'));

  var TagView = EmberView;

  view = EmberView.create({
    tagView: TagView,
    container: container,
    templateName: 'foo'
  });

  runAppend(view);

  equal(view.$('span').length, 1, 'renders with tag name');
  equal(view.$('span').text(), 'baz', 'emits content');
});

QUnit.test('{{view}} class attribute should set class on layer', function() {
  registry.register('template:foo', compile('{{#view view.idView class="bar"}}baz{{/view}}'));

  var IdView = EmberView;

  view = EmberView.create({
    idView: IdView,
    container: container,
    templateName: 'foo'
  });

  runAppend(view);

  equal(view.$('.bar').length, 1, 'adds class attribute to layer');
  equal(view.$('.bar').text(), 'baz', 'emits content');
});

QUnit.test('{{view}} should not allow attributeBindings to be set', function() {
  expectAssertion(function() {
    view = EmberView.create({
      template: compile('{{view attributeBindings="one two"}}')
    });
    runAppend(view);
  }, /Setting 'attributeBindings' via template helpers is not allowed/);
});

QUnit.test('{{view}} should be able to point to a local view', function() {
  view = EmberView.create({
    template: compile('{{view view.common}}'),

    common: EmberView.extend({
      template: compile('common')
    })
  });

  runAppend(view);

  equal(view.$().text(), 'common', 'tries to look up view name locally');
});

QUnit.test('{{view}} should evaluate class bindings set in the current context', function() {
  view = EmberView.create({
    isView:      true,
    isEditable:  true,
    directClass: 'view-direct',
    isEnabled: true,
    textField: TextField,
    template: compile('{{view view.textField class="unbound" classBinding="view.isEditable:editable view.directClass view.isView view.isEnabled:enabled:disabled"}}')
  });

  runAppend(view);

  ok(view.$('input').hasClass('unbound'), 'sets unbound classes directly');
  ok(view.$('input').hasClass('editable'), 'evaluates classes bound in the current context');
  ok(view.$('input').hasClass('view-direct'), 'evaluates classes bound directly in the current context');
  ok(view.$('input').hasClass('is-view'), 'evaluates classes bound directly to booleans in the current context - dasherizes and sets class when true');
  ok(view.$('input').hasClass('enabled'), 'evaluates ternary operator in classBindings');
  ok(!view.$('input').hasClass('disabled'), 'evaluates ternary operator in classBindings');

  run(function() {
    view.set('isView', false);
    view.set('isEnabled', false);
  });

  ok(!view.$('input').hasClass('is-view'), 'evaluates classes bound directly to booleans in the current context - removes class when false');
  ok(!view.$('input').hasClass('enabled'), 'evaluates ternary operator in classBindings');
  ok(view.$('input').hasClass('disabled'), 'evaluates ternary operator in classBindings');
});

QUnit.test('{{view}} should evaluate other attributes bindings set in the current context', function() {
  view = EmberView.create({
    name: 'myView',
    textField: TextField,
    template: compile('{{view view.textField value=view.name}}')
  });

  runAppend(view);

  equal(view.$('input').val(), 'myView', 'evaluates attributes bound in the current context');
});

QUnit.test('{{view}} should be able to bind class names to truthy properties', function() {
  registry.register('template:template', compile('{{#view view.classBindingView classBinding="view.number:is-truthy"}}foo{{/view}}'));

  var ClassBindingView = EmberView.extend();

  view = EmberView.create({
    classBindingView: ClassBindingView,
    container: container,
    number: 5,
    templateName: 'template'
  });

  runAppend(view);

  equal(view.$('.is-truthy').length, 1, 'sets class name');

  run(function() {
    set(view, 'number', 0);
  });

  equal(view.$('.is-truthy').length, 0, 'removes class name if bound property is set to falsey');
});

QUnit.test('{{view}} should be able to bind class names to truthy or falsy properties', function() {
  registry.register('template:template', compile('{{#view view.classBindingView classBinding="view.number:is-truthy:is-falsy"}}foo{{/view}}'));

  var ClassBindingView = EmberView.extend();

  view = EmberView.create({
    classBindingView: ClassBindingView,
    container: container,
    number: 5,
    templateName: 'template'
  });

  runAppend(view);

  equal(view.$('.is-truthy').length, 1, 'sets class name to truthy value');
  equal(view.$('.is-falsy').length, 0, 'doesn\'t set class name to falsy value');

  run(function() {
    set(view, 'number', 0);
  });

  equal(view.$('.is-truthy').length, 0, 'doesn\'t set class name to truthy value');
  equal(view.$('.is-falsy').length, 1, 'sets class name to falsy value');
});

QUnit.test('a view helper\'s bindings are to the parent context', function() {
  var Subview = EmberView.extend({
    classNameBindings: ['attrs.color'],
    controller: EmberObject.create({
      color: 'green',
      name: 'bar'
    }),
    template: compile('{{attrs.someController.name}} {{name}}')
  });

  var View = EmberView.extend({
    controller: EmberObject.create({
      color: 'mauve',
      name: 'foo'
    }),
    Subview: Subview,
    template: compile('<h1>{{view view.Subview color=color someController=this}}</h1>')
  });

  view = View.create();
  runAppend(view);

  equal(view.$('h1 .mauve').length, 1, 'renders property on helper declaration from parent context');
  equal(view.$('h1 .mauve').text(), 'foo bar', 'renders property bound in template from subview context');
});

QUnit.test('should expose a controller keyword when present on the view', function() {
  var templateString = '{{controller.foo}}{{#view}}{{controller.baz}}{{/view}}';
  view = EmberView.create({
    container: container,
    controller: EmberObject.create({
      foo: 'bar',
      baz: 'bang'
    }),

    template: compile(templateString)
  });

  runAppend(view);

  equal(view.$().text(), 'barbang', 'renders values from controller and parent controller');

  var controller = get(view, 'controller');

  run(function() {
    controller.set('foo', 'BAR');
    controller.set('baz', 'BLARGH');
  });

  equal(view.$().text(), 'BARBLARGH', 'updates the DOM when a bound value is updated');

  runDestroy(view);

  view = EmberView.create({
    controller: 'aString',
    template: compile('{{controller}}')
  });

  runAppend(view);

  equal(view.$().text(), 'aString', 'renders the controller itself if no additional path is specified');
});

QUnit.test('should expose a controller keyword that can be used in conditionals', function() {
  var templateString = '{{#view}}{{#if controller}}{{controller.foo}}{{/if}}{{/view}}';
  view = EmberView.create({
    container: container,
    controller: EmberObject.create({
      foo: 'bar'
    }),

    template: compile(templateString)
  });

  runAppend(view);

  equal(view.$().text(), 'bar', 'renders values from controller and parent controller');

  run(function() {
    view.set('controller', null);
  });

  equal(view.$().text(), '', 'updates the DOM when the controller is changed');
});

QUnit.test('should expose a controller that can be used in the view instance', function() {
  var templateString = '{{#view view.childThing tagName="div"}}Stuff{{/view}}';
  var controller = {
    foo: 'bar'
  };
  var childThingController;
  view = EmberView.create({
    container,
    controller,

    childThing: EmberView.extend({
      didInsertElement() {
        childThingController = get(this, 'controller');
      }
    }),

    template: compile(templateString)
  });

  runAppend(view);

  equal(controller, childThingController, 'childThing should get the same controller as the outer scope');
});

QUnit.test('should expose a controller keyword that persists through Ember.ContainerView', function() {
  var templateString = '{{view view.containerView}}';
  view = EmberView.create({
    containerView: ContainerView,
    container: container,
    controller: EmberObject.create({
      foo: 'bar'
    }),

    template: compile(templateString)
  });

  runAppend(view);

  var containerView = get(view, 'childViews.firstObject');
  var viewInstanceToBeInserted = EmberView.create({
    template: compile('{{controller.foo}}')
  });

  run(function() {
    containerView.pushObject(viewInstanceToBeInserted);
  });

  equal(trim(viewInstanceToBeInserted.$().text()), 'bar', 'renders value from parent\'s controller');
});

QUnit.test('should work with precompiled templates', function() {
  var templateString = precompile('{{view.value}}');
  var compiledTemplate = template(eval(templateString));

  view = EmberView.create({
    value: 'rendered',
    template: compiledTemplate
  });

  runAppend(view);

  equal(view.$().text(), 'rendered', 'the precompiled template was rendered');

  run(function() {
    view.set('value', 'updated');
  });

  equal(view.$().text(), 'updated', 'the precompiled template was updated');
});

QUnit.test('bindings should be relative to the current context [DEPRECATED]', function() {
  view = EmberView.create({
    museumOpen: true,

    museumDetails: EmberObject.create({
      name: 'SFMoMA',
      price: 20
    }),

    museumView: EmberView.extend({
      template: compile('Name: {{view.attrs.name}} Price: ${{view.attrs.dollars}}')
    }),

    template: compile('{{#if view.museumOpen}} {{view view.museumView name=view.museumDetails.name dollars=view.museumDetails.price}} {{/if}}')
  });

  runAppend(view);

  equal(trim(view.$().text()), 'Name: SFMoMA Price: $20', 'should print baz twice');
});

QUnit.test('bindings should respect keywords [DEPRECATED]', function() {
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
      template: compile('Name: {{view.attrs.name}} Price: ${{view.attrs.dollars}}')
    }),

    template: compile('{{#if view.museumOpen}}{{view view.museumView name=controller.museumDetails.name dollars=controller.museumDetails.price}}{{/if}}')
  });

  runAppend(view);

  equal(trim(view.$().text()), 'Name: SFMoMA Price: $20', 'should print baz twice');
});

QUnit.test('should respect keywords', function() {
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
      template: compile('Name: {{view.attrs.name}} Price: ${{view.attrs.dollars}}')
    }),

    template: compile('{{#if view.museumOpen}}{{view view.museumView name=controller.museumDetails.name dollars=controller.museumDetails.price}}{{/if}}')
  });

  runAppend(view);

  equal(trim(view.$().text()), 'Name: SFMoMA Price: $20', 'should print baz twice');
});

QUnit.test('should bind to the property if no registered helper found for a mustache without parameters', function() {
  view = EmberView.extend({
    foobarProperty: computed(function() {
      return 'foobarProperty';
    })
  }).create({
    template: compile('{{view.foobarProperty}}')
  });

  runAppend(view);

  ok(view.$().text() === 'foobarProperty', 'Property was bound to correctly');
});

QUnit.test('{{view}} should be able to point to a local instance of view', function() {
  view = EmberView.create({
    template: compile('{{view view.common}}'),

    common: EmberView.create({
      template: compile('common')
    })
  });

  runAppend(view);
  equal(view.$().text(), 'common', 'tries to look up view name locally');
});

QUnit.test('{{view}} should be able to point to a local instance of subclass of view', function() {
  var MyView = EmberView.extend();
  view = EmberView.create({
    template: compile('{{view view.subclassed}}'),
    subclassed: MyView.create({
      template: compile('subclassed')
    })
  });

  runAppend(view);
  equal(view.$().text(), 'subclassed', 'tries to look up view name locally');
});

QUnit.test('{{view}} asserts that a view class is present', function() {
  var MyView = EmberObject.extend();
  view = EmberView.create({
    template: compile('{{view view.notView}}'),
    notView: MyView.extend({
      template: compile('notView')
    })
  });

  expectAssertion(function() {
    runAppend(view);
  }, /must be a subclass or an instance of Ember.View/);
});

QUnit.test('{{view}} asserts that a view class is present off controller', function() {
  var MyView = EmberObject.extend();
  view = EmberView.create({
    template: compile('{{view notView}}'),
    controller: EmberObject.create({
      notView: MyView.extend({
        template: compile('notView')
      })
    })
  });

  expectAssertion(function() {
    runAppend(view);
  }, /must be a subclass or an instance of Ember.View/);
});

QUnit.test('{{view}} asserts that a view instance is present', function() {
  var MyView = EmberObject.extend();
  view = EmberView.create({
    template: compile('{{view view.notView}}'),
    notView: MyView.create({
      template: compile('notView')
    })
  });

  expectAssertion(function() {
    runAppend(view);
  }, /must be a subclass or an instance of Ember.View/);
});

QUnit.test('{{view}} asserts that a view subclass instance is present off controller', function() {
  var MyView = EmberObject.extend();
  view = EmberView.create({
    template: compile('{{view notView}}'),
    controller: EmberObject.create({
      notView: MyView.create({
        template: compile('notView')
      })
    })
  });

  expectAssertion(function() {
    runAppend(view);
  }, /must be a subclass or an instance of Ember.View/);
});

QUnit.test('Specifying `id` to {{view}} is set on the view.', function() {
  registry.register('view:derp', EmberView.extend({
    template: compile('<div id="view-id">{{view.id}}</div><div id="view-elementId">{{view.elementId}}</div>')
  }));

  view = EmberView.create({
    container: container,
    foo: 'bar',
    template: compile('{{view "derp" id=view.foo}}')
  });

  runAppend(view);

  equal(view.$('#bar').length, 1, 'it uses the provided id for the views elementId');
  equal(view.$('#view-id').text(), 'bar', 'the views id property is set');
  equal(view.$('#view-elementId').text(), 'bar', 'the views elementId property is set');
});

QUnit.test('Specifying `id` to {{view}} does not allow bound id changes.', function() {
  registry.register('view:derp', EmberView.extend({
    template: compile('<div id="view-id">{{view.id}}</div><div id="view-elementId">{{view.elementId}}</div>')
  }));

  view = EmberView.create({
    container: container,
    foo: 'bar',
    template: compile('{{view "derp" id=view.foo}}')
  });

  runAppend(view);

  equal(view.$('#bar #view-id').text(), 'bar', 'the views id property is set');

  run(view, set, view, 'foo', 'baz');

  equal(view.$('#bar #view-id').text(), 'baz', 'the views id property is not changed');
});

QUnit.test('using a bound view name does not change on view name property changes', function() {
  registry.register('view:foo', viewClass({
    elementId: 'foo'
  }));

  registry.register('view:bar', viewClass({
    elementId: 'bar'
  }));

  view = EmberView.extend({
    container,
    elementId: 'parent',
    viewName: 'foo',
    template: compile('{{view view.viewName}}')
  }).create();

  runAppend(view);

  equal(view.$('#foo').length, 1, 'moving from falsey to truthy causes the viewName to be looked up and rendered');

  run(function() {
    set(view, 'viewName', 'bar');
  });

  equal(view.$('#bar').length, 0, 'changing the viewName string after it was initially rendered does not render the new viewName');
  equal(view.$('#foo').length, 1, 'the originally rendered view is still present');
});

QUnit.test('should have the correct action target', function() {
  registry.register('component:x-outer', EmberComponent.extend({
    container,
    layout: compile('{{#x-middle}}{{view innerView dismiss="dismiss"}}{{/x-middle}}'),
    actions: {
      dismiss: function() {
        ok(true, 'We handled the action in the right place');
      }
    },
    innerView: EmberComponent.extend({
      container,
      elementId: 'x-inner'
    })
  }));

  registry.register('component:x-middle', EmberComponent.extend({
    container,
    actions: {
      dismiss: function() {
        throw new Error('action was not supposed to go here');
      }
    }
  }));

  view = EmberView.extend({
    container,
    template: compile('{{x-outer}}')
  }).create();

  runAppend(view);

  run(function() {
    EmberView.views['x-inner'].sendAction('dismiss');
  });
});
