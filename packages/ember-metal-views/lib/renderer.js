import { DOMHelper } from "morph";

function Renderer() {
  this._uuid = 0;
  this._views = new Array(2000);
  this._queue = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
  this._parents = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
  this._elements = new Array(17);
  this._inserts = {};
  this._dom = new DOMHelper();
}

function Renderer_renderTree(_view, _parentView, _insertAt) {
  var views = this._views;
  views[0] = _view;
  var insertAt = _insertAt === undefined ? -1 : _insertAt;
  var index = 0;
  var total = 1;
  var levelBase = _parentView ? _parentView._level+1 : 0;

  var root = _parentView == null ? _view : _parentView._root;

  // if root view has a _morph assigned
  var willInsert = !!root._morph;

  var queue = this._queue;
  queue[0] = 0;
  var length = 1;

  var parentIndex = -1;
  var parents = this._parents;
  var parent = null;
  if (_parentView) {
    parent = _parentView;
  }
  var elements = this._elements;
  var element = null;
  var contextualElement = null;
  var level = 0;

  var view = _view;
  var children, i, child;
  while (length) {
    elements[level] = element;
    if (!view._morph) {
      // ensure props we add are in same order
      view._morph = null;
    }
    view._root = root;
    this.uuid(view);
    view._level = levelBase + level;
    if (view._elementCreated) {
      this.remove(view, false, true);
    }

    this.willCreateElement(view);

    contextualElement = view._morph && view._morph.contextualElement;
    if (!contextualElement && parent && parent._childViewsMorph) {
      contextualElement = parent._childViewsMorph.contextualElement;
    }
    if (!contextualElement && view._didCreateElementWithoutMorph) {
      // This code path is only used by createElement and rerender when createElement
      // was previously called on a view.
      contextualElement = document.body;
    }
    Ember.assert("Required contextualElement for view "+_view+" is missing", contextualElement);
    element = this.createElement(view, contextualElement);

    parents[level++] = parentIndex;
    parentIndex = index;
    parent = view;

    // enqueue for end
    queue[length++] = index;
    // enqueue children
    children = this.childViews(view);
    if (children) {
      for (i=children.length-1;i>=0;i--) {
        child = children[i];
        index = total++;
        views[index] = child;
        queue[length++] = index;
        view = child;
      }
    }

    index = queue[--length];
    view = views[index];

    while (parentIndex === index) {
      level--;
      view._elementCreated = true;
      this.didCreateElement(view);
      if (willInsert) {
        this.willInsertElement(view);
      }

      if (level === 0) {
        length--;
        break;
      }

      parentIndex = parents[level];
      parent = parentIndex === -1 ? _parentView : views[parentIndex];
      this.insertElement(view, parent, element, -1);
      index = queue[--length];
      view = views[index];
      element = elements[level];
      elements[level] = null;
    }
  }

  this.insertElement(view, _parentView, element, insertAt);

  for (i=total-1;i>=0;i--) {
    if (willInsert) {
      views[i]._elementInserted = true;
      this.didInsertElement(views[i]);
    }
    views[i] = null;
  }

  return element;
}

Renderer.prototype.uuid = function Renderer_uuid(view) {
  if (view._uuid === undefined) {
    view._uuid = ++this._uuid;
    view._renderer = this;
  } // else assert(view._renderer === this)
  return view._uuid;
};

Renderer.prototype.scheduleInsert =
  function Renderer_scheduleInsert(view, morph) {
    if (view._morph || view._elementCreated) {
      throw new Error("You can't insert a View that has already been rendered");
    }
    view._morph = morph;
    var viewId = this.uuid(view);
    this._inserts[viewId] = this.scheduleRender(this, function scheduledRenderTree() {
      this._inserts[viewId] = null;
      this.renderTree(view);
    });
  };

Renderer.prototype.appendTo =
  function Renderer_appendTo(view, target) {
    var morph = this._dom.appendMorph(target, target);
    this.scheduleInsert(view, morph);
  };

Renderer.prototype.replaceIn =
  function Renderer_replaceIn(view, target) {
    var morph = this._dom.createMorph(target, null, null, target);
    this.scheduleInsert(view, morph);
  };

function Renderer_remove(_view, shouldDestroy, reset) {
  var viewId = this.uuid(_view);

  if (this._inserts[viewId]) {
    this.cancelRender(this._inserts[viewId]);
    this._inserts[viewId] = undefined;
  }

  if (!_view._elementCreated) {
    return;
  }

  var removeQueue = [];
  var destroyQueue = [];
  var morph = _view._morph;
  var idx, len, view, queue, childViews, i, l;

  removeQueue.push(_view);

  for (idx=0; idx<removeQueue.length; idx++) {
    view = removeQueue[idx];

    if (!shouldDestroy && view._childViewsMorph) {
      queue = removeQueue;
    } else {
      queue = destroyQueue;
    }

    this.beforeRemove(removeQueue[idx]);

    childViews = view._childViews;
    if (childViews) {
      for (i=0,l=childViews.length; i<l; i++) {
        queue.push(childViews[i]);
      }
    }
  }

  for (idx=0; idx<destroyQueue.length; idx++) {
    view = destroyQueue[idx];

    this.beforeRemove(destroyQueue[idx]);

    childViews = view._childViews;
    if (childViews) {
      for (i=0,l=childViews.length; i<l; i++) {
        destroyQueue.push(childViews[i]);
      }
    }
  }

  // destroy DOM from root insertion
  if (morph && !reset) {
    morph.destroy();
  }

  for (idx=0, len=removeQueue.length; idx < len; idx++) {
    this.afterRemove(removeQueue[idx], false);
  }

  for (idx=0, len=destroyQueue.length; idx < len; idx++) {
    this.afterRemove(destroyQueue[idx], true);
  }

  if (reset) {
    _view._morph = morph;
  }
}

function Renderer_insertElement(view, parentView, element, index) {
  if (element === null || element === undefined) return;
  if (view._morph) {
    view._morph.update(element);
  } else if (parentView) {
    if (index === -1) {
      view._morph = parentView._childViewsMorph.append(element);
    } else {
      view._morph = parentView._childViewsMorph.insert(index, element);
    }
  }
}

function Renderer_beforeRemove(view) {
  if (view._elementCreated) {
    this.willDestroyElement(view);
  }
  if (view._elementInserted) {
    this.willRemoveElement(view);
  }
}

function Renderer_afterRemove(view, shouldDestroy) {
  view._elementInserted = false;
  view._morph = null;
  view._childViewsMorph = null;
  if (view._elementCreated) {
    view._elementCreated = false;
    this.didDestroyElement(view);
  }
  if (shouldDestroy) {
    this.destroyView(view);
  }
}

Renderer.prototype.remove = Renderer_remove;
Renderer.prototype.destroy = function (view) {
  this.remove(view, true);
};

Renderer.prototype.renderTree = Renderer_renderTree;
Renderer.prototype.insertElement = Renderer_insertElement;
Renderer.prototype.beforeRemove = Renderer_beforeRemove;
Renderer.prototype.afterRemove = Renderer_afterRemove;

/// HOOKS
var noop = function () {};

Renderer.prototype.willCreateElement = noop; // inBuffer
Renderer.prototype.createElement = noop; // renderToBuffer or createElement
Renderer.prototype.didCreateElement = noop; // hasElement
Renderer.prototype.willInsertElement = noop; // will place into DOM
Renderer.prototype.didInsertElement = noop; // inDOM // placed into DOM
Renderer.prototype.willRemoveElement = noop; // removed from DOM  willDestroyElement currently paired with didInsertElement
Renderer.prototype.willDestroyElement = noop; // willClearRender (currently balanced with render) this is now paired with createElement
Renderer.prototype.didDestroyElement = noop; // element destroyed so view.destroy shouldn't try to remove it removedFromDOM
Renderer.prototype.destroyView = noop;
Renderer.prototype.childViews = noop;

export default Renderer;
