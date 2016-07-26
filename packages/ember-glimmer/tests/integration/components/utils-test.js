import { moduleFor, RenderingTest } from '../../utils/test-case';
import { Component } from '../../utils/helpers';
import {
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
  ['@htmlbars getViewClientRects'](assert) {
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

  ['@htmlbars getViewBoudningClientRect'](assert) {
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
