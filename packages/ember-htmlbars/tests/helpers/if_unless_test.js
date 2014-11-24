import run from "ember-metal/run_loop";
import Namespace from 'ember-runtime/system/namespace';
import Container from 'ember-runtime/system/container';
import EmberView from "ember-views/views/view";
import ObjectProxy from "ember-runtime/system/object_proxy";
import EmberObject from "ember-runtime/system/object";
import _MetamorphView from 'ember-views/views/metamorph_view';
import EmberHandlebars from "ember-handlebars";
import htmlbarsCompile from "ember-htmlbars/system/compile";

import { set } from 'ember-metal/property_set';
import { fmt } from 'ember-runtime/system/string';
import { typeOf } from 'ember-metal/utils';
import { forEach } from 'ember-metal/enumerable_utils';

var compile;
if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  compile = htmlbarsCompile;
} else {
  compile = EmberHandlebars.compile;
}

function appendView(view) {
  run(function() { view.appendTo('#qunit-fixture'); });
}

var originalLookup = Ember.lookup;

var view, lookup, container, TemplateTests;

QUnit.module("ember-htmlbars: {{#if}} and {{#unless}} helpers", {
  setup: function() {
    Ember.lookup = lookup = {};
    lookup.TemplateTests = TemplateTests = Namespace.create();
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
    TemplateTests = null;
  }
});

test("unless should keep the current context (#784) [DEPRECATED]", function() {
  view = EmberView.create({
    o: EmberObject.create({foo: '42'}),

    template: compile('{{#with view.o}}{{#view}}{{#unless view.doesNotExist}}foo: {{foo}}{{/unless}}{{/view}}{{/with}}')
  });

  expectDeprecation(function() {
    appendView(view);
  }, 'Using the context switching form of `{{with}}` is deprecated. Please use the keyword form (`{{with foo as bar}}`) instead. See http://emberjs.com/guides/deprecations/#toc_more-consistent-handlebars-scope for more details.');

  equal(view.$().text(), 'foo: 42');
});

test("The `if` helper tests for `isTruthy` if available", function() {
  view = EmberView.create({
    truthy: EmberObject.create({ isTruthy: true }),
    falsy: EmberObject.create({ isTruthy: false }),

    template: compile('{{#if view.truthy}}Yep{{/if}}{{#if view.falsy}}Nope{{/if}}')
  });

  appendView(view);

  equal(view.$().text(), 'Yep');
});

test("The `if` helper does not print the contents for an object proxy without content", function() {
  view = EmberView.create({
    truthy: ObjectProxy.create({ content: {} }),
    falsy: ObjectProxy.create({ content: null }),

    template: compile('{{#if view.truthy}}Yep{{/if}}{{#if view.falsy}}Nope{{/if}}')
  });

  appendView(view);

  equal(view.$().text(), 'Yep');
});

test("The `if` helper updates if an object proxy gains or loses context", function() {
  view = EmberView.create({
    proxy: ObjectProxy.create({ content: null }),

    template: compile('{{#if view.proxy}}Yep{{/if}}')
  });

  appendView(view);

  equal(view.$().text(), '');

  run(function() {
    view.set('proxy.content', {});
  });

  equal(view.$().text(), 'Yep');

  run(function() {
    view.set('proxy.content', null);
  });

  equal(view.$().text(), '');
});

test("The `if` helper updates if an array is empty or not", function() {
  view = EmberView.create({
    array: Ember.A(),

    template: compile('{{#if view.array}}Yep{{/if}}')
  });

  appendView(view);

  equal(view.$().text(), '');

  run(function() {
    view.get('array').pushObject(1);
  });

  equal(view.$().text(), 'Yep');

  run(function() {
    view.get('array').removeObject(1);
  });

  equal(view.$().text(), '');
});

test("The `if` helper updates when the value changes", function() {
  view = EmberView.create({
    conditional: true,
    template: compile('{{#if view.conditional}}Yep{{/if}}')
  });
  appendView(view);
  equal(view.$().text(), 'Yep');
  run(function(){
    view.set('conditional', false);
  });
  equal(view.$().text(), '');
});

test("The `unbound if` helper does not update when the value changes", function() {
  view = EmberView.create({
    conditional: true,
    template: compile('{{#unbound if view.conditional}}Yep{{/unbound}}')
  });
  appendView(view);
  equal(view.$().text(), 'Yep');
  run(function(){
    view.set('conditional', false);
  });
  equal(view.$().text(), 'Yep');
});

test("The `unless` helper updates when the value changes", function() {
  view = EmberView.create({
    conditional: false,
    template: compile('{{#unless view.conditional}}Nope{{/unless}}')
  });
  appendView(view);
  equal(view.$().text(), 'Nope');
  run(function(){
    view.set('conditional', true);
  });
  equal(view.$().text(), '');
});

test("The `unbound if` helper does not update when the value changes", function() {
  view = EmberView.create({
    conditional: false,
    template: compile('{{#unbound unless view.conditional}}Nope{{/unbound}}')
  });
  appendView(view);
  equal(view.$().text(), 'Nope');
  run(function(){
    view.set('conditional', true);
  });
  equal(view.$().text(), 'Nope');
});

test("The `if` helper ignores a controller option", function() {
  var lookupCalled = false;

  view = EmberView.create({
    container: {
      lookup: function() {
        lookupCalled = true;
      }
    },
    truthy: true,

    template: compile('{{#if view.truthy controller="foo"}}Yep{{/if}}')
  });

  appendView(view);

  equal(lookupCalled, false, 'controller option should NOT be used');
});

test('should not update boundIf if truthiness does not change', function() {
  var renderCount = 0;

  view = EmberView.create({
    template: compile('<h1 id="first">{{#boundIf "view.shouldDisplay"}}{{view view.InnerViewClass}}{{/boundIf}}</h1>'),

    shouldDisplay: true,

    InnerViewClass: EmberView.extend({
      template: compile('bam'),

      render: function() {
        renderCount++;
        return this._super.apply(this, arguments);
      }
    })
  });

  appendView(view);

  equal(renderCount, 1, 'precond - should have rendered once');
  equal(view.$('#first').text(), 'bam', 'renders block when condition is true');

  run(function() {
    set(view, 'shouldDisplay', 1);
  });

  equal(renderCount, 1, 'should not have rerendered');
  equal(view.$('#first').text(), 'bam', 'renders block when condition is true');
});

test('should update the block when object passed to #unless helper changes', function() {
  container.register('template:advice', compile('<h1>{{#unless view.onDrugs}}{{view.doWellInSchool}}{{/unless}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'advice',

    onDrugs: true,
    doWellInSchool: 'Eat your vegetables'
  });

  appendView(view);

  equal(view.$('h1').text(), '', 'hides block if true');

  var tests = [false, null, undefined, [], '', 0];

  forEach(tests, function(val) {
    run(function() {
      set(view, 'onDrugs', val);
    });

    equal(view.$('h1').text(), 'Eat your vegetables', fmt('renders block when conditional is "%@"; %@', [String(val), typeOf(val)]));

    run(function() {
      set(view, 'onDrugs', true);
    });

    equal(view.$('h1').text(), '', 'precond - hides block when conditional is true');
  });
});

test('properties within an if statement should not fail on re-render', function() {
  view = EmberView.create({
    template: compile('{{#if view.value}}{{view.value}}{{/if}}'),
    value: null
  });

  appendView(view);

  equal(view.$().text(), '');

  run(function() {
    view.set('value', 'test');
  });

  equal(view.$().text(), 'test');

  run(function() {
    view.set('value', null);
  });

  equal(view.$().text(), '');
});

test('views within an if statement should be sane on re-render', function() {
  view = EmberView.create({
    template: compile('{{#if view.display}}{{input}}{{/if}}'),
    display: false
  });

  appendView(view);

  equal(view.$('input').length, 0);

  run(function() {
    // Setting twice will trigger the observer twice, this is intentional
    view.set('display', true);
    view.set('display', 'yes');
  });

  var textfield = view.$('input');
  equal(textfield.length, 1);

  // Make sure the view is still registered in View.views
  ok(EmberView.views[textfield.attr('id')]);
});

test('should update the block when object passed to #if helper changes', function() {
  container.register('template:menu', compile('<h1>{{#if view.inception}}{{view.INCEPTION}}{{/if}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'menu',

    INCEPTION: 'BOOOOOOOONG doodoodoodoodooodoodoodoo',
    inception: 'OOOOoooooOOOOOOooooooo'
  });

  appendView(view);

  equal(view.$('h1').text(), 'BOOOOOOOONG doodoodoodoodooodoodoodoo', 'renders block if a string');

  var tests = [false, null, undefined, [], '', 0];

  forEach(tests, function(val) {
    run(function() {
      set(view, 'inception', val);
    });

    equal(view.$('h1').text(), '', fmt('hides block when conditional is "%@"', [String(val)]));

    run(function() {
      set(view, 'inception', true);
    });

    equal(view.$('h1').text(), 'BOOOOOOOONG doodoodoodoodooodoodoodoo', 'precond - renders block when conditional is true');
  });
});

test('should update the block when object passed to #if helper changes and an inverse is supplied', function() {
  container.register('template:menu', compile('<h1>{{#if view.inception}}{{view.INCEPTION}}{{else}}{{view.SAD}}{{/if}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'menu',

    INCEPTION: 'BOOOOOOOONG doodoodoodoodooodoodoodoo',
    inception: false,
    SAD: 'BOONG?'
  });

  appendView(view);

  equal(view.$('h1').text(), 'BOONG?', 'renders alternate if false');

  run(function() { set(view, 'inception', true); });

  var tests = [false, null, undefined, [], '', 0];

  forEach(tests, function(val) {
    run(function() {
      set(view, 'inception', val);
    });

    equal(view.$('h1').text(), 'BOONG?', fmt('renders alternate if %@', [String(val)]));

    run(function() {
      set(view, 'inception', true);
    });

    equal(view.$('h1').text(), 'BOOOOOOOONG doodoodoodoodooodoodoodoo', 'precond - renders block when conditional is true');
  });
});

test('views within an if statement should be sane on re-render', function() {
  view = EmberView.create({
    template: compile('{{#if view.display}}{{input}}{{/if}}'),
    display: false
  });

  appendView(view);

  equal(view.$('input').length, 0);

  run(function() {
    // Setting twice will trigger the observer twice, this is intentional
    view.set('display', true);
    view.set('display', 'yes');
  });

  var textfield = view.$('input');
  equal(textfield.length, 1);

  // Make sure the view is still registered in View.views
  ok(EmberView.views[textfield.attr('id')]);
});

test('the {{this}} helper should not fail on removal', function() {
  view = EmberView.create({
    context: 'abc',
    template: compile('{{#if view.show}}{{this}}{{/if}}'),
    show: true
  });

  appendView(view);

  equal(view.$().text(), 'abc', 'should start property - precond');

  run(function() {
    view.set('show', false);
  });

  equal(view.$().text(), '');
});

test('should update the block when object passed to #unless helper changes', function() {
  container.register('template:advice', compile('<h1>{{#unless view.onDrugs}}{{view.doWellInSchool}}{{/unless}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'advice',

    onDrugs: true,
    doWellInSchool: 'Eat your vegetables'
  });

  appendView(view);

  equal(view.$('h1').text(), '', 'hides block if true');

  var tests = [false, null, undefined, [], '', 0];

  forEach(tests, function(val) {
    run(function() {
      set(view, 'onDrugs', val);
    });

    equal(view.$('h1').text(), 'Eat your vegetables', fmt('renders block when conditional is "%@"; %@', [String(val), typeOf(val)]));

    run(function() {
      set(view, 'onDrugs', true);
    });

    equal(view.$('h1').text(), '', 'precond - hides block when conditional is true');
  });
});

test('properties within an if statement should not fail on re-render', function() {
  view = EmberView.create({
    template: compile('{{#if view.value}}{{view.value}}{{/if}}'),
    value: null
  });

  appendView(view);

  equal(view.$().text(), '');

  run(function() {
    view.set('value', 'test');
  });

  equal(view.$().text(), 'test');

  run(function() {
    view.set('value', null);
  });

  equal(view.$().text(), '');
});

test('views within an if statement should be sane on re-render', function() {
  view = EmberView.create({
    template: compile('{{#if view.display}}{{input}}{{/if}}'),
    display: false
  });

  appendView(view);

  equal(view.$('input').length, 0);

  run(function() {
    // Setting twice will trigger the observer twice, this is intentional
    view.set('display', true);
    view.set('display', 'yes');
  });

  var textfield = view.$('input');
  equal(textfield.length, 1);

  // Make sure the view is still registered in View.views
  ok(EmberView.views[textfield.attr('id')]);
});

test('should update the block when object passed to #if helper changes', function() {
  container.register('template:menu', compile('<h1>{{#if view.inception}}{{view.INCEPTION}}{{/if}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'menu',

    INCEPTION: 'BOOOOOOOONG doodoodoodoodooodoodoodoo',
    inception: 'OOOOoooooOOOOOOooooooo'
  });

  appendView(view);

  equal(view.$('h1').text(), 'BOOOOOOOONG doodoodoodoodooodoodoodoo', 'renders block if a string');

  var tests = [false, null, undefined, [], '', 0];

  forEach(tests, function(val) {
    run(function() {
      set(view, 'inception', val);
    });

    equal(view.$('h1').text(), '', fmt('hides block when conditional is "%@"', [String(val)]));

    run(function() {
      set(view, 'inception', true);
    });

    equal(view.$('h1').text(), 'BOOOOOOOONG doodoodoodoodooodoodoodoo', 'precond - renders block when conditional is true');
  });
});

test('should update the block when object passed to #if helper changes and an inverse is supplied', function() {
  container.register('template:menu', compile('<h1>{{#if view.inception}}{{view.INCEPTION}}{{else}}{{view.SAD}}{{/if}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'menu',

    INCEPTION: 'BOOOOOOOONG doodoodoodoodooodoodoodoo',
    inception: false,
    SAD: 'BOONG?'
  });

  appendView(view);

  equal(view.$('h1').text(), 'BOONG?', 'renders alternate if false');

  run(function() { set(view, 'inception', true); });

  var tests = [false, null, undefined, [], '', 0];

  forEach(tests, function(val) {
    run(function() {
      set(view, 'inception', val);
    });

    equal(view.$('h1').text(), 'BOONG?', fmt('renders alternate if %@', [String(val)]));

    run(function() {
      set(view, 'inception', true);
    });

    equal(view.$('h1').text(), 'BOOOOOOOONG doodoodoodoodooodoodoodoo', 'precond - renders block when conditional is true');
  });
});

test('views within an if statement should be sane on re-render', function() {
  view = EmberView.create({
    template: compile('{{#if view.display}}{{input}}{{/if}}'),
    display: false
  });

  appendView(view);

  equal(view.$('input').length, 0);

  run(function() {
    // Setting twice will trigger the observer twice, this is intentional
    view.set('display', true);
    view.set('display', 'yes');
  });

  var textfield = view.$('input');
  equal(textfield.length, 1);

  // Make sure the view is still registered in View.views
  ok(EmberView.views[textfield.attr('id')]);
});

test('the {{this}} helper should not fail on removal', function() {
  view = EmberView.create({
    context: 'abc',
    template: compile('{{#if view.show}}{{this}}{{/if}}'),
    show: true
  });

  appendView(view);

  equal(view.$().text(), 'abc', 'should start property - precond');

  run(function() {
    view.set('show', false);
  });

  equal(view.$().text(), '');
});

test('edge case: child conditional should not render children if parent conditional becomes false', function() {
  var childCreated = false;
  var child = null;

  view = EmberView.create({
    cond1: true,
    cond2: false,
    viewClass: EmberView.extend({
      init: function() {
        this._super();
        childCreated = true;
        child = this;
      }
    }),
    template: compile('{{#if view.cond1}}{{#if view.cond2}}{{#view view.viewClass}}test{{/view}}{{/if}}{{/if}}')
  });

  appendView(view);

  ok(!childCreated, 'precondition');

  run(function() {
    // The order of these sets is important for the test
    view.set('cond2', true);
    view.set('cond1', false);
  });

  // TODO: Priority Queue, for now ensure correct result.
  //ok(!childCreated, 'child should not be created');
  ok(child.isDestroyed, 'child should be gone');
  equal(view.$().text(), '');
});

test('edge case: rerender appearance of inner virtual view', function() {
  view = EmberView.create({
    tagName: '',
    cond2: false,
    template: compile('{{#if view.cond2}}test{{/if}}')
  });

  appendView(view);
  equal(Ember.$('#qunit-fixture').text(), '');

  run(function() {
    view.set('cond2', true);
  });

  equal(Ember.$('#qunit-fixture').text(), 'test');
});
