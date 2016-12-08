import { assign } from 'ember-utils';
import {
  runInDebug,
  Error as EmberError,
  _addBeforeObserver
} from 'ember-metal';

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

    runInDebug(() => {
      _addBeforeObserver(view, 'elementId', () => {
        throw new EmberError('Changing a view\'s elementId after creation is not allowed');
      });
    });
  },

  exit(view) {
    view.renderer.unregister(view);
  }
});

export default inDOM;
