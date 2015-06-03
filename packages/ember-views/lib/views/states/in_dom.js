import create from 'ember-metal/platform/create';
import merge from "ember-metal/merge";
import EmberError from "ember-metal/error";
import { addBeforeObserver } from 'ember-metal/observer';

import hasElement from "ember-views/views/states/has_element";
/**
@module ember
@submodule ember-views
*/

var inDOM = create(hasElement);

merge(inDOM, {
  enter(view) {
    // Register the view for event handling. This hash is used by
    // Ember.EventDispatcher to dispatch incoming events.
    if (view.tagName !== '') {
      view._register();
    }

    Ember.runInDebug(function() {
      addBeforeObserver(view, 'elementId', function() {
        throw new EmberError("Changing a view's elementId after creation is not allowed");
      });
    });
  },

  exit(view) {
    view._unregister();
  }
});

export default inDOM;
