import { assign } from 'ember-utils';
import { _addBeforeObserver } from 'ember-metal';
import { Error as EmberError } from 'ember-debug';
import { DEBUG } from 'ember-env-flags';

import hasElement from './has_element';
/**
@module ember
@submodule ember-views
*/

const inDOM = Object.create(hasElement);

assign(inDOM, {
  enter(view) {
    // Register the view for event handling. This hash is used by
    // Ember.EventDispatcher to dispatch incoming events.
    view.renderer.register(view);

    if (DEBUG) {
      _addBeforeObserver(view, 'elementId', () => {
        throw new EmberError('Changing a view\'s elementId after creation is not allowed');
      });
    }
  },

  exit(view) {
    view.renderer.unregister(view);
  }
});

export default inDOM;
