import run from 'ember-metal/run_loop';
import EmberView from 'ember-views/views/view';
import { compile } from 'ember-template-compiler';

var parentView, childView;

QUnit.module('tests/views/view/child_views_tests.js', {
  setup() {
    childView = EmberView.create({
      template: compile('ber')
    });

    parentView = EmberView.create({
      template: compile('Em{{view view.childView}}'),
      childView: childView
    });
  },

  teardown() {
    run(function() {
      parentView.destroy();
      childView.destroy();
    });
  }
});

// no parent element, buffer, no element
// parent element

// no parent element, no buffer, no element
QUnit.test('should render an inserted child view when the child is inserted before a DOM element is created', function() {
  run(function() {
    parentView.append();
  });

  equal(parentView.$().text(), 'Ember', 'renders the child view after the parent view');
});

QUnit.test('should not duplicate childViews when rerendering', function() {

  var InnerView = EmberView.extend();
  var InnerView2 = EmberView.extend();

  var MiddleView = EmberView.extend({
    innerViewClass: InnerView,
    innerView2Class: InnerView2,
    template: compile('{{view view.innerViewClass}}{{view view.innerView2Class}}')
  });

  var outerView = EmberView.create({
    middleViewClass: MiddleView,
    template: compile('{{view view.middleViewClass viewName="middle"}}')
  });

  run(function() {
    outerView.append();
  });

  equal(outerView.get('middle.childViews.length'), 2, 'precond middle has 2 child views rendered to buffer');

  run(function() {
    outerView.middle.rerender();
  });

  equal(outerView.get('middle.childViews.length'), 2, 'middle has 2 child views rendered to buffer');

  run(function() {
    outerView.destroy();
  });
});

QUnit.test('should remove childViews on destroy', function() {
  var outerView = EmberView.extend({
    component: 'my-thing',
    value: false,
    container: {
      lookup() {
        return {
          componentFor(tagName, container) {
            return Ember.Component.extend({
              destroy() {
                debugger;
                this._super(...arguments);
              }
            });
          },

          layoutFor(tagName, container) {
              return null;
          }
        };
      }
    },
    template: compile(`
      {{#if view.value}}
        {{component view.component value=view.value}}
      {{/if}}
    `)
  }).create();

  run(outerView, 'append');
  run(outerView, 'set', 'value', true);

  equal(outerView.get('childViews.length'), 1);

  run(outerView, 'set', 'value', false);

  equal(outerView.get('childViews.length'), 0, 'expected no views to be leaked');
});
