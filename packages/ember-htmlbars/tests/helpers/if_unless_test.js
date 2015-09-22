import Ember from 'ember-metal/core';
import run from 'ember-metal/run_loop';
import Namespace from 'ember-runtime/system/namespace';
import { Registry } from 'ember-runtime/system/container';
import EmberView from 'ember-views/views/view';
import Component from 'ember-views/components/component';
import ObjectProxy from 'ember-runtime/system/object_proxy';
import EmberObject from 'ember-runtime/system/object';
import compile from 'ember-template-compiler/system/compile';
import ArrayProxy from 'ember-runtime/system/array_proxy';
import { A as emberA } from 'ember-runtime/system/native_array';

import { set } from 'ember-metal/property_set';
import { typeOf } from 'ember-runtime/utils';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';
import ComponentLookup from 'ember-views/component_lookup';

var originalLookup = Ember.lookup;

var view, lookup, registry, container, TemplateTests, originalViewKeyword;

QUnit.module('ember-htmlbars: {{#if}} and {{#unless}} helpers', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);

    Ember.lookup = lookup = {};
    lookup.TemplateTests = TemplateTests = Namespace.create();
    registry = new Registry();
    container = registry.container();
    registry.optionsForType('template', { instantiate: false });
    registry.optionsForType('view', { singleton: false });
    registry.optionsForType('component', { singleton: false });
    registry.register('view:toplevel', EmberView.extend());
    registry.register('component-lookup:main', ComponentLookup);
  },

  teardown() {
    runDestroy(container);
    runDestroy(view);
    registry = container = view = null;

    Ember.lookup = lookup = originalLookup;
    TemplateTests = null;

    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('The `if` helper tests for `isTruthy` if available', function() {
  view = EmberView.create({
    truthy: EmberObject.create({ isTruthy: true }),
    falsy: EmberObject.create({ isTruthy: false }),

    template: compile('{{#if view.truthy}}Yep{{/if}}{{#if view.falsy}}Nope{{/if}}')
  });

  runAppend(view);

  equal(view.$().text(), 'Yep');
});

QUnit.test('The `if` helper does not error on undefined', function() {
  view = EmberView.create({
    undefinedValue: undefined,
    template: compile('{{#if view.undefinedValue}}Yep{{/if}}{{#if (unbound view.undefinedValue)}}Yep{{/if}}')
  });

  runAppend(view);

  equal(view.$().text(), '');
});

QUnit.test('The `unless` helper does not error on undefined', function() {
  view = EmberView.create({
    undefinedValue: undefined,
    template: compile('{{#unless view.undefinedValue}}YepBound{{/unless}}{{#unless (unbound view.undefinedValue)}}YepUnbound{{/unless}}')
  });

  runAppend(view);

  equal(view.$().text(), 'YepBoundYepUnbound');
});

QUnit.test('The `if` helper does not print the contents for an object proxy without content', function() {
  view = EmberView.create({
    truthy: ObjectProxy.create({ content: {} }),
    falsy: ObjectProxy.create({ content: null }),

    template: compile('{{#if view.truthy}}Yep{{/if}}{{#if view.falsy}}Nope{{/if}}')
  });

  runAppend(view);

  equal(view.$().text(), 'Yep');
});

QUnit.test('The `if` helper updates if an object proxy gains or loses context', function() {
  view = EmberView.create({
    proxy: ObjectProxy.create({ content: null }),

    template: compile('{{#if view.proxy}}Yep{{/if}}')
  });

  runAppend(view);

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

function testIfArray(array) {
  view = EmberView.create({
    array: array,

    template: compile('{{#if view.array}}Yep{{/if}}')
  });

  runAppend(view);

  equal(view.$().text(), '');

  run(function() {
    view.get('array').pushObject(1);
  });

  equal(view.$().text(), 'Yep');

  run(function() {
    view.get('array').removeObject(1);
  });

  equal(view.$().text(), '');
}

QUnit.test('The `if` helper updates if an array is empty or not', function() {
  testIfArray(Ember.A());
});

QUnit.test('The `if` helper updates if an array-like object is empty or not', function() {
  testIfArray(ArrayProxy.create({ content: Ember.A([]) }));
});

QUnit.test('The `unless` helper updates if an array-like object is empty or not', function() {
  view = EmberView.create({
    array: ArrayProxy.create({ content: Ember.A([]) }),

    template: compile('{{#unless view.array}}Yep{{/unless}}')
  });

  runAppend(view);

  equal(view.$().text(), 'Yep');

  run(function() {
    view.get('array').pushObject(1);
  });

  equal(view.$().text(), '');

  run(function() {
    view.get('array').removeObject(1);
  });

  equal(view.$().text(), 'Yep');
});

QUnit.test('The `if` helper updates when the value changes', function() {
  view = EmberView.create({
    conditional: true,
    template: compile('{{#if view.conditional}}Yep{{/if}}')
  });
  runAppend(view);
  equal(view.$().text(), 'Yep');
  run(function() {
    view.set('conditional', false);
  });
  equal(view.$().text(), '');
});

QUnit.test('The `if (unbound` helper does not update when the value changes', function() {
  view = EmberView.create({
    conditional: true,
    template: compile('{{#if (unbound view.conditional)}}Yep{{/if}}')
  });
  runAppend(view);
  equal(view.$().text(), 'Yep');
  run(function() {
    view.set('conditional', false);
  });
  equal(view.$().text(), 'Yep');
});

QUnit.test('The `unless` helper updates when the value changes', function() {
  view = EmberView.create({
    conditional: false,
    template: compile('{{#unless view.conditional}}Nope{{/unless}}')
  });
  runAppend(view);
  equal(view.$().text(), 'Nope');
  run(function() {
    view.set('conditional', true);
  });
  equal(view.$().text(), '');
});

QUnit.test('The `if (unbound` helper does not update when the value changes', function() {
  view = EmberView.create({
    conditional: false,
    template: compile('{{#unless (unbound view.conditional)}}Nope{{/unless}}')
  });
  runAppend(view);
  equal(view.$().text(), 'Nope');
  run(function() {
    view.set('conditional', true);
  });
  equal(view.$().text(), 'Nope');
});

QUnit.test('The `if (unbound` helper should work when its inverse is not present', function() {
  view = EmberView.create({
    conditional: false,
    template: compile('{{#if (unbound view.conditional)}}Yep{{/if}}')
  });
  runAppend(view);
  equal(view.$().text(), '');
});

QUnit.test('should not rerender if truthiness does not change', function() {
  view = EmberView.create({
    template: compile('<h1 id="first">{{#if view.shouldDisplay}}{{view view.InnerViewClass}}{{/if}}</h1>'),

    shouldDisplay: true,

    InnerViewClass: EmberView.extend({
      template: compile('bam')
    })
  });

  runAppend(view);

  equal(view.$('#first').text(), 'bam', 'renders block when condition is true');
  equal(view.$('#first div').text(), 'bam', 'inserts a div into the DOM');

  run(function() {
    set(view, 'shouldDisplay', 1);
  });

  equal(view.$('#first').text(), 'bam', 'renders block when condition is true');
});

QUnit.test('should update the block when object passed to #unless helper changes', function() {
  registry.register('template:advice', compile('<h1>{{#unless view.onDrugs}}{{view.doWellInSchool}}{{/unless}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'advice',

    onDrugs: true,
    doWellInSchool: 'Eat your vegetables'
  });

  runAppend(view);

  equal(view.$('h1').text(), '', 'hides block if true');

  var tests = [false, null, undefined, [], '', 0];

  tests.forEach(function(val) {
    run(function() {
      set(view, 'onDrugs', val);
    });

    equal(view.$('h1').text(), 'Eat your vegetables', `renders block when conditional is "${val}"; ${typeOf(val)}`);
    run(function() {
      set(view, 'onDrugs', true);
    });

    equal(view.$('h1').text(), '', 'precond - hides block when conditional is true');
  });
});

QUnit.test('properties within an if statement should not fail on re-render', function() {
  view = EmberView.create({
    template: compile('{{#if view.value}}{{view.value}}{{/if}}'),
    value: null
  });

  runAppend(view);

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

QUnit.test('should update the block when object passed to #if helper changes', function() {
  registry.register('template:menu', compile('<h1>{{#if view.inception}}{{view.INCEPTION}}{{/if}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'menu',

    INCEPTION: 'BOOOOOOOONG doodoodoodoodooodoodoodoo',
    inception: 'OOOOoooooOOOOOOooooooo'
  });

  runAppend(view);

  equal(view.$('h1').text(), 'BOOOOOOOONG doodoodoodoodooodoodoodoo', 'renders block if a string');

  var tests = [false, null, undefined, [], '', 0];

  tests.forEach(function(val) {
    run(function() {
      set(view, 'inception', val);
    });

    equal(view.$('h1').text(), '', `hides block when conditional is "${val}"`);

    run(function() {
      set(view, 'inception', true);
    });

    equal(view.$('h1').text(), 'BOOOOOOOONG doodoodoodoodooodoodoodoo', 'precond - renders block when conditional is true');
  });
});

QUnit.test('should update the block when object passed to #if helper changes and an inverse is supplied', function() {
  registry.register('template:menu', compile('<h1>{{#if view.inception}}{{view.INCEPTION}}{{else}}{{view.SAD}}{{/if}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'menu',

    INCEPTION: 'BOOOOOOOONG doodoodoodoodooodoodoodoo',
    inception: false,
    SAD: 'BOONG?'
  });

  runAppend(view);

  equal(view.$('h1').text(), 'BOONG?', 'renders alternate if false');

  run(function() { set(view, 'inception', true); });

  var tests = [false, null, undefined, [], '', 0];

  tests.forEach(function(val) {
    run(function() {
      set(view, 'inception', val);
    });

    equal(view.$('h1').text(), 'BOONG?', `renders alternate if ${val}`);

    run(function() {
      set(view, 'inception', true);
    });

    equal(view.$('h1').text(), 'BOOOOOOOONG doodoodoodoodooodoodoodoo', 'precond - renders block when conditional is true');
  });
});

QUnit.test('views within an if statement should be sane on re-render', function() {
  view = EmberView.create({
    template: compile('{{#if view.display}}{{view view.MyView}}{{/if}}'),
    MyView: EmberView.extend({
      tagName: 'input'
    }),
    display: false
  });

  runAppend(view);

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

QUnit.test('the {{this}} helper should not fail on removal', function() {
  view = EmberView.create({
    context: 'abc',
    template: compile('{{#if view.show}}{{this}}{{/if}}'),
    show: true
  });

  runAppend(view);

  equal(view.$().text(), 'abc', 'should start property - precond');

  run(function() {
    view.set('show', false);
  });

  equal(view.$().text(), '');
});

QUnit.test('should update the block when object passed to #unless helper changes', function() {
  registry.register('template:advice', compile('<h1>{{#unless view.onDrugs}}{{view.doWellInSchool}}{{/unless}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'advice',

    onDrugs: true,
    doWellInSchool: 'Eat your vegetables'
  });

  runAppend(view);

  equal(view.$('h1').text(), '', 'hides block if true');

  var tests = [false, null, undefined, [], '', 0];

  tests.forEach(function(val) {
    run(function() {
      set(view, 'onDrugs', val);
    });

    equal(view.$('h1').text(), 'Eat your vegetables', `renders block when conditional is "${val}"; ${typeOf(val)}`);

    run(function() {
      set(view, 'onDrugs', true);
    });

    equal(view.$('h1').text(), '', 'precond - hides block when conditional is true');
  });
});

QUnit.test('properties within an if statement should not fail on re-render', function() {
  view = EmberView.create({
    template: compile('{{#if view.value}}{{view.value}}{{/if}}'),
    value: null
  });

  runAppend(view);

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

QUnit.test('should update the block when object passed to #if helper changes', function() {
  registry.register('template:menu', compile('<h1>{{#if view.inception}}{{view.INCEPTION}}{{/if}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'menu',

    INCEPTION: 'BOOOOOOOONG doodoodoodoodooodoodoodoo',
    inception: 'OOOOoooooOOOOOOooooooo'
  });

  runAppend(view);

  equal(view.$('h1').text(), 'BOOOOOOOONG doodoodoodoodooodoodoodoo', 'renders block if a string');

  var tests = [false, null, undefined, [], '', 0];

  tests.forEach(function(val) {
    run(function() {
      set(view, 'inception', val);
    });

    equal(view.$('h1').text(), '', `hides block when conditional is "${val}"`);

    run(function() {
      set(view, 'inception', true);
    });

    equal(view.$('h1').text(), 'BOOOOOOOONG doodoodoodoodooodoodoodoo', 'precond - renders block when conditional is true');
  });
});

QUnit.test('should update the block when object passed to #if helper changes and an inverse is supplied', function() {
  registry.register('template:menu', compile('<h1>{{#if view.inception}}{{view.INCEPTION}}{{else}}{{view.SAD}}{{/if}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'menu',

    INCEPTION: 'BOOOOOOOONG doodoodoodoodooodoodoodoo',
    inception: false,
    SAD: 'BOONG?'
  });

  runAppend(view);

  equal(view.$('h1').text(), 'BOONG?', 'renders alternate if false');

  run(function() { set(view, 'inception', true); });

  var tests = [false, null, undefined, [], '', 0];

  tests.forEach(function(val) {
    run(function() {
      set(view, 'inception', val);
    });

    equal(view.$('h1').text(), 'BOONG?', `renders alternate if ${val}`);

    run(function() {
      set(view, 'inception', true);
    });

    equal(view.$('h1').text(), 'BOOOOOOOONG doodoodoodoodooodoodoodoo', 'precond - renders block when conditional is true');
  });
});

QUnit.test('the {{this}} helper should not fail on removal', function() {
  view = EmberView.create({
    context: 'abc',
    template: compile('{{#if view.show}}{{this}}{{/if}}'),
    show: true
  });

  runAppend(view);

  equal(view.$().text(), 'abc', 'should start property - precond');

  run(function() {
    view.set('show', false);
  });

  equal(view.$().text(), '');
});

QUnit.test('edge case: child conditional should not render children if parent conditional becomes false', function() {
  var childCreated = false;
  var child = null;

  view = EmberView.create({
    cond1: true,
    cond2: false,
    viewClass: EmberView.extend({
      init() {
        this._super.apply(this, arguments);
        childCreated = true;
        child = this;
      }
    }),
    template: compile('{{#if view.cond1}}{{#if view.cond2}}{{#view view.viewClass}}test{{/view}}{{/if}}{{/if}}')
  });

  runAppend(view);

  ok(!childCreated, 'precondition');

  run(function() {
    // The order of these sets is important for the test
    view.set('cond2', true);
    view.set('cond1', false);
  });

  // TODO: Priority Queue, for now ensure correct result.
  ok(!childCreated, 'child should not be created');
  //ok(child.isDestroyed, 'child should be gone');
  equal(view.$().text(), '');
});

QUnit.test('edge case: rerender appearance of inner virtual view', function() {
  view = EmberView.create({
    tagName: '',
    cond2: false,
    template: compile('{{#if view.cond2}}test{{/if}}')
  });

  runAppend(view);
  equal(Ember.$('#qunit-fixture').text(), '');

  run(function() {
    view.set('cond2', true);
  });

  equal(Ember.$('#qunit-fixture').text(), 'test');
});

QUnit.test('`if` helper with inline form: renders the second argument when conditional is truthy', function() {
  view = EmberView.create({
    conditional: true,
    template: compile('{{if view.conditional "truthy" "falsy"}}')
  });

  runAppend(view);

  equal(view.$().text(), 'truthy');
});

QUnit.test('`if` helper with inline form: renders the third argument when conditional is falsy', function() {
  view = EmberView.create({
    conditional: false,
    template: compile('{{if view.conditional "truthy" "falsy"}}')
  });

  runAppend(view);

  equal(view.$().text(), 'falsy');
});

QUnit.test('`if` helper with inline form: can omit the falsy argument', function() {
  view = EmberView.create({
    conditional: true,
    template: compile('{{if view.conditional "truthy"}}')
  });

  runAppend(view);

  equal(view.$().text(), 'truthy');
});

QUnit.test('`if` helper with inline form: can omit the falsy argument and renders nothing when conditional is falsy', function() {
  view = EmberView.create({
    conditional: false,
    template: compile('{{if view.conditional "truthy"}}')
  });

  runAppend(view);

  equal(view.$().text(), '');
});

QUnit.test('`if` helper with inline form: truthy and falsy arguments are changed if conditional changes', function() {
  view = EmberView.create({
    conditional: true,
    template: compile('{{if view.conditional "truthy" "falsy"}}')
  });

  runAppend(view);

  equal(view.$().text(), 'truthy');

  run(function() {
    view.set('conditional', false);
  });

  equal(view.$().text(), 'falsy');
});

QUnit.test('`if` helper with inline form: can use truthy param as binding', function() {
  view = EmberView.create({
    truthy: 'ok',
    conditional: true,
    template: compile('{{if view.conditional view.truthy}}')
  });

  runAppend(view);

  equal(view.$().text(), 'ok');

  run(function() {
    view.set('truthy', 'yes');
  });

  equal(view.$().text(), 'yes');
});

QUnit.test('`if` helper with inline form: can use falsy param as binding', function() {
  view = EmberView.create({
    truthy: 'ok',
    falsy: 'boom',
    conditional: false,
    template: compile('{{if view.conditional view.truthy view.falsy}}')
  });

  runAppend(view);

  equal(view.$().text(), 'boom');

  run(function() {
    view.set('falsy', 'no');
  });

  equal(view.$().text(), 'no');
});

QUnit.test('`if` helper with inline form: raises when using more than three arguments', function() {
  view = EmberView.create({
    conditional: true,
    template: compile('{{if one two three four}}')
  });

  expectAssertion(function() {
    runAppend(view);
  }, /The inline form of the `if` and `unless` helpers expect two or three arguments/);
});

QUnit.test('`if` helper with inline form: raises when using less than two arguments', function() {
  view = EmberView.create({
    conditional: true,
    template: compile('{{if one}}')
  });

  expectAssertion(function() {
    runAppend(view);
  }, /The inline form of the `if` and `unless` helpers expect two or three arguments/);
});

QUnit.test('`if` helper with inline form: works when used in a sub expression', function() {
  view = EmberView.create({
    conditional: true,
    innerConditional: true,
    template: compile('{{if view.conditional (if view.innerConditional "truthy" )}}')
  });

  runAppend(view);

  equal(view.$().text(), 'truthy');
});

QUnit.test('`if` helper with inline form: updates if condition changes in a sub expression', function() {
  view = EmberView.create({
    conditional: true,
    innerConditional: true,
    template: compile('{{if view.conditional (if view.innerConditional "innerTruthy" "innerFalsy")}}')
  });

  runAppend(view);

  equal(view.$().text(), 'innerTruthy');

  run(function() {
    view.set('innerConditional', false);
  });

  equal(view.$().text(), 'innerFalsy');
});

QUnit.test('`if` helper with inline form: can use truthy param as binding in a sub expression', function() {
  view = EmberView.create({
    conditional: true,
    innerConditional: true,
    innerTruthy: 'innerTruthy',
    template: compile('{{if view.conditional (if view.innerConditional view.innerTruthy)}}')
  });

  runAppend(view);

  equal(view.$().text(), 'innerTruthy');

  run(function() {
    view.set('innerTruthy', 'innerOk');
  });

  equal(view.$().text(), 'innerOk');
});

QUnit.test('`if` helper with inline form: respects isTruthy when object changes', function() {
  view = EmberView.create({
    conditional: Ember.Object.create({ isTruthy: false }),
    template: compile('{{if view.conditional "truthy" "falsy"}}')
  });

  runAppend(view);

  equal(view.$().text(), 'falsy');

  run(function() {
    view.set('conditional', Ember.Object.create({ isTruthy: true }));
  });

  equal(view.$().text(), 'truthy');

  run(function() {
    view.set('conditional', Ember.Object.create({ isTruthy: false }));
  });

  equal(view.$().text(), 'falsy');
});

QUnit.test('`if` helper with inline form: respects isTruthy when property changes', function() {
  var candidate = Ember.Object.create({ isTruthy: false });

  view = EmberView.create({
    conditional: candidate,
    template: compile('{{if view.conditional "truthy" "falsy"}}')
  });

  runAppend(view);

  equal(view.$().text(), 'falsy');

  run(function() {
    candidate.set('isTruthy', true);
  });

  equal(view.$().text(), 'truthy');

  run(function() {
    candidate.set('isTruthy', false);
  });

  equal(view.$().text(), 'falsy');
});

QUnit.test('`if` helper with inline form: respects length test when list content changes', function() {
  var list = Ember.A();

  view = EmberView.create({
    conditional: list,
    template: compile('{{if view.conditional "truthy" "falsy"}}')
  });

  runAppend(view);

  equal(view.$().text(), 'falsy');

  run(function() {
    list.pushObject(1);
  });

  equal(view.$().text(), 'truthy');

  run(function() {
    list.replace(0, 1);
  });

  equal(view.$().text(), 'falsy');
});

QUnit.test('`if` helper with inline form: respects length test when list itself', function() {
  view = EmberView.create({
    conditional: [],
    template: compile('{{if view.conditional "truthy" "falsy"}}')
  });

  runAppend(view);

  equal(view.$().text(), 'falsy');

  run(function() {
    view.set('conditional', [1]);
  });

  equal(view.$().text(), 'truthy');

  run(function() {
    view.set('conditional', []);
  });

  equal(view.$().text(), 'falsy');
});

QUnit.test('`if` helper with inline form: updates when given a falsey second argument', function() {
  view = EmberView.create({
    conditional: false,
    template: compile('{{if view.conditional "" "falsy"}}')
  });

  runAppend(view);

  equal(view.$().text(), 'falsy');

  run(function() {
    view.set('conditional', true);
  });

  equal(view.$().text(), '');

  run(function() {
    view.set('conditional', false);
  });

  equal(view.$().text(), 'falsy');
});

QUnit.test('using `if` with an `{{each}}` destroys components when transitioning to and from inverse (GH #12267)', function() {
  let destroyedChildrenCount = 0;

  registry.register('component:foo-bar', Component.extend({
    willDestroy() {
      destroyedChildrenCount++;
    }
  }));
  registry.register('template:components/foo-bar', compile('{{number}}'));

  view = EmberView.create({
    container,
    test: true,
    list: emberA([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),

    template: compile(`
      {{~#if view.test~}}
        {{~#each view.list as |number|~}}
          {{~foo-bar number=number~}}
        {{~/each~}}
      {{~else~}}
        Nothing Here!
      {{~/if~}}`)
  });

  runAppend(view);

  equal(view.$().text(), '12345678910');

  run(() => {
    view.set('test', false);
  });

  equal(view.$().text(), 'Nothing Here!');

  equal(destroyedChildrenCount, 10, 'the children were properly destroyed');
});
