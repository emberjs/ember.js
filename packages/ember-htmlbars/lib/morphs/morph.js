import DOMHelper from "dom-helper";
import o_create from 'ember-metal/platform/create';

var HTMLBarsMorph = DOMHelper.prototype.MorphClass;
let guid = 1;

function EmberMorph(DOMHelper, contextualElement) {
  this.HTMLBarsMorph$constructor(DOMHelper, contextualElement);

  this.isElementMorph = true;
  this.emberView = null;
  this.emberToDestroy = null;
  this.streamUnsubscribers = null;
  this.guid = guid++;

  // A component can become dirty either because one of its
  // attributes changed, or because it was re-rendered. If any part
  // of the component's template changes through observation, it has
  // re-rendered from the perpsective of the programming model. This
  // flag is set to true whenever a component becomes dirty because
  // one of its attributes changed, which also triggers the attribute
  // update flag (didUpdateAttrs).
  this.shouldReceiveAttrs = false;
}

var proto = EmberMorph.prototype = o_create(HTMLBarsMorph.prototype);
proto.HTMLBarsMorph$constructor = HTMLBarsMorph;
proto.HTMLBarsMorph$clear = HTMLBarsMorph.prototype.clear;

proto.addDestruction = function(toDestroy) {
  this.emberToDestroy = this.emberToDestroy || [];
  this.emberToDestroy.push(toDestroy);
};

proto.cleanup = function() {
  var view;

  if (view = this.emberView) {
    if (!view.ownerView.isDestroyingSubtree) {
      view.ownerView.isDestroyingSubtree = true;
      if (view.parentView) { view.parentView.removeChild(view); }
    }
  }

  var toDestroy = this.emberToDestroy;
  if (toDestroy) {
    for (var i=0, l=toDestroy.length; i<l; i++) {
      toDestroy[i].destroy();
    }

    this.emberToDestroy = null;
  }
};

proto.didRender = function(env, scope) {
  env.renderedNodes[this.guid] = true;
};

export default EmberMorph;
