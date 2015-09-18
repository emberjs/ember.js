import { EMPTY_CACHE, DictSet, dict } from '../utils';
import { metaFor } from '../meta';
import ForkedReference from './forked';
import { PropertyReference } from './descriptors';
import PushPullReference from './push-pull';

export class DirectReference extends PushPullReference {
  constructor(parent, property) {
    super();
    this._parent = parent;
    this._property = property;
    this._cache = EMPTY_CACHE;
    this._inner = null;
    this._chains = null;
    this._notifyChildren = null;
  }

  isDirty() { return this._cache === EMPTY_CACHE; }

  value() {
    var _cache = this._cache;
    if (_cache !== EMPTY_CACHE) return _cache;
    var _parent = this._parent, _property = this._property;

    var _inner = this._inner;
    if (!_inner) {
      let _parentValue = _parent.value();
      let ReferenceType = metaFor(_parentValue).referenceTypeFor(_property);
      _inner = this._inner = new ReferenceType(_parentValue, _property);
    }

    return _inner.value();
  }

  notify() {
    this._notify();
    super.notify();
  }

  get(prop) {
    var _chains = this._getChains();
    if (prop in _chains) return _chains[prop];
    return (_chains[prop] = new IndirectReference(this, prop));
  }

  chain(child) {
    this._getNotifyChildren().add(child);
    return { _parent: this, destroy: function() { this._parent._getNotifyChildren.remove(child); } };
  }

  fork() {
    return new ForkedReference(this);
  }

  label() {
    return '[reference Direct]';
  }

  _notify() {
    this._cache = EMPTY_CACHE;
    var _chains = this._chains, _notifyChildren = this._notifyChildren;

    if (_chains) {
      Object.keys(_chains).forEach(function(key) { _chains[key]._reparent(); });
    }

    if (_notifyChildren) {
      _notifyChildren.forEach(function(child) { child.notify(); });
    }
  }

  _getNotifyChildren() {
    if (this._notifyChildren) return this._notifyChildren;
    return (this._notifyChildren = new DictSet());
  }

  _getChains() {
    if (this._chains) return this._chains;
    return (this._chains = dict());
  }
}

export class IndirectReference extends DirectReference {
  constructor(parent, property) {
    super(parent, property);
    this._lastParentValue = null;
  }

  value() {
    if (this._cache !== EMPTY_CACHE) return this._cache;
    var _lastParentValue = this._lastParentValue, _parentValue = this._parentValue(), _property = this._property;

    if (_parentValue === null || _parentValue === undefined) {
      return (this._cache = undefined);
    }

    var _inner;
    if (_lastParentValue === _parentValue) {
      _inner = this._inner;
    } else {
      let ReferenceType = typeof _parentValue === 'object' ? metaFor(_parentValue).referenceTypeFor(_property) : PropertyReference;
      _inner = this._inner = new ReferenceType(_parentValue, _property);
    }

    if (typeof _parentValue === 'object') {
      metaFor(_parentValue).addReference(_property, this);
    }

    return (this._cache = _inner.value());
  }

  label() {
    return '[reference Indirect]';
  }

  _reparent() {
    var _property = this._property, _lastParentValue = this._lastParentValue;

    if (typeof _lastParentValue === 'object' && _lastParentValue !== null) {
      metaFor(_lastParentValue).removeReference(_property, this);
    }

    this._notify();
  }

  _parentValue() {
    var parent = this._parent.value();
    this._lastParentValue = parent;
    return parent;
  }
}

