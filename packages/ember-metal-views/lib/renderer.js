import { Morph } from "morph";

function Renderer() {
  this._uuid = 0;
  this._views = new Array(2000);
  this._queue = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
  this._parents = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
  this._elements = new Array(17);
  this._inserts = {};
}

function Renderer_renderTree(_view) {
  var views = this._views;
  views[0] = _view;
  var index = 0;
  var total = 1;

  var queue = this._queue;
  queue[0] = 0;
  var length = 1;

  var parentIndex = -1;
  var parents = this._parents;
  var parent = null;
  var elements = this._elements;
  var element = null;
  var level = 0;

  var view = _view;
  var children, i, l, child;
  while (length) {
    elements[level] = element;
    if (!view._morph) {
      // ensure props we add are in same order
      view._morph = null;
    }
    this.uuid(view);
    view._level = level;
    this.willCreateElement(view);
    element = this.createElement(view);

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
      view._isRendered = true;
      this.didCreateElement(view);
      this.willInsertElement(view);

      if (level === 0) {
        length--;
        break;
      }

      parentIndex = parents[level];
      parent = views[parentIndex];
      this.insertElement(view, parent, element);
      index = queue[--length];
      view = views[index];
      element = elements[level];
      elements[level] = null;
    }
  }

  this.insertElement(view, null, element);

  for (i=total-1;i>=0;i--) {
    view._isInDOM = true;
    this.didInsertElement(views[i]);
    views[i] = null;
  }

  return element;
}

Renderer.prototype.uuid = function Renderer_uuid(view) {
  if (view._uuid) {
    view._uuid = ++this._uuid;
  }
  return view._uuid;
};

Renderer.prototype.appendTo = function Renderer_appendTo(view, target) {
  // TODO check view state, cancel existing insertion.
  // TODO use dom helper for creating this morph.
  var start = document.createTextNode('');
  var end = document.createTextNode('');
  target.appendChild(start);
  target.appendChild(end);
  view._morph = new Morph(target, start, end);

  var viewId = this.uuid(view);
  this._inserts[viewId] = this.scheduleRender(this, function() {
    this._inserts[viewId] = null;
    this.renderTree(view);
  });
};

Renderer.prototype.destroy = function () {
};

function Renderer_insertElement(view, parentView, element, insertAt) {
  if (view._morph) {
    view._morph.update(element);
  } else {
    view._morph = parentView._childViewsMorph.append(element);
  }
}

Renderer.prototype.renderTree = Renderer_renderTree;
Renderer.prototype.insertElement = Renderer_insertElement;

/// HOOKS
var noop = function () {};
Renderer.prototype.willCreateElement = noop; // inBuffer
Renderer.prototype.createElement = noop;
Renderer.prototype.didCreateElement = noop; // hasElement
Renderer.prototype.willInsertElement = noop;
Renderer.prototype.didInsertElement = noop; // inDOM
Renderer.prototype.childViews = noop;

export default Renderer;
