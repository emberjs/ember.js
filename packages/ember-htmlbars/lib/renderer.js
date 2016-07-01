import run from 'ember-metal/run_loop';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import assign from 'ember-metal/assign';
import setProperties from 'ember-metal/set_properties';
import buildComponentTemplate from 'ember-htmlbars/system/build-component-template';
import { environment } from 'ember-environment';
import { internal } from 'htmlbars-runtime';
import { renderHTMLBarsBlock } from 'ember-htmlbars/system/render-view';

export function Renderer(domHelper, { destinedForDOM } = {}) {
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

    let layout = get(view, 'layout');
    let template = get(view, 'template');

    let componentInfo = { component: view, layout: layout };

    let block = buildComponentTemplate(componentInfo, {}, {
      self: view,
      templates: template ? { default: template.raw } : undefined
    }).block;

    renderHTMLBarsBlock(view, block, renderNode);
    view.lastResult = renderNode.lastResult;
    this.clearRenderedViews(view.env);
  };

Renderer.prototype.renderTopLevelView =
  function Renderer_renderTopLevelView(view, renderNode) {
    // Check to see if insertion has been canceled.
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
    let ownerView = env.view;

    let lifecycleHooks = env.lifecycleHooks;
    let i, hook;

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
    let env = view.ownerView.env;
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
  for (let i = 0; i < morphs.length; i++) {
    morphs[i].seen = false;
  }

  this.morphs = [];
};

Renderer.prototype.clearRenderedViews =
  function Renderer_clearRenderedViews(env) {
    env.renderedNodes.clear();
    env.renderedViews.length = 0;
  };

// This entry point is called from top-level `view.appendTo`.
Renderer.prototype.appendTo =
  function Renderer_appendTo(view, target) {
    let morph = this._dom.appendMorph(target);
    morph.ownerNode = morph;
    view._willInsert = true;
    run.schedule('render', this, this.renderTopLevelView, view, morph);
  };

Renderer.prototype.replaceIn =
  function Renderer_replaceIn(view, target) {
    let morph = this._dom.replaceContentWithMorph(target);
    morph.ownerNode = morph;
    view._willInsert = true;
    run.scheduleOnce('render', this, this.renderTopLevelView, view, morph);
  };

Renderer.prototype.createElement =
  function Renderer_createElement(view) {
    let morph = this._dom.createFragmentMorph();
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
}; // Will place into DOM.

Renderer.prototype.componentInitAttrs = function (component, attrs) {
  component.trigger('didInitAttrs', { attrs });
  component.trigger('didReceiveAttrs', { newAttrs: attrs });
}; // Set attrs the first time.

Renderer.prototype.didInsertElement = function (view) {
  if (view._transitionTo) {
    view._transitionTo('inDOM');
  }

  if (view.trigger) { view.trigger('didInsertElement'); }
}; // inDOM // Placed into DOM.

Renderer.prototype.didUpdate = function (view) {
  if (view.trigger) { view.trigger('didUpdate'); }
};

Renderer.prototype.didRender = function (view) {
  if (view.trigger) { view.trigger('didRender'); }
};

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

Renderer.prototype.rerender = function (view) {
  let renderNode = view._renderNode;

  renderNode.isDirty = true;
  internal.visitChildren(renderNode.childNodes, function(node) {
    if (node.getState().manager) {
      node.shouldReceiveAttrs = true;
    }
    node.isDirty = true;
  });

  renderNode.ownerNode.emberView.scheduleRevalidate(renderNode, view.toString(), 'rerendering');
};

Renderer.prototype.remove = function (view, shouldDestroy) {
  let renderNode = view._renderNode;
  view._renderNode = null;
  if (renderNode) {
    renderNode.emberView = null;
    this.willDestroyElement(view);
    view._transitionTo('destroying');

    view._renderNode = null;
    let lastResult = renderNode.lastResult;
    if (lastResult) {
      internal.clearMorph(renderNode, lastResult.env, shouldDestroy !== false);
    }
    if (!shouldDestroy) {
      view._transitionTo('preRender');
    }
    this.didDestroyElement(view);
  }

  // toplevel view removed, remove insertion point
  let lastResult = view.lastResult;
  if (lastResult) {
    view.lastResult = null;
    lastResult.destroy();
  }

  if (shouldDestroy && !view.isDestroying) {
    view.destroy();
  }
};

Renderer.prototype.willDestroyElement = function (view) {
  if (view.trigger) {
    view.trigger('willDestroyElement');
    view.trigger('willClearRender');
  }
};

Renderer.prototype.didDestroyElement = function (view) {
  view.element = null;

  if (view.trigger) {
    view.trigger('didDestroyElement');
  }
};

export const InertRenderer = {
  create({ dom }) {
    return new Renderer(dom, { destinedForDOM: false });
  }
};

export const InteractiveRenderer = {
  create({ dom }) {
    return new Renderer(dom, { destinedForDOM: true });
  }
};
