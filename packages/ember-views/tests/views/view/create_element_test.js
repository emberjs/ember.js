import { get } from 'ember-metal/property_get';
import run from 'ember-metal/run_loop';
import EmberView from 'ember-views/views/view';
import { compile } from 'ember-htmlbars-template-compiler';

var view;

QUnit.module('Ember.View#createElement', {
  teardown() {
    run(function() {
      view.destroy();
    });
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
