import { createElement } from "ember-metal-views/dom";
import { lookupView, setupView, teardownView, setupEventDispatcher, reset, events } from "ember-metal-views/events";
import { setupClassNames, setupClassNameBindings, setupAttributeBindings } from "ember-metal-views/attributes";
import { Morph } from "morph";
import { sendEvent } from "ember-metal/events";

function Renderer(hooks) {
  this.hooks = hooks;
}

function appendTo(view, target) {
  view._scheduledInsert = this.hooks.scheduleRender(this, function() {
    _render(view, function (fragOrEl) {
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

function appendToMorph(morph, content)
{
  // TODO: morph.append(content);
  var index = morph.morphs ? morph.morphs.length : 0;
  morph.replace(index, 0, [content]);
  return morph.morphs[index];
}

function createChildMorph(parentView, content) {
  var morph = childViewsMorph(parentView);
  return appendToMorph(morph, content);
}

function insertChildContent(parentView, index, content) {
  var morph = childViewsMorph(parentView);
  morph.replace(index, 0, [content]);
  return morph.morphs[index];
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

      setupView(view);

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

    if (view.transitionTo) {
      view.transitionTo('hasElement');
    }
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
    setupEventDispatcher();

    for (i = 0, l = views.length; i<l; i++) {
      view = views[i];
      if (view.willInsertElement) {
        view.willInsertElement(view.element);
      }
      sendEvent(view, 'willInsertElement', view.element);
    }

    morph = insert(ret);

    _view._morph = morph;

    for (i = 0, l = views.length; i<l; i++) {
      view = views[i];
      if (view.transitionTo) {
        view.transitionTo('inDOM');
      }
      view.isInDOM = true;
      if (view.didInsertElement) {
        view.didInsertElement(view.element);
      }
      sendEvent(view, 'didInsertElement', view.element);
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

function clearRenderHooks(view) {
  if (view.isRendered) {
    if (view.willClearRender) {
      view.willClearRender();
    }
  }
  if (view.isInDOM) {
    if (view.willDestroyElement) {
      view.willDestroyElement();
    }
  }
}

function resetView(view) {
  view.isInDOM = false;
  view.isRendered = false;
  view.element = null;
  view._morph = null;
  view._childViewsMorph = null;
  teardownView(view);
}

function destroy(_view) {
  remove(_view, true);
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

    clearRenderHooks(view);

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

    clearRenderHooks(view);

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
    if (view.transitionTo) {
      view.transitionTo('prerender');
    }
  }

  for (idx=0, len=destroyQueue.length; idx < len; idx++) {
    view = destroyQueue[idx];
    resetView(view);
    if (view.transitionTo) {
      view.transitionTo('destroying');
    }
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

var render = _render;

Renderer.prototype.reset = reset;
Renderer.prototype.events = events;
Renderer.prototype.appendTo = appendTo;
Renderer.prototype.destroy = destroy;

export default Renderer;


