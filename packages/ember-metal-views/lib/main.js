import run from "ember-metal/run_loop";
import { indexOf } from "ember-metal/array";
import { meta, META_KEY } from "ember-metal/utils";
import { querySelector, createElement } from "ember-metal-views/dom";
import { addObserver } from "ember-metal/observer";
import { set } from "ember-metal/property_set";
import { lookupView, setupView, teardownView, setupEventDispatcher, reset, events } from "ember-metal-views/events";
import { setupClassNames, setupClassNameBindings, setupAttributeBindings } from "ember-metal-views/attributes";
import { Placeholder } from "placeholder";
import { sendEvent } from "ember-metal/events";

// FIXME: don't have a hard dependency on the ember run loop
// FIXME: avoid render/afterRender getting defined twice
var queues = run.queues;
queues.splice(indexOf.call(queues, 'actions')+1, 0, 'render', 'afterRender');

/*
var addObserver = Ember_addObserver || function() { console.log('TODO: implement addObserver'); },
    set = Ember_set || function() { console.log('TODO: implement set'); };
*/

var FAKE_PROTO = {};

addObserver(FAKE_PROTO, 'context', Ember.NO_TARGET, contextDidChange);
addObserver(FAKE_PROTO, '_parentView', Ember.NO_TARGET, contextDidChange);

var SHARED_META = meta(FAKE_PROTO);

function scheduleRender(render) {
  return run.scheduleOnce('render', null, render);
}

function appendTo(view, selector) {
  var target = typeof selector === 'string' ? querySelector(selector) : selector;
  view._scheduledInsert = scheduleRender(function() {
    _render(view, function (fragOrEl) {
      var start = document.createTextNode(''),
        end = document.createTextNode(''),
        placeholder = new Placeholder(target, start, end);
      target.appendChild(start);
      target.appendChild(end);
      placeholder.update(fragOrEl);
      return placeholder;
    });
  });
}

// TODO: figure out the most efficent way of changing tagName
function transclude(oldEl, newTagName) {
  var newEl = createElement(newTagName);

  // TODO: attributes?
  newEl.innerHTML = oldEl.innerHTML; // FIXME: probably want to just move the childNodes over

  if (oldEl.parentElement) {
    oldEl.parentElement.insertBefore(newEl, oldEl);
    oldEl.parentElement.removeChild(oldEl);
  }

  return newEl;
}

function _createElementForView(view) {
  var el, tagName;

  if (!view.isVirtual) {
    tagName = view.tagName || 'div';
    el = view.element = view.element || createElement(tagName);

    if (view.tagName && el.tagName !== view.tagName.toUpperCase()) {
      el = view.element = transclude(el, view.tagName);
    }
  }

  return el;
}

function appendToPlaceholder(placeholder, content)
{
  // TODO: placeholder.append(content);
  var index = placeholder.placeholders ? placeholder.placeholders.length : 0;
  placeholder.replace(index, 0, [content]);
  return placeholder.placeholders[index];
}

function createChildPlaceholder(parentView, content) {
  var placeholder = childViewsPlaceholder(parentView);
  return appendToPlaceholder(placeholder, content);
}

function insertChildContent(parentView, index, content) {
  var placeholder = childViewsPlaceholder(parentView);
  placeholder.replace(index, 0, [content]);
  return placeholder.placeholders[index];
}

function childViewsPlaceholder(parentView) {
  if (parentView._childViewsPlaceholder) {
    return parentView._childViewsPlaceholder;
  }
  if (parentView.isVirtual) {
    if (parentView._placeholder) {
      return parentView._childViewsPlaceholder = parentView._placeholder;
    }
    // if root view of render is a virtual view
    // we need to create a fragment placeholder
    // TODO: allow non insertable Placeholder for this case
    // we can assign it a start and end on insert
    var frag = document.createDocumentFragment(),
      start = document.createTextNode(''),
      end = document.createTextNode('');
    frag.appendChild(start);
    frag.appendChild(end);
    return parentView._childViewsPlaceholder = new Placeholder(frag, start, end);
  }
  return parentView._childViewsPlaceholder = new Placeholder(parentView.element, null, null);;
}

function _render(_view, insert) {
  var views = [_view],
      idx = 0,
      view, parentView, ret, tagName, el, i, l, placeholder;

  while (idx < views.length) {
    view = views[idx];
    if (!view[META_KEY]) { view[META_KEY] = SHARED_META; }

    if (view.context) { // if the view has a context explicitly set, set _context so we know it
      view._context = view.context;
    } else if (view._parentView) { // the view didn't have a context explicitly set, so propagate the parent's context
      view.context = view._parentView.context;
    }

    if (!view.isVirtual) {
      el = _createElementForView(view);

      setupView(view);

      el.setAttribute('id', view.elementId);
      if (view.isVisible === false) { el.style.display = 'none'; }
      setupClassNames(view);
      setupClassNameBindings(view);
      setupAttributeBindings(view);
    }

    var content = _renderContents(view, el);
    if (view === _view) {
      ret = content; // hold off inserting the root view
    } else {
      if (view._placeholder) {
        view._placeholder.update(content);
      } else {
        placeholder = createChildPlaceholder(view._parentView, content);
        console.assert(placeholder instanceof Placeholder);
        view._placeholder = placeholder;
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

  if (_view.isVirtual && _view._childViewsPlaceholder) {
    ret = _view._childViewsPlaceholder._parent;
  }

  // only assume we are inDOM if root had placeholder
  if (insert) {
    setupEventDispatcher();

    for (i = 0, l = views.length; i<l; i++) {
      view = views[i];
      if (view.willInsertElement) {
        view.willInsertElement(view.element);
      }
      sendEvent(view, 'willInsertElement', view.element);
    }

    placeholder = insert(ret);

    console.assert(placeholder instanceof Placeholder);

    _view._placeholder = placeholder;

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
    view.render(fakeBufferFor(el));
  }

  return el;
}

function fakeBufferFor(el) {
  return {
    push: function(str) {
      el.innerHTML += str;
    }
  };
}

function _triggerRecursively(view, functionOrEventName, skipParent) {
  var childViews = view._childViews, // FIXME
      len = childViews && childViews.length;

  if (childViews && len > 0) {
    for (var i = 0; i < len; i++) {
      _triggerRecursively(childViews[i], functionOrEventName);
    }
  }

  if (skipParent !== true) {
    if (typeof functionOrEventName === 'string') {
      if (view[functionOrEventName]) {
        view[functionOrEventName](view.element);
      }
    } else {
      functionOrEventName(view);
    }
  }
}

function createChildView(view, childView, attrs) {
  if (typeof childView === 'function') {
    attrs = attrs || {};
    // attrs.template = attemplate;
    // attrs._context = context;
    attrs._parentView = view;
    // attrs._placeholder = placeholder;
    // container
    // template data?

    childView = childView.create(attrs);
  } else if (typeof childView === 'string') {
    var fullName = 'view:' + childView;
    var View = view.container.lookupFactory(fullName);

    // Ember.assert("Could not find view: '" + fullName + "'", !!View);
    // attrs.templateData = get(this, 'templateData');
    childView = View.create(attrs);
  } else if (typeof childView === 'object') {
    if (childView.isView && childView._parentView === view && childView.container === view.container) { return childView; }
    // Ember.assert('You must pass instance or subclass of View', view.isView);
    // attrs.container = this.container;
    // if (!get(view, 'templateData')) {
    //   attrs.templateData = get(this, 'templateData');
    // }
    // view.template = template;
    // view._context = context;
    childView._parentView = view;
    // view._placeholder = placeholder;
    // Ember.setProperties(view, attrs);
  }

  return childView;
}

function appendChild(view, childView, attrs) {
  childView = createChildView(view, childView, attrs);
  var childViews = view._childViews;
  if (!childViews) {
    childViews = view._childViews = [childView];
  } else {
    childViews.push(childView);
  }
  return childView;
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
  view._placeholder = null;
  view._childViewsPlaceholder = null;
  teardownView(view);
}

function destroy(_view) {
  remove(_view, true);
}

function remove(_view, shouldDestroy) {
  if (_view._scheduledInsert) {
    run.cancel(_view._scheduledInsert);
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

    staticChildren = !!view._childViewsPlaceholder;

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
  if (_view._placeholder) {
    _view._placeholder.destroy();
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

function contextDidChange(view) {
  var newContext = view.context,
      streams = view.streams,
      streamKeys = streams && Object.keys(streams), // TODO: should we just for in, or is this actually faster?
      stream, i, l;

  if (streamKeys) {
    for (i = 0, l = streamKeys.length; i < l; i++) {
      stream = streams[streamKeys[i]];
      stream.updateObject(newContext);
    }
  }

  var childViews = view._childViews,
      childView;
  if (childViews) {
    for (i = 0, l = childViews.length; i < l; i++) {
      childView = childViews[i];

      // if context was explicitly set on this child, don't propagate the context change to it and it's children
      if (childView._context) { continue; }

      set(childView, 'context', newContext);
      contextDidChange(childView); // TODO: don't call contextDidChange recursively
    }
  }
}

var createElementForView = _createElementForView;
var render = _render;

export { reset, events, appendTo, render, createChildView, appendChild, remove, destroy, createElementForView, insertChildContent };
