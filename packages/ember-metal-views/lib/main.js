import { createElement } from "ember-metal-views/dom";
import { setupClassNames, setupClassNameBindings, setupAttributeBindings } from "ember-metal-views/attributes";
import { Morph } from "morph";

function Renderer(hooks) {
  this.hooks = hooks;
}

function appendTo(view, target) {
  view._scheduledInsert = this.scheduleRender(this, function() {
    this.render(view, function (fragOrEl) {
      var start = document.createTextNode(''),
        end = document.createTextNode(''),
        morph = new Morph(target, start, end);
      target.appendChild(start);
      target.appendChild(end);
      morph.update(fragOrEl);
      return morph;
    });
  });
}

function _createElementForView(view) {
  var el, tagName;

  if (!view.isVirtual) {
    tagName = view.tagName || 'div';
    el = view.element = view.element || createElement(tagName);
  }

  return el;
}

function createChildMorph(parentView, content) {
  return childViewsMorph(parentView).append(content);
}

function insertChildContent(parentView, index, content) {
  return childViewsMorph(parentView).insert(index, content);
}

function childViewsMorph(parentView) {
  if (parentView._childViewsMorph) {
    return parentView._childViewsMorph;
  }
  if (parentView.isVirtual) {
    if (parentView._morph) {
      return parentView._childViewsMorph = parentView._morph;
    }
    // if root view of render is a virtual view
    // we need to create a fragment morph
    // TODO: allow non insertable Morph for this case
    // we can assign it a start and end on insert
    var frag = document.createDocumentFragment(),
      start = document.createTextNode(''),
      end = document.createTextNode('');
    frag.appendChild(start);
    frag.appendChild(end);
    return parentView._childViewsMorph = new Morph(frag, start, end);
  }
  return parentView._childViewsMorph = new Morph(parentView.element, null, null);
}

function _render(_view, insert) {
  var views = [_view],
      idx = 0,
      view, parentView, ret, tagName, el, i, l, morph;

  while (idx < views.length) {
    view = views[idx];

    if (view.content) { view.context = view.content; } // CollectionView hack

    if (view.context) { // if the view has a context explicitly set, set _context so we know it
      view._context = view.context;
    } else if (view._parentView) { // the view didn't have a context explicitly set, so propagate the parent's context
      view.context = view._parentView.context;
    }

    if (!view.isVirtual) {
      el = _createElementForView(view);

      //setupView(view);

      el.setAttribute('id', view.elementId);
      setupClassNames(view);
      setupClassNameBindings(view);
      setupAttributeBindings(view);
    }

    var content = _renderContents(view, el);
    if (view === _view) {
      ret = content; // hold off inserting the root view
    } else {
      if (view._morph) {
        if (content) {
          view._morph.update(content);
        }
      } else {
        morph = createChildMorph(view._parentView, content);
        view._morph = morph;
      }
    }

    this.viewTransitionTo(view, 'hasElement');
    view.isRendered = true;

    var childViews = view._childViews, // FIXME
        childView;

    if (childViews) {
      for (i = 0, l = childViews.length; i < l; i++) {
        childView = childViews[i];
        childView._parentView = view;
        views.push(childView);
      }
    }

    idx++;
  }

  if (_view.isVirtual && _view._childViewsMorph) {
    ret = _view._childViewsMorph._parent;
  }

  // only assume we are inDOM if root had morph
  if (insert) {
    //setupEventDispatcher();

    for (i = 0, l = views.length; i<l; i++) {
      view = views[i];
      this.viewWillInsertElement(view, view.element);
    }

    morph = insert(ret);

    _view._morph = morph;

    for (i = 0, l = views.length; i<l; i++) {
      view = views[i];
      this.viewTransitionTo(view, 'inDOM');
      view.isInDOM = true;
      this.viewDidInsertElement(view, view.element);
    }
  }

  return ret;
}

function _findTemplate(view) {
  var template = view.template;

  if (view.container && !template) {
    template = view.container.lookup('template:' + view.templateName);
  }

  if (!template) { template = view.defaultTemplate; }

  return template;
}

function _renderContents(view, el) {
  var template = _findTemplate(view),
      templateOptions = view.templateOptions, i, l;

  if (!templateOptions) {
    templateOptions = view.templateOptions = (view._parentView && view._parentView.templateOptions) || view.constructor.templateOptions || {data: {keywords: {controller: view.controller}}};
  }

  if (template) {
    // if (!templateOptions) {
    //   console.log('templateOptions not specified on ', view);
    //   view.templateOptions = {data: {keywords: {controller: view.controller}}};
    // }
    templateOptions.data.view = view;
    if (view.beforeTemplate) { view.beforeTemplate(); }
    var templateFragment = template(view, templateOptions);
    if (view.isVirtual) {
      el = templateFragment;
    } else {
      if (templateFragment) {
        if (typeof templateFragment === 'string') { templateFragment = document.createTextNode(templateFragment); }
        el.appendChild(templateFragment);
      }
    }
    templateOptions.data.view = null;
  } else if (view.textContent) { // TODO: bind?
    el.textContent = view.textContent;
  } else if (view.innerHTML) { // TODO: bind?
    el.innerHTML = view.innerHTML;
  } else if (view.render) {
  }

  return el;
}

function resetView(view) {
  view.isInDOM = false;
  view.isRendered = false;
  view.element = null;
  view._morph = null;
  view._childViewsMorph = null;
  //teardownView(view);
}

function destroy(_view) {
  this.remove(_view, true);
}

function remove(_view, shouldDestroy) {
  if (_view._scheduledInsert) {
    this.hooks.cancelRender(_view._scheduledInsert);
    _view._scheduledInsert = null;
  }

  if (!shouldDestroy && !_view.isRendered) {
    return;
  }

  var removeQueue = [], destroyQueue = [],
    idx, len, view, staticChildren,
    childViews, i, l, parentView;

  if (shouldDestroy) {
    destroyQueue.push(_view);
  } else {
    removeQueue.push(_view);
  }

  for (idx=0; idx<removeQueue.length; idx++) {
    view = removeQueue[idx];

    staticChildren = !!view._childViewsMorph;

    this._clearRenderHooks(view);

    childViews = view._childViews;
    if (childViews) {
      if (staticChildren) {
        for (i=0,l=childViews.length; i<l; i++) {
          removeQueue.push(childViews[i]);
        }
      } else {
        for (i=0,l=childViews.length; i<l; i++) {
          destroyQueue.push(childViews[i]);
        }
      }
    }
  }

  for (idx=0; idx<destroyQueue.length; idx++) {
    view = destroyQueue[idx];

    this._clearRenderHooks(view);

    childViews = view._childViews;
    if (childViews) {
      for (i=0,l=childViews.length; i<l; i++) {
        destroyQueue.push(childViews[i]);
      }
    }
  }

  // destroy DOM from root insertion
  if (_view._morph) {
    _view._morph.destroy();
  }

  for (idx=0, len=removeQueue.length; idx < len; idx++) {
    view = removeQueue[idx];
    resetView(view);
    this.viewTransitionTo(view, 'preRender');
  }

  for (idx=0, len=destroyQueue.length; idx < len; idx++) {
    view = destroyQueue[idx];
    resetView(view);

    this.viewTransitionTo(view, 'destroying');
    if (view.destroy) {
      view.destroy(true);
    }
    parentView = view._parentView;
    view._parentView = null;
    view._childViews = null;
    if (parentView && !parentView.isDestroying) {
      if (parentView.removeChild) {
        parentView.removeChild(view);
      } else {
        // TODO: we need to do for metal views
      }
    }
  }
}

function clearRenderHooks(view) {
  if (view.isRendered) {
    this.viewWillClearRender(view);
  }
  if (view.isInDOM) {
    this.viewWillDestroyElement(view);
  }
}

Renderer.prototype._clearRenderHooks = clearRenderHooks;
Renderer.prototype.render = _render;
Renderer.prototype.appendTo = appendTo;
Renderer.prototype.destroy = destroy;
Renderer.prototype.remove = remove;

// HOOKS
// must return an opaque value for cancelRender
Renderer.prototype.scheduleRender = function (renderer, render) {
  return setTimeout(function () {
    render.call(renderer);
  }, 0);
};

Renderer.prototype.cancelRender = function (renderer, scheduledRender) {
  clearTimeout(scheduledRender);
};

Renderer.prototype.viewWillInsertElement = function (view) {
  if (view.willInsertElement) {
    view.willInsertElement();
  }
};

Renderer.prototype.viewDidInsertElement = function (view) {
  if (view.didInsertElement) {
    view.didInsertElement();
  }
};

Renderer.prototype.viewWillDestroyElement = function (view) {
  if (view.willDestroyElement) {
    view.willDestroyElement();
  }
};

Renderer.prototype.viewWillClearRender = function (view) {
  if (view.willClearRender) {
    view.willClearRender();
  }
};

Renderer.prototype.viewTransitionTo = function (view, state) {
  if (view.transitionTo) {
    view.transitionTo(state);
  }
};

export default Renderer;
