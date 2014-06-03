import run from "ember-metal/run_loop";
import { indexOf } from "ember-metal/array";
import { meta, META_KEY } from "ember-metal/utils";
import { querySelector, createElement } from "ember-metal-views/dom";
import { addObserver } from "ember-metal/observer";
import { set } from "ember-metal/property_set";
import { lookupView, setupView, teardownView, setupEventDispatcher, reset, events } from "ember-metal-views/events";
import { setupClassNames, setupClassNameBindings, setupAttributeBindings } from "ember-metal-views/attributes";
import { Placeholder } from "placeholder";

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
    view._placeholder = new Placeholder(target, target.lastChild, null);
    _render(view);
  });
}

function render(view) {
  return _render(view);
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

    if (view.transitionTo) {
      view.transitionTo('hasElement');
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

function childViewsPlaceholder(parentView) {
  if (parentView.isVirtual) {
    return parentView._placeholder;
  }
  var placeholder = parentView._childViewsPlaceholder;
  if (!placeholder) {
    placeholder = parentView._childViewsPlaceholder = new Placeholder(parentView.element, null, null);
  }
  return placeholder;
}

function _render(_view) {
  var views = [_view],
      idx = 0,
      view, ret, tagName, el;

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
        view._placeholder = createChildPlaceholder(view._parentView, content);
      }
    }

    var childViews = view._childViews, // FIXME
        childView;

    if (childViews) {
      for (var i = 0, l = childViews.length; i < l; i++) {
        childView = childViews[i];
        childView._parentView = view;
        views.push(childView);
      }
    }

    idx++;
  }

  // only assume we are inDOM if root had placeholder
  if (_view._placeholder) {
    setupEventDispatcher();

    for (var i = 0, l = views.length; i<l; i++) {
      var view = views[i];
      if (view.willInsertElement) {
        view.willInsertElement(view.element);
      }
    }

    _view._placeholder.update(ret);

    for (var i = 0, l = views.length; i<l; i++) {
      var view = views[i];
      if (view.transitionTo) {
        view.transitionTo('inDOM');
      }
      if (view.didInsertElement) {
        view.didInsertElement(view.element);
      }
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
      templateOptions = {}, // TODO
      i, l;

  if (template) {
    if (!view.templateOptions) {
      console.log('templateOptions not specified on ', view);
      view.templateOptions = {data: {keywords: {controller: view.controller}}};
    }
    view.templateOptions.data.view = view;
    if (view.beforeTemplate) { view.beforeTemplate(); }
    var templateFragment = template(view, view.templateOptions);
    if (view.isVirtual) {
      el = templateFragment;
    } else {
      if (templateFragment) {
        if (typeof templateFragment === 'string') { templateFragment = document.createTextNode(templateFragment); }
        el.appendChild(templateFragment);
      }
    }
    view.templateOptions.data.view = null;
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
  }
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

function remove(view) {
  var el = view.element,
      placeholder = view._placeholder;

  if (el && view.willDestroyElement) { view.willDestroyElement(); }
  view.element = null;
  if (el && el.parentNode) { el.parentNode.removeChild(el); }
  if (placeholder) { placeholder.destroy(); }
  teardownView(view);

  _triggerRecursively(view, remove, true);
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

// function setContext(view, newContext) {
//   view._context = newContext; // we're setting _context to signify that this view had context explictly set
//   set(view, 'context', newContext);
// }

var destroy = remove;
var createElementForView = _createElementForView;

export { reset, events, appendTo, render, createChildView, appendChild, remove, destroy, createElementForView }
