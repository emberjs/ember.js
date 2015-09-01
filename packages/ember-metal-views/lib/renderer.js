import run from 'ember-metal/run_loop';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import assign from 'ember-metal/assign';
import setProperties from 'ember-metal/set_properties';
import buildComponentTemplate from 'ember-views/system/build-component-template';
import environment from 'ember-metal/environment';

function Renderer(domHelper, destinedForDOM) {
  this._dom = domHelper;

  // This flag indicates whether the resulting rendered element will be
  // inserted into the DOM. This should be set to `false` if the rendered
  // element is going to be serialized to HTML without being inserted into
  // the DOM (e.g., in FastBoot mode). By default, this flag is the same
  // as whether we are running in an environment with DOM, but may be
  // overridden.
  this._destinedForDOM = destinedForDOM === undefined ?
    environment.hasDOM :
    destinedForDOM;
}

Renderer.prototype.prerenderTopLevelView =
  function Renderer_prerenderTopLevelView(view, renderNode) {
    if (view._state === 'inDOM') {
      throw new Error('You cannot insert a View that has already been rendered');
    }
    view.ownerView = renderNode.emberView = view;
    view._renderNode = renderNode;

    var layout = get(view, 'layout');
    var template = get(view, 'template');

    var componentInfo = { component: view, layout: layout };

    var block = buildComponentTemplate(componentInfo, {}, {
      self: view,
      templates: template ? { default: template.raw } : undefined
    }).block;

    view.renderBlock(block, renderNode);
    view.lastResult = renderNode.lastResult;
    this.clearRenderedViews(view.env);
  };

Renderer.prototype.renderTopLevelView =
  function Renderer_renderTopLevelView(view, renderNode) {
    // Check to see if insertion has been canceled
    if (view._willInsert) {
      view._willInsert = false;
      this.prerenderTopLevelView(view, renderNode);
      this.dispatchLifecycleHooks(view.env);
    }
  };

Renderer.prototype.revalidateTopLevelView =
  function Renderer_revalidateTopLevelView(view) {
    // This guard prevents revalidation on an already-destroyed view.
    if (view._renderNode.lastResult) {
      view._renderNode.lastResult.revalidate(view.env);
      // supports createElement, which operates without moving the view into
      // the inDOM state.
      if (view._state === 'inDOM') {
        this.dispatchLifecycleHooks(view.env);
      }
      this.clearRenderedViews(view.env);
    }
  };

Renderer.prototype.dispatchLifecycleHooks =
  function Renderer_dispatchLifecycleHooks(env) {
    var ownerView = env.view;

    var lifecycleHooks = env.lifecycleHooks;
    var i, hook;

    for (i = 0; i < lifecycleHooks.length; i++) {
      hook = lifecycleHooks[i];
      ownerView._dispatching = hook.type;

      switch (hook.type) {
        case 'didInsertElement': this.didInsertElement(hook.view); break;
        case 'didUpdate': this.didUpdate(hook.view); break;
      }

      this.didRender(hook.view);
    }

    ownerView._dispatching = null;
    env.lifecycleHooks.length = 0;
  };

Renderer.prototype.ensureViewNotRendering =
  function Renderer_ensureViewNotRendering(view) {
    var env = view.ownerView.env;
    if (env && env.renderedViews.indexOf(view.elementId) !== -1) {
      throw new Error('Something you did caused a view to re-render after it rendered but before it was inserted into the DOM.');
    }
  };

export function MorphSet() {
  this.morphs = [];
}

MorphSet.prototype.add = function(morph) {
  this.morphs.push(morph);
  morph.seen = true;
};

MorphSet.prototype.has = function(morph) {
  return morph.seen;
};

MorphSet.prototype.clear = function() {
  let morphs = this.morphs;
  for (let i = 0, l = morphs.length; i < l; i++) {
    morphs[i].seen = false;
  }

  this.morphs = [];
};

Renderer.prototype.clearRenderedViews =
  function Renderer_clearRenderedViews(env) {
    env.renderedNodes.clear();
    env.renderedViews.length = 0;
  };

// This entry point is called from top-level `view.appendTo`
Renderer.prototype.appendTo =
  function Renderer_appendTo(view, target) {
    var morph = this._dom.appendMorph(target);
    morph.ownerNode = morph;
    view._willInsert = true;
    run.schedule('render', this, this.renderTopLevelView, view, morph);
  };

Renderer.prototype.replaceIn =
  function Renderer_replaceIn(view, target) {
    var morph = this._dom.replaceContentWithMorph(target);
    morph.ownerNode = morph;
    view._willInsert = true;
    run.scheduleOnce('render', this, this.renderTopLevelView, view, morph);
  };

Renderer.prototype.createElement =
  function Renderer_createElement(view) {
    var morph = this._dom.createFragmentMorph();
    morph.ownerNode = morph;
    this.prerenderTopLevelView(view, morph);
  };

Renderer.prototype.didCreateElement = function (view, element) {
  if (element) {
    view.element = element;
  }

  if (view._transitionTo) {
    view._transitionTo('hasElement');
  }
}; // hasElement

Renderer.prototype.willInsertElement = function (view) {
  if (view.trigger) { view.trigger('willInsertElement'); }
}; // will place into DOM

Renderer.prototype.setAttrs = function (view, attrs) {
  set(view, 'attrs', attrs);
}; // set attrs the first time

Renderer.prototype.componentInitAttrs = function (component, attrs) {
  component.trigger('didInitAttrs', { attrs });
  component.trigger('didReceiveAttrs', { newAttrs: attrs });
}; // set attrs the first time

Renderer.prototype.didInsertElement = function (view) {
  if (view._transitionTo) {
    view._transitionTo('inDOM');
  }

  if (view.trigger) { view.trigger('didInsertElement'); }
}; // inDOM // placed into DOM

Renderer.prototype.didUpdate = function (view) {
  if (view.trigger) { view.trigger('didUpdate'); }
};

Renderer.prototype.didRender = function (view) {
  if (view.trigger) { view.trigger('didRender'); }
};

Renderer.prototype.updateAttrs = function (view, attrs) {
  this.setAttrs(view, attrs);
}; // setting new attrs

Renderer.prototype.componentUpdateAttrs = function (component, newAttrs) {
  let oldAttrs = null;

  if (component.attrs) {
    oldAttrs = assign({}, component.attrs);
    setProperties(component.attrs, newAttrs);
  } else {
    set(component, 'attrs', newAttrs);
  }

  component.trigger('didUpdateAttrs', { oldAttrs, newAttrs });
  component.trigger('didReceiveAttrs', { oldAttrs, newAttrs });
};

Renderer.prototype.willUpdate = function (view, attrs) {
  if (view._willUpdate) {
    view._willUpdate(attrs);
  }
};

Renderer.prototype.componentWillUpdate = function (component) {
  component.trigger('willUpdate');
};

Renderer.prototype.willRender = function (view) {
  if (view._willRender) {
    view._willRender();
  }
};

Renderer.prototype.componentWillRender = function (component) {
  component.trigger('willRender');
};

Renderer.prototype.remove = function (view, shouldDestroy) {
  this.willDestroyElement(view);

  view._willRemoveElement = true;
  run.schedule('render', this, this.renderElementRemoval, view);
};

Renderer.prototype.renderElementRemoval =
  function Renderer_renderElementRemoval(view) {
    // Use the _willRemoveElement flag to avoid mulitple removal attempts in
    // case many have been scheduled. This should be more performant than using
    // `scheduleOnce`.
    if (view._willRemoveElement) {
      view._willRemoveElement = false;

      if (view._renderNode && view.element && view.element.parentNode) {
        view._renderNode.clear();
      }
      this.didDestroyElement(view);
    }
  };

Renderer.prototype.willRemoveElement = function (/*view*/) {};

Renderer.prototype.willDestroyElement = function (view) {
  if (view._willDestroyElement) {
    view._willDestroyElement();
  }
  if (view.trigger) {
    view.trigger('willDestroyElement');
    view.trigger('willClearRender');
  }

  if (view._transitionTo) {
    view._transitionTo('destroying');
  }
};

Renderer.prototype.didDestroyElement = function (view) {
  view.element = null;

  // Views that are being destroyed should never go back to the preRender state.
  // However if we're just destroying an element on a view (as is the case when
  // using View#remove) then the view should go to a preRender state so that
  // it can be rendered again later.
  if (view._state !== 'destroying' && view._transitionTo) {
    view._transitionTo('preRender');
  }

  if (view.trigger) {
    view.trigger('didDestroyElement');
  }
}; // element destroyed so view.destroy shouldn't try to remove it removedFromDOM

export default Renderer;
