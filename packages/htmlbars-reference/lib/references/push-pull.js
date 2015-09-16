import { guid } from '../utils';

class NotifyNode {
  constructor(parent, child) {
    this._parent = parent;
    this._child = child;
  }

  static appendTo(parent, child) {
    let node = new NotifyNode(parent, child);

    let oldTail = parent._notifyTail;
    if (oldTail) {
      oldTail._nextSibling = node;
      node._previousSibling = oldTail;
    } else {
      parent._notifyHead = node;
    }

    parent._notifyTail = node;
    return new Unchain(parent, node);
  }
}

class Unchain {
  constructor(parent, notify) {
    this._parent = parent;
    this._notify = notify;
  }

  destroy() {
    let _parent = this._parent, _notify = this._notify;
    let head = _parent._notifyHead;
    let tail = _parent._notifyTail;
    let prev = _notify._previousSibling;
    let next = _notify._nextSibling;

    if (head === _notify) _parent._notifyHead = next;
    if (next) next._previousSibling = prev;

    if (tail === _notify) _parent._notifyTail = prev;
    if (prev) prev._nextSibling = next;
  }
}

export default class PushPullReference {
  constructor() {
    this._dirty = true;
    this._notifyHead = null;
    this._notifyTail = null;
    this._sources = null;
    this._guid = guid();
  }

  isDirty() { return this._dirty; }

  chain(child) {
    NotifyNode.append(this, child);
  }

  notify() {
    let notifyNode = this._notifyHead;
    while (notifyNode) {
      notifyNode._child.notify();
      notifyNode = notifyNode._nextSibling;
    }
  }

  destroy() {
    if (!this._sources) return;
    this._sources.forEach(source => source.destroy());
  }

  _addSource(source) {
    this._sources = this._sources || [];
    this._sources.push(source.chain(this));
  }
}
