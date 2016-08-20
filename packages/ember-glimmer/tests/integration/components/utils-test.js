import { moduleFor, RenderingTest } from '../../utils/test-case';
import { Component } from '../../utils/helpers';
import {
  getViewBounds,
  getViewClientRects,
  getViewBoundingClientRect
} from 'ember-views/system/utils';

let hasGetClientRects, hasGetBoundingClientRect;
let ClientRectListCtor, ClientRectCtor;

(function() {
  if (document.createRange) {
    let range = document.createRange();

    if (range.getClientRects) {
      let clientRectsList = range.getClientRects();
      hasGetClientRects = true;
      ClientRectListCtor = clientRectsList && clientRectsList.constructor;
    }

    if (range.getBoundingClientRect) {
      let clientRect = range.getBoundingClientRect();
      hasGetBoundingClientRect = true;
      ClientRectCtor = clientRect && clientRect.constructor;
    }
  }
})();

moduleFor('ember-views/system/utils', class extends RenderingTest {
  ['@test getViewBounds on a regular component'](assert) {
    let component;
    this.registerComponent('hi-mom', {
      ComponentClass: Component.extend({
        init() {
          this._super(...arguments);
          component = this;
        }
      }),
      template: `<p>Hi, mom!</p>`
    });

    this.render(`{{hi-mom}}`);

    let bounds = getViewBounds(component);

    assert.equal(bounds.firstNode(), component.element, 'a regular component should have a single node that is its element');
    assert.equal(bounds.lastNode(), component.element, 'a regular component should have a single node that is its element');
  }

  ['@test getViewBounds on a tagless component'](assert) {
    let component;
    this.registerComponent('hi-mom', {
      ComponentClass: Component.extend({
        tagName: '',
        init() {
          this._super(...arguments);
          component = this;
        }
      }),
      template: `<span id="start-node">Hi,</span> <em id="before-end-node">mom</em>!`
    });

    this.render(`{{hi-mom}}`);

    let bounds = getViewBounds(component);

    assert.equal(bounds.firstNode(), this.$('#start-node')[0], 'a tagless component should have a range enclosing all of its nodes');
    assert.equal(bounds.lastNode(), this.$('#before-end-node')[0].nextSibling, 'a tagless component should have a range enclosing all of its nodes');
  }

  ['@test getViewClientRects'](assert) {
    if (!hasGetClientRects || !ClientRectListCtor) {
      assert.ok(true, 'The test environment does not support the DOM API required to run this test.');
      return;
    }

    let component;
    this.registerComponent('hi-mom', {
      ComponentClass: Component.extend({
        init() {
          this._super(...arguments);
          component = this;
        }
      }),
      template: `<p>Hi, mom!</p>`
    });

    this.render(`{{hi-mom}}`);

    assert.ok(getViewClientRects(component) instanceof ClientRectListCtor);
  }

  ['@test getViewBoudningClientRect'](assert) {
    if (!hasGetBoundingClientRect || !ClientRectCtor) {
      assert.ok(true, 'The test environment does not support the DOM API required to run this test.');
      return;
    }

    let component;
    this.registerComponent('hi-mom', {
      ComponentClass: Component.extend({
        init() {
          this._super(...arguments);
          component = this;
        }
      }),
      template: `<p>Hi, mom!</p>`
    });

    this.render(`{{hi-mom}}`);

    assert.ok(getViewBoundingClientRect(component) instanceof ClientRectCtor);
  }
});
