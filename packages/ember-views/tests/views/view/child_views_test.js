import run from 'ember-metal/run_loop';
import EmberView from 'ember-views/views/view';
import Component from 'ember-views/components/component';
import { compile } from 'ember-template-compiler';
import { A as emberA } from 'ember-runtime/system/native_array';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';
import { setOwner } from 'container/owner';

var originalViewKeyword;
var parentView, childView;

import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';

testModule('tests/views/view/child_views_tests.js', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
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
    resetKeyword('view', originalViewKeyword);
  }
});

// no parent element, buffer, no element
// parent element

// no parent element, no buffer, no element
test('should render an inserted child view when the child is inserted before a DOM element is created', function() {
  run(function() {
    parentView.append();
  });

  equal(parentView.$().text(), 'Ember', 'renders the child view after the parent view');
});

test('should not duplicate childViews when rerendering', function() {
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

test('should remove childViews inside {{if}} on destroy', function() {
  var outerView = EmberView.extend({
    component: 'my-thing',
    value: false,
    template: compile(`
      {{#if view.value}}
        {{component view.component value=view.value}}
      {{/if}}
    `)
  }).create();

  setOwner(outerView, {
    lookup() {
      return {
        componentFor() {
          return Component.extend();
        },

        layoutFor() {
          return null;
        }
      };
    }
  });

  run(outerView, 'append');
  run(outerView, 'set', 'value', true);

  equal(outerView.get('childViews.length'), 1);

  run(outerView, 'set', 'value', false);

  equal(outerView.get('childViews.length'), 0, 'expected no views to be leaked');

  run(function() {
    outerView.destroy();
  });
});

test('should remove childViews inside {{each}} on destroy', function() {
  var outerView = EmberView.extend({
    component: 'my-thing',
    init() {
      this._super(...arguments);
      this.value = false;
    },
    template: compile(`
      {{#if view.value}}
        {{#each view.data as |item|}}
          {{component view.component value=item.value}}
        {{/each}}
      {{/if}}
    `)
  }).create();

  setOwner(outerView, {
    lookup() {
      return {
        componentFor() {
          return Component.extend();
        },

        layoutFor() {
          return null;
        }
      };
    }
  });

  run(outerView, 'append');

  equal(outerView.get('childViews.length'), 0);

  run(outerView, 'set', 'data', emberA([
    { id: 1, value: new Date() },
    { id: 2, value: new Date() }
  ]));

  equal(outerView.get('childViews.length'), 0);

  run(outerView, 'set', 'value', true);
  equal(outerView.get('childViews.length'), 2);

  run(outerView, 'set', 'value', false);

  equal(outerView.get('childViews.length'), 0, 'expected no views to be leaked');

  run(function() {
    outerView.destroy();
  });
});
