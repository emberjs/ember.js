import EmberError from 'ember-metal/error';
import { get } from 'ember-metal/property_get';

import {
  propertyWillChange,
  propertyDidChange
} from 'ember-metal/property_events';

import { MUTABLE_CELL } from 'ember-views/compat/attrs-proxy';

/**
@module ember
@submodule ember-views
*/
export default {
  // appendChild is only legal while rendering the buffer.
  appendChild() {
    throw new EmberError('You can\'t use appendChild outside of the rendering process');
  },

  $() {
    return undefined;
  },

  getElement() {
    return null;
  },

  legacyAttrWillChange(view, key) {
    if (key in view.attrs && !(key in view)) {
      propertyWillChange(view, key);
    }
  },

  legacyAttrDidChange(view, key) {
    if (key in view.attrs && !(key in view)) {
      propertyDidChange(view, key);
    }
  },

  legacyPropertyDidChange(view, key) {
    let attrs = view.attrs;

    if (attrs && key in attrs) {
      let possibleCell = attrs[key];

      if (possibleCell && possibleCell[MUTABLE_CELL]) {
        let value = get(view, key);
        if (value === possibleCell.value) { return; }
        possibleCell.update(value);
      }
    }
  },

  // Handle events from `Ember.EventDispatcher`
  handleEvent() {
    return true; // continue event propagation
  },

  cleanup() { } ,
  destroyElement() { },

  rerender(view) {
    view.renderer.ensureViewNotRendering(view);
  },
  invokeObserver() { }
};
