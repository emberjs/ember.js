import DOMHelper from 'dom-helper';
import { debugSeal } from 'ember-metal/debug';

const HTMLBarsMorph = DOMHelper.prototype.MorphClass;
let guid = 1;

export default function EmberMorph(DOMHelper, contextualElement) {
  this.HTMLBarsMorph$constructor(DOMHelper, contextualElement);

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

  debugSeal(this);
}

let proto = EmberMorph.prototype = Object.create(HTMLBarsMorph.prototype);
proto.HTMLBarsMorph$constructor = HTMLBarsMorph;
proto.HTMLBarsMorph$clear = HTMLBarsMorph.prototype.clear;

proto.addDestruction = function(toDestroy) {
  // called from Router.prototype._connectActiveComponentNode for {{render}}
  this.emberToDestroy = this.emberToDestroy || [];
  this.emberToDestroy.push(toDestroy);
};

proto.cleanup = function() {
  let view = this.emberView;

  if (view) {
    let parentView = view.parentView;
    if (parentView && view.ownerView._destroyingSubtreeForView === parentView) {
      parentView.removeChild(view);
    }
  }

  let toDestroy = this.emberToDestroy;

  if (toDestroy) {
    for (let i = 0; i < toDestroy.length; i++) {
      toDestroy[i].destroy();
    }

    this.emberToDestroy = null;
  }
};

proto.didRender = function(env, scope) {
  env.renderedNodes.add(this);
};
