import { runAppend, runDestroy } from "ember-runtime/tests/utils";
import compile from "ember-template-compiler/system/compile";
import View from "ember-views/views/view";

var view, parentView;

QUnit.module("ember-views: View#render hook", {
  setup() {
    expectDeprecation('Using a custom `.render` function is deprecated and will be removed in Ember 2.0.0.');
  },
  teardown() {
    runDestroy(view);
    runDestroy(parentView);
  }
});

QUnit.test('the render hook replaces a view if present', function(assert) {
  var count = 0;
  view = View.create({
    template: compile('bob'),
    render: function() {
      count++;
    }
  });

  runAppend(view);

  assert.equal(count, 1, 'render called');
  assert.equal(view.$().html(), '<!---->', 'template not rendered');
});

QUnit.test('the render hook can push HTML into the buffer once', function(assert) {
  view = View.create({
    render: function(buffer) {
      buffer.push('<span>Nancy</span>');
    }
  });

  runAppend(view);

  assert.equal(view.$().html(), '<span>Nancy</span>', 'buffer made DOM');
});

QUnit.test('the render hook can push HTML into the buffer on nested view', function(assert) {
  view = View.create({
    render: function(buffer) {
      buffer.push('<span>Nancy</span>');
    }
  });
  parentView = View.create({
    childView: view,
    template: compile('{{view view.childView}}')
  });

  runAppend(parentView);

  assert.equal(view.$().html(), '<span>Nancy</span>', 'buffer made DOM');
});

QUnit.test('the render hook can push arbitrary HTML into the buffer', function(assert) {
  view = View.create({
    render: function(buffer) {
      buffer.push('<span>');
      buffer.push('Nancy</span>');
    }
  });

  runAppend(view);

  assert.equal(view.$().html(), '<span>Nancy</span>', 'buffer made DOM');
});

QUnit.test('the render hook can push HTML into the buffer on tagless view', function(assert) {
  view = View.create({
    tagName: '',
    render: function(buffer) {
      buffer.push('<span>Nancy</span>');
    }
  });

  runAppend(view);

  assert.equal(Ember.$('#qunit-fixture').html(), '<span>Nancy</span>', 'buffer made DOM');
});

QUnit.test('the render hook can push HTML into the buffer on nested tagless view', function(assert) {
  view = View.create({
    tagName: '',
    render: function(buffer) {
      buffer.push('<span>Nancy</span>');
    }
  });
  parentView = View.create({
    childView: view,
    template: compile('{{view view.childView}}')
  });

  runAppend(parentView);

  assert.equal(parentView.$().html(), '<span>Nancy</span>', 'buffer made DOM');
});
