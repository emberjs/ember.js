/**
  References have a simple interface:

  value()             -> any
  isDirty()           -> bool
  destroy()           -> void

  Base references have an additional method:

  update(val)         -> void

  Base references and property name references have an additional method:

  get(key)     -> property name reference

  Internally, they also have an interface designed for implementing combinators:

  dirtyDependencies   -> bool
  chain(reference)    -> { destroy() }
*/

// The GC assumption of this linked list is that for a reference for something
// that looks like: `(foo (bar baz.bat))`, we have this notification tree:
//
// - baz
//   | notify baz.bat
//     | notify (bar baz.bat)
//       | notify (foo (bar baz.bat))
//
// and this source tree:
//
// - (foo (bar baz.bat))
//   | source (bar baz.bat)
//     | source baz.bat
//       | source baz
//
// Base references and property references are assumed to be primitive references
// that are not implemented using this base class. As a result, when we destroy a
// helper expression, we need to unlink it from the base streams by destroying its
// source, but we don't need to unlinl internal links inside of the composed helper
// reference.
//
// After the unlinking has occurred, the rooted notify tree will look like:
//
// - baz
//   | notify baz.bat
//
// References from the source tree into the primitive sources are not an issue,
// as the sources will be dropped.
//
// Note that in Ember, the primitive notification tree does not use a notification
// system like the one we have implemented here. Instead, there is already an
// internal notification system that propagates notifications across chains, and
// we will add a single (created on demand from the template layer) primitive
// reference that is notified whenever the underlying property is notified. It
// will increment the watch counter, but it will not attempt to use the internal
// `watchKeys` mechanism.
class NotifyNode {
  static link(dependent, parent) {
    new NotifyNode(dependent, parent);

    let tail = parent.notifyTail;

    if (tail) tail.nextSibling = this;
    else parent.notifyHead = this;

    parent.notifyTail = this;
  }

  constructor(dependent, parent) {
    this.dependent = dependent;
    this.parent = parent;
  }

  notify() {
    this.dependent.dirtyDependencies = true;
    this.dependent.notify();
  }
}

export class ConstReference {
  constructor(inner) {
    this._inner = inner;
  }

  // TODO: A protocol for telling HTMLBars to stop asking; could also be useful
  // for finalized references. Also, a reference composed only of const references
  // should itself be const.

  isDirty() { return false; }
  value() { return this._inner; }
  chain() {}
}

export class Reference {
  constructor() {
    this.dirtyDependencies = false;
    this._notifyHead = null;
    this._notifyTail = null;
    this._sources = null;
  }

  _notify() {
    let dependent = this._notifyHead;

    // TODO: Register arbitrarily deep template references directly with
    // the closest primitive reference.
    while (dependent) {
      dependent._notify();
      dependent = dependent.nextSibling;
    }
  }

  chain(childReference) {
    // the implementation of this method on primitive streams will populate the `sources`
    // list of the child node, so the node connecting to template reference tree from the
    // primitive reference graph gets properly unlinked.
    NotifyNode.link(childReference, this);
  }

  isDirty() {
    return !this.dirtyDependencies;
  }

  destroy() {
    if (!this._sources) return;
    this._sources.forEach(s => s.destroy());
  }
}

  // convenience methods

  //map(callback) {
    //return new MapReference(this, callback);
  //}

// It is up to the framework to avoid calling `update` if it feels it
// can trust the interior mutability of `===` object being set on
// itself.
export class BaseReference extends Reference {
  constructor(value) {
    super();
    this._value = value;
  }

  update(value) {
    this._value = value;
    this.notify();
  }

  value() {
    return this._value;
  }
}

// When values are `===`, there may still be, generally speaking, interior
// mutability. As a result, when a BaseReference is updated (this results
// from the evaluation of a template with new values for its block params),
// we may need to notify property references chained off of it even if the
// value has not changed:
//
// ```js
// let list = this.list;
// list[0].title = "Hi";
// this.set('list', list);
// ```
//
// We could also require people to do `this.notify('title')` in this situation:
//
// ```js
// let list = this.list;
// list[0].title = "Hi";
// this.notify('list');
// ```
//
// It's actually shorter and feels like less of a hack, but unsure about the
// programming model.

class MapReference extends Reference { // jshint ignore:line
  constructor(parent, callback) {
    super();
    this.parent = parent;
    this.callback = callback;

    this.parent.chain(this);
  }

  value() {
    this.callback.call(undefined, this.parent.value());
  }
}

export class ConcatReference extends Reference {
  constructor(parts) {
    super();
    this.parts = parts;
    chainFromArray(parts, this);
  }

  value() {
    return this.parts.map(p => p.value()).join('');
  }
}

const EMPTY_ARRAY = Object.freeze([]);

export class HelperParamsReference extends Reference {
  static fromStatements({ params: { _params, _hash }, frame }) {
    // TODO: do more of this work as we natually have to loop through
    // these arrays in other areas.
    //
    // TODO: specialize small-size params and small-size hash

    let helperRef = new HelperParamsReference();
    let options = { params: undefined, keys: undefined, values: undefined };

    if (_params) {
      let paramsRef = _params.map(param => {
        let ref = param.evaluate(frame);
        helperRef.chain(ref); // TODO: unchain
        return ref;
      });

      options.params = paramsRef;
    } else {
      options.params = EMPTY_ARRAY;
    }

    if (_hash) {
      let valuesRef = _hash.map((key, value) => {
        let ref = value.evaluate(frame);
        helperRef.chain(ref); // TODO: unchain
        return ref;
      });

      options.keys = _hash.keys;
      options.values = valuesRef;
    } else {
      options.keys = options.values = EMPTY_ARRAY;
    }

    helperRef._init(options);
    return helperRef;
  }

  constructor() {
    super();
    this._params = null;
    this._hashConstructor = null;
  }

  _init({ params, keys, values }) {
    this._params = params;

    this._HashConstructor = function() {
      for (let i = 0, l = values.length; i < l; i++) {
        this[keys[i]] = values[i].value();
      }
    };
  }

  // This reference does not include a cache because it should only be pulled
  // from in response to a notification, and it should always be pulled from
  // exctly one morph.
  value() {
    let { _params, _HashConstructor } = this;

    let paramValues = new Array(_params.length);

    for (let i = 0, l = _params.length; i < l; i++) {
      paramValues[i] = _params[i].value();
    }

    let hash = new _HashConstructor(); // jshint ignore:line

    return { params: paramValues, hash };
  }
}

export class SimpleHelperInvocationReference extends ConstReference {
  value() {
    return this._inner.call(undefined);
  }
}

export class HelperInvocationReference extends Reference {
  static fromStatements({ helper, params, frame }) {
    let paramsRef = HelperParamsReference.fromStatements({ params, frame });
    return new HelperInvocationReference(helper, paramsRef);
  }

  constructor(helper, params) {
    super();
    this.helper = helper;
    this.params = params;
    params.chain(this);
  }

  value() {
    let { params, hash } = this.params.value();
    return this.helper.call(undefined, params, hash);
  }
}

function chainFromArray(array, child) {
  for (let i = 0, l = array.length; i < l; i++) {
    array[i].chain(child);
  }
}

