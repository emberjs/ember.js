import _default from "ember-views/views/states/default";
import {create} from "ember-metal/platform";
import merge from "ember-metal/merge";

/**
@module ember
@submodule ember-views
*/
var preRender = create(_default);

merge(preRender, {
  // a view leaves the preRender state once its element has been
  // created (createElement).
  insertElement: function(view, fn) {
    view.createElement();
    var viewCollection = view.viewHierarchyCollection();

    viewCollection.trigger('willInsertElement');

    fn.call(view);

    // We transition to `inDOM` if the element exists in the DOM
    var element = view.get('element');
    if (document.body.contains(element)) {
      viewCollection.transitionTo('inDOM', false);
      viewCollection.trigger('didInsertElement');
    }
  },

  renderToBufferIfNeeded: function(view, buffer) {
    view.renderToBuffer(buffer);
    return true;
  },

  empty: Ember.K,

  setElement: function(view, value) {
    if (value !== null) {
      view.transitionTo('hasElement');
    }
    return value;
  }
});

export default preRender;
