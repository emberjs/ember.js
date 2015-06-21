import { get } from 'ember-metal/property_get';
import run from 'ember-metal/run_loop';
import EmberView from 'ember-views/views/view';
import ContainerView from 'ember-views/views/container_view';
import { equalHTML } from 'ember-views/tests/test-helpers/equal-html';
import compile from 'ember-template-compiler/system/compile';

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

QUnit.test('renders the child view templates in the right context', function() {
  expectDeprecation('Setting `childViews` on a Container is deprecated.');

  view = ContainerView.create({
    tagName: 'table',
    childViews: [
      EmberView.create({
        tagName: '',
        template: compile('<tr><td>snorfblax</td></tr>')
      })
    ]
  });

  equal(get(view, 'element'), null, 'precondition - has no element');
  run(function() {
    view.createElement();
  });


  var elem = get(view, 'element');
  ok(elem, 'has element now');
  equal(elem.tagName.toString().toLowerCase(), 'table', 'has tagName from view');
  equalHTML(elem.childNodes, '<tr><td>snorfblax</td></tr>', 'has innerHTML from context');
});

QUnit.test('does not wrap many tr children in tbody elements', function() {
  expectDeprecation('Setting `childViews` on a Container is deprecated.');

  view = ContainerView.create({
    tagName: 'table',
    childViews: [
      EmberView.create({
        tagName: '',
        template: compile('<tr><td>snorfblax</td></tr>')
      }),
      EmberView.create({
        tagName: '',
        template: compile('<tr><td>snorfblax</td></tr>')
      })
    ]
  });

  equal(get(view, 'element'), null, 'precondition - has no element');
  run(function() {
    view.createElement();
  });


  var elem = get(view, 'element');
  ok(elem, 'has element now');
  equalHTML(elem.childNodes, '<tr><td>snorfblax</td></tr><tr><td>snorfblax</td></tr>', 'has innerHTML from context');
  equal(elem.tagName.toString().toLowerCase(), 'table', 'has tagName from view');
});

QUnit.test('generated element include HTML from child views as well', function() {
  expectDeprecation('Setting `childViews` on a Container is deprecated.');

  view = ContainerView.create({
    childViews: [EmberView.create({ elementId: 'foo' })]
  });

  run(function() {
    view.createElement();
  });

  ok(view.$('#foo').length, 'has element with child elementId');
});
