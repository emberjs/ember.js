import { get } from 'ember-metal/property_get';
import run from 'ember-metal/run_loop';
import EmberView from 'ember-views/views/view';
import { equalHTML } from 'ember-views/tests/test-helpers/equal-html';
import compile from 'ember-template-compiler/system/compile';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';

var view, originalViewKeyword;

QUnit.module('Ember.View#createElement', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
  },
  teardown() {
    run(function() {
      view.destroy();
    });
    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('returns the receiver', function() {
  var ret;

  view = EmberView.create();

  run(function() {
    ret = view.createElement();
  });

  equal(ret, view, 'returns receiver');
});

QUnit.test('should assert if `tagName` is an empty string and `classNameBindings` are specified', function() {
  expect(1);

  view = EmberView.create({
    tagName: '',
    foo: true,
    classNameBindings: ['foo:is-foo:is-bar']
  });

  expectAssertion(function() {
    run(function() {
      view.createElement();
    });
  }, /You cannot use `classNameBindings` on a tag-less component/);

  // Prevent further assertions
  view._renderNode = null;
});

import isEnabled from 'ember-metal/features';
if (!isEnabled('ember-glimmer')) {
  // jscs:disable

QUnit.test('calls render and turns resultant string into element', function() {
  view = EmberView.create({
    tagName: 'span',
    template: compile('foo')
  });

  equal(get(view, 'element'), null, 'precondition - has no element');
  run(function() {
    view.createElement();
  });

  var elem = get(view, 'element');
  ok(elem, 'has element now');
  equal(elem.innerHTML, 'foo', 'has innerHTML from context');
  equal(elem.tagName.toString().toLowerCase(), 'span', 'has tagName from view');
});

}
