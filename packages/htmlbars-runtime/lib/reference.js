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
    constructor(dependent, parent) {
        this.dependent = dependent;
        this.parent = parent;
    }
    static link(dependent, parent) {
        new NotifyNode(dependent, parent);
        let tail = parent.notifyTail;
        if (tail)
            tail.nextSibling = this;
        else
            parent.notifyHead = this;
        parent.notifyTail = this;
    }
    notify() {
        this.dependent.notify();
    }
}
export class ConstReference {
    constructor(inner) {
        this.inner = inner;
    }
    // TODO: A protocol for telling HTMLBars to stop asking; could also be useful
    // for finalized references. Also, a reference composed only of const references
    // should itself be const.
    isDirty() { return false; }
    value() { return this.inner; }
    chain() { }
}
export default class BasicReference {
    constructor() {
        this.notifyHead = null;
        this.notifyTail = null;
        this.sources = null;
    }
    _notify() {
        let dependent = this.notifyHead;
        // TODO: Register arbitrarily deep template references directly with
        // the closest primitive reference.
        while (dependent) {
            dependent.notify();
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
        return true;
    }
    destroy() {
        if (!this.sources)
            return;
        this.sources.forEach(s => s.destroy());
    }
}
// convenience methods
//map(callback) {
//return new MapReference(this, callback);
//}
// It is up to the framework to avoid calling `update` if it feels it
// can trust the interior mutability of `===` object being set on
// itself.
export class BaseReference extends BasicReference {
    constructor(value) {
        super();
        this._value = value;
    }
    isDirty() { return true; }
    update(value) {
        this._value = value;
        this.notify();
    }
    value() {
        return this._value;
    }
    destroy() { }
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
class MapReference extends BasicReference {
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
export class ConcatReference extends BasicReference {
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
export class HelperParamsReference extends BasicReference {
    constructor() {
        super();
        this.params = null;
        this.HashConstructor = null;
    }
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
        }
        else {
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
        }
        else {
            options.keys = options.values = EMPTY_ARRAY;
        }
        helperRef._init(options);
        return helperRef;
    }
    _init({ params, keys, values }) {
        this.params = params;
        this.HashConstructor = function () {
            for (let i = 0, l = values.length; i < l; i++) {
                this[keys[i]] = values[i].value();
            }
        };
    }
    // This reference does not include a cache because it should only be pulled
    // from in response to a notification, and it should always be pulled from
    // exctly one morph.
    value() {
        let { params, HashConstructor } = this;
        let paramValues = new Array(params.length);
        for (let i = 0, l = params.length; i < l; i++) {
            paramValues[i] = params[i].value();
        }
        let hash = new HashConstructor(); // jshint ignore:line
        return { params: paramValues, hash };
    }
}
export class SimpleHelperInvocationReference extends ConstReference {
    value() {
        return this.inner.call(undefined);
    }
}
export class HelperInvocationReference extends BasicReference {
    constructor(helper, params) {
        super();
        this.helper = helper;
        this.params = params;
        params.chain(this);
    }
    static fromStatements({ helper, params, frame }) {
        let paramsRef = HelperParamsReference.fromStatements({ params, frame });
        return new HelperInvocationReference(helper, paramsRef);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2h0bWxiYXJzLXJ1bnRpbWUvbGliL3JlZmVyZW5jZS50cyJdLCJuYW1lcyI6WyJOb3RpZnlOb2RlIiwiTm90aWZ5Tm9kZS5jb25zdHJ1Y3RvciIsIk5vdGlmeU5vZGUubGluayIsIk5vdGlmeU5vZGUubm90aWZ5IiwiQ29uc3RSZWZlcmVuY2UiLCJDb25zdFJlZmVyZW5jZS5jb25zdHJ1Y3RvciIsIkNvbnN0UmVmZXJlbmNlLmlzRGlydHkiLCJDb25zdFJlZmVyZW5jZS52YWx1ZSIsIkNvbnN0UmVmZXJlbmNlLmNoYWluIiwiQmFzaWNSZWZlcmVuY2UiLCJCYXNpY1JlZmVyZW5jZS5jb25zdHJ1Y3RvciIsIkJhc2ljUmVmZXJlbmNlLl9ub3RpZnkiLCJCYXNpY1JlZmVyZW5jZS5jaGFpbiIsIkJhc2ljUmVmZXJlbmNlLmlzRGlydHkiLCJCYXNpY1JlZmVyZW5jZS5kZXN0cm95IiwiQmFzZVJlZmVyZW5jZSIsIkJhc2VSZWZlcmVuY2UuY29uc3RydWN0b3IiLCJCYXNlUmVmZXJlbmNlLmlzRGlydHkiLCJCYXNlUmVmZXJlbmNlLnVwZGF0ZSIsIkJhc2VSZWZlcmVuY2UudmFsdWUiLCJCYXNlUmVmZXJlbmNlLmRlc3Ryb3kiLCJNYXBSZWZlcmVuY2UiLCJNYXBSZWZlcmVuY2UuY29uc3RydWN0b3IiLCJNYXBSZWZlcmVuY2UudmFsdWUiLCJDb25jYXRSZWZlcmVuY2UiLCJDb25jYXRSZWZlcmVuY2UuY29uc3RydWN0b3IiLCJDb25jYXRSZWZlcmVuY2UudmFsdWUiLCJIZWxwZXJQYXJhbXNSZWZlcmVuY2UiLCJIZWxwZXJQYXJhbXNSZWZlcmVuY2UuY29uc3RydWN0b3IiLCJIZWxwZXJQYXJhbXNSZWZlcmVuY2UuZnJvbVN0YXRlbWVudHMiLCJIZWxwZXJQYXJhbXNSZWZlcmVuY2UuX2luaXQiLCJIZWxwZXJQYXJhbXNSZWZlcmVuY2UudmFsdWUiLCJTaW1wbGVIZWxwZXJJbnZvY2F0aW9uUmVmZXJlbmNlIiwiU2ltcGxlSGVscGVySW52b2NhdGlvblJlZmVyZW5jZS52YWx1ZSIsIkhlbHBlckludm9jYXRpb25SZWZlcmVuY2UiLCJIZWxwZXJJbnZvY2F0aW9uUmVmZXJlbmNlLmNvbnN0cnVjdG9yIiwiSGVscGVySW52b2NhdGlvblJlZmVyZW5jZS5mcm9tU3RhdGVtZW50cyIsIkhlbHBlckludm9jYXRpb25SZWZlcmVuY2UudmFsdWUiLCJjaGFpbkZyb21BcnJheSJdLCJtYXBwaW5ncyI6IkFBR0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7RUFtQkU7QUFFRiw4RUFBOEU7QUFDOUUsMEVBQTBFO0FBQzFFLEVBQUU7QUFDRixRQUFRO0FBQ1IscUJBQXFCO0FBQ3JCLDZCQUE2QjtBQUM3QixxQ0FBcUM7QUFDckMsRUFBRTtBQUNGLHdCQUF3QjtBQUN4QixFQUFFO0FBQ0Ysd0JBQXdCO0FBQ3hCLDJCQUEyQjtBQUMzQix1QkFBdUI7QUFDdkIscUJBQXFCO0FBQ3JCLEVBQUU7QUFDRixpRkFBaUY7QUFDakYsaUZBQWlGO0FBQ2pGLGtGQUFrRjtBQUNsRixtRkFBbUY7QUFDbkYsYUFBYTtBQUNiLEVBQUU7QUFDRiwyRUFBMkU7QUFDM0UsRUFBRTtBQUNGLFFBQVE7QUFDUixxQkFBcUI7QUFDckIsRUFBRTtBQUNGLCtFQUErRTtBQUMvRSxrQ0FBa0M7QUFDbEMsRUFBRTtBQUNGLGtGQUFrRjtBQUNsRiw2RUFBNkU7QUFDN0UsZ0ZBQWdGO0FBQ2hGLDZFQUE2RTtBQUM3RSw4RUFBOEU7QUFDOUUsZ0ZBQWdGO0FBQ2hGLHlCQUF5QjtBQUN6QjtJQWdCRUEsWUFBWUEsU0FBOEJBLEVBQUVBLE1BQTBCQTtRQUNwRUMsSUFBSUEsQ0FBQ0EsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0E7UUFDM0JBLElBQUlBLENBQUNBLE1BQU1BLEdBQUdBLE1BQU1BLENBQUNBO0lBQ3ZCQSxDQUFDQTtJQWxCREQsT0FBT0EsSUFBSUEsQ0FBQ0EsU0FBU0EsRUFBRUEsTUFBTUE7UUFDM0JFLElBQUlBLFVBQVVBLENBQUNBLFNBQVNBLEVBQUVBLE1BQU1BLENBQUNBLENBQUNBO1FBRWxDQSxJQUFJQSxJQUFJQSxHQUFHQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQTtRQUU3QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0E7WUFBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFDbENBLElBQUlBO1lBQUNBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBLElBQUlBLENBQUNBO1FBRTlCQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQSxJQUFJQSxDQUFDQTtJQUMzQkEsQ0FBQ0E7SUFXREYsTUFBTUE7UUFDSkcsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0E7SUFDMUJBLENBQUNBO0FBQ0hILENBQUNBO0FBRUQ7SUFHRUksWUFBWUEsS0FBZ0JBO1FBQzFCQyxJQUFJQSxDQUFDQSxLQUFLQSxHQUFHQSxLQUFLQSxDQUFDQTtJQUNyQkEsQ0FBQ0E7SUFFREQsNkVBQTZFQTtJQUM3RUEsZ0ZBQWdGQTtJQUNoRkEsMEJBQTBCQTtJQUUxQkEsT0FBT0EsS0FBS0UsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFDM0JGLEtBQUtBLEtBQUtHLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBO0lBQzlCSCxLQUFLQSxLQUFJSSxDQUFDQTtBQUNaSixDQUFDQTtBQUVEO0lBS0VLO1FBQ0VDLElBQUlBLENBQUNBLFVBQVVBLEdBQUdBLElBQUlBLENBQUNBO1FBQ3ZCQSxJQUFJQSxDQUFDQSxVQUFVQSxHQUFHQSxJQUFJQSxDQUFDQTtRQUN2QkEsSUFBSUEsQ0FBQ0EsT0FBT0EsR0FBR0EsSUFBSUEsQ0FBQ0E7SUFDdEJBLENBQUNBO0lBRURELE9BQU9BO1FBQ0xFLElBQUlBLFNBQVNBLEdBQUdBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBO1FBRWhDQSxvRUFBb0VBO1FBQ3BFQSxtQ0FBbUNBO1FBQ25DQSxPQUFPQSxTQUFTQSxFQUFFQSxDQUFDQTtZQUNqQkEsU0FBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0E7WUFDbkJBLFNBQVNBLEdBQUdBLFNBQVNBLENBQUNBLFdBQVdBLENBQUNBO1FBQ3BDQSxDQUFDQTtJQUNIQSxDQUFDQTtJQUVERixLQUFLQSxDQUFDQSxjQUFjQTtRQUNsQkcscUZBQXFGQTtRQUNyRkEscUZBQXFGQTtRQUNyRkEsb0RBQW9EQTtRQUNwREEsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsY0FBY0EsRUFBRUEsSUFBSUEsQ0FBQ0EsQ0FBQ0E7SUFDeENBLENBQUNBO0lBRURILE9BQU9BO1FBQ0xJLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO0lBQ2RBLENBQUNBO0lBRURKLE9BQU9BO1FBQ0xLLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBO1lBQUNBLE1BQU1BLENBQUNBO1FBQzFCQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxPQUFPQSxFQUFFQSxDQUFDQSxDQUFDQTtJQUN6Q0EsQ0FBQ0E7QUFDSEwsQ0FBQ0E7QUFFQyxzQkFBc0I7QUFFdEIsaUJBQWlCO0FBQ2YsMENBQTBDO0FBQzVDLEdBQUc7QUFFTCxxRUFBcUU7QUFDckUsaUVBQWlFO0FBQ2pFLFVBQVU7QUFDVixtQ0FBbUMsY0FBYztJQUcvQ00sWUFBWUEsS0FBS0E7UUFDZkMsT0FBT0EsQ0FBQ0E7UUFDUkEsSUFBSUEsQ0FBQ0EsTUFBTUEsR0FBR0EsS0FBS0EsQ0FBQ0E7SUFDdEJBLENBQUNBO0lBRURELE9BQU9BLEtBQUtFLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBO0lBRTFCRixNQUFNQSxDQUFDQSxLQUFLQTtRQUNWRyxJQUFJQSxDQUFDQSxNQUFNQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNwQkEsSUFBSUEsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0E7SUFDaEJBLENBQUNBO0lBRURILEtBQUtBO1FBQ0hJLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBO0lBQ3JCQSxDQUFDQTtJQUVESixPQUFPQSxLQUFJSyxDQUFDQTtBQUNkTCxDQUFDQTtBQUVELDBFQUEwRTtBQUMxRSx5RUFBeUU7QUFDekUsMkVBQTJFO0FBQzNFLDBFQUEwRTtBQUMxRSx5QkFBeUI7QUFDekIsRUFBRTtBQUNGLFFBQVE7QUFDUix3QkFBd0I7QUFDeEIsd0JBQXdCO0FBQ3hCLDBCQUEwQjtBQUMxQixNQUFNO0FBQ04sRUFBRTtBQUNGLCtFQUErRTtBQUMvRSxFQUFFO0FBQ0YsUUFBUTtBQUNSLHdCQUF3QjtBQUN4Qix3QkFBd0I7QUFDeEIsdUJBQXVCO0FBQ3ZCLE1BQU07QUFDTixFQUFFO0FBQ0YsNEVBQTRFO0FBQzVFLHFCQUFxQjtBQUVyQiwyQkFBMkIsY0FBYztJQUl2Q00sWUFBWUEsTUFBMEJBLEVBQUVBLFFBQVFBO1FBQzlDQyxPQUFPQSxDQUFDQTtRQUNSQSxJQUFJQSxDQUFDQSxNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQTtRQUNyQkEsSUFBSUEsQ0FBQ0EsUUFBUUEsR0FBR0EsUUFBUUEsQ0FBQ0E7UUFFekJBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO0lBQzFCQSxDQUFDQTtJQUVERCxLQUFLQTtRQUNIRSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxFQUFFQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxLQUFLQSxFQUFFQSxDQUFDQSxDQUFDQTtJQUNyREEsQ0FBQ0E7QUFDSEYsQ0FBQ0E7QUFFRCxxQ0FBcUMsY0FBYztJQUdqREcsWUFBWUEsS0FBMkJBO1FBQ3JDQyxPQUFPQSxDQUFDQTtRQUNSQSxJQUFJQSxDQUFDQSxLQUFLQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNuQkEsY0FBY0EsQ0FBQ0EsS0FBS0EsRUFBRUEsSUFBSUEsQ0FBQ0EsQ0FBQ0E7SUFDOUJBLENBQUNBO0lBRURELEtBQUtBO1FBQ0hFLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLEtBQUtBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBO0lBQ2pEQSxDQUFDQTtBQUNIRixDQUFDQTtBQUVELE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7QUFFdEMsMkNBQTJDLGNBQWM7SUEwQ3ZERztRQUNFQyxPQUFPQSxDQUFDQTtRQUNSQSxJQUFJQSxDQUFDQSxNQUFNQSxHQUFHQSxJQUFJQSxDQUFDQTtRQUNuQkEsSUFBSUEsQ0FBQ0EsZUFBZUEsR0FBR0EsSUFBSUEsQ0FBQ0E7SUFDOUJBLENBQUNBO0lBN0NERCxPQUFPQSxjQUFjQSxDQUFDQSxFQUFFQSxNQUFNQSxFQUFFQSxFQUFFQSxPQUFPQSxFQUFFQSxLQUFLQSxFQUFFQSxFQUFFQSxLQUFLQSxFQUFFQTtRQUN6REUsaUVBQWlFQTtRQUNqRUEsK0JBQStCQTtRQUMvQkEsRUFBRUE7UUFDRkEseURBQXlEQTtRQUV6REEsSUFBSUEsU0FBU0EsR0FBR0EsSUFBSUEscUJBQXFCQSxFQUFFQSxDQUFDQTtRQUM1Q0EsSUFBSUEsT0FBT0EsR0FBR0EsRUFBRUEsTUFBTUEsRUFBRUEsU0FBU0EsRUFBRUEsSUFBSUEsRUFBRUEsU0FBU0EsRUFBRUEsTUFBTUEsRUFBRUEsU0FBU0EsRUFBRUEsQ0FBQ0E7UUFFeEVBLEVBQUVBLENBQUNBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBO1lBQ1pBLElBQUlBLFNBQVNBLEdBQUdBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLEtBQUtBO2dCQUMvQkEsSUFBSUEsR0FBR0EsR0FBR0EsS0FBS0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2hDQSxTQUFTQSxDQUFDQSxLQUFLQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxnQkFBZ0JBO2dCQUN0Q0EsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0E7WUFDYkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFFSEEsT0FBT0EsQ0FBQ0EsTUFBTUEsR0FBR0EsU0FBU0EsQ0FBQ0E7UUFDN0JBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ05BLE9BQU9BLENBQUNBLE1BQU1BLEdBQUdBLFdBQVdBLENBQUNBO1FBQy9CQSxDQUFDQTtRQUVEQSxFQUFFQSxDQUFDQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNWQSxJQUFJQSxTQUFTQSxHQUFHQSxLQUFLQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxFQUFFQSxLQUFLQTtnQkFDbkNBLElBQUlBLEdBQUdBLEdBQUdBLEtBQUtBLENBQUNBLFFBQVFBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO2dCQUNoQ0EsU0FBU0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsZ0JBQWdCQTtnQkFDdENBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBO1lBQ2JBLENBQUNBLENBQUNBLENBQUNBO1lBRUhBLE9BQU9BLENBQUNBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBLElBQUlBLENBQUNBO1lBQzFCQSxPQUFPQSxDQUFDQSxNQUFNQSxHQUFHQSxTQUFTQSxDQUFDQTtRQUM3QkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsT0FBT0EsQ0FBQ0EsSUFBSUEsR0FBR0EsT0FBT0EsQ0FBQ0EsTUFBTUEsR0FBR0EsV0FBV0EsQ0FBQ0E7UUFDOUNBLENBQUNBO1FBRURBLFNBQVNBLENBQUNBLEtBQUtBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBO1FBQ3pCQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQTtJQUNuQkEsQ0FBQ0E7SUFXREYsS0FBS0EsQ0FBQ0EsRUFBRUEsTUFBTUEsRUFBRUEsSUFBSUEsRUFBRUEsTUFBTUEsRUFBRUE7UUFDNUJHLElBQUlBLENBQUNBLE1BQU1BLEdBQUdBLE1BQU1BLENBQUNBO1FBRXJCQSxJQUFJQSxDQUFDQSxlQUFlQSxHQUFHQTtZQUNyQixHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzlDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDcEMsQ0FBQztRQUNILENBQUMsQ0FBQ0E7SUFDSkEsQ0FBQ0E7SUFFREgsMkVBQTJFQTtJQUMzRUEsMEVBQTBFQTtJQUMxRUEsb0JBQW9CQTtJQUNwQkEsS0FBS0E7UUFDSEksSUFBSUEsRUFBRUEsTUFBTUEsRUFBRUEsZUFBZUEsRUFBRUEsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFFdkNBLElBQUlBLFdBQVdBLEdBQUdBLElBQUlBLEtBQUtBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1FBRTNDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxFQUFFQSxDQUFDQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxFQUFFQSxDQUFDQTtZQUM5Q0EsV0FBV0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsS0FBS0EsRUFBRUEsQ0FBQ0E7UUFDckNBLENBQUNBO1FBRURBLElBQUlBLElBQUlBLEdBQUdBLElBQUlBLGVBQWVBLEVBQUVBLENBQUNBLENBQUNBLHFCQUFxQkE7UUFFdkRBLE1BQU1BLENBQUNBLEVBQUVBLE1BQU1BLEVBQUVBLFdBQVdBLEVBQUVBLElBQUlBLEVBQUVBLENBQUNBO0lBQ3ZDQSxDQUFDQTtBQUNISixDQUFDQTtBQUVELHFEQUFxRCxjQUFjO0lBQ2pFSyxLQUFLQTtRQUNIQyxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQTtJQUNwQ0EsQ0FBQ0E7QUFDSEQsQ0FBQ0E7QUFFRCwrQ0FBK0MsY0FBYztJQVEzREUsWUFBWUEsTUFBY0EsRUFBRUEsTUFBcUJBO1FBQy9DQyxPQUFPQSxDQUFDQTtRQUNSQSxJQUFJQSxDQUFDQSxNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQTtRQUNyQkEsSUFBSUEsQ0FBQ0EsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0E7UUFDckJBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO0lBQ3JCQSxDQUFDQTtJQVpERCxPQUFPQSxjQUFjQSxDQUFDQSxFQUFFQSxNQUFNQSxFQUFFQSxNQUFNQSxFQUFFQSxLQUFLQSxFQUFFQTtRQUM3Q0UsSUFBSUEsU0FBU0EsR0FBR0EscUJBQXFCQSxDQUFDQSxjQUFjQSxDQUFDQSxFQUFFQSxNQUFNQSxFQUFFQSxLQUFLQSxFQUFFQSxDQUFDQSxDQUFDQTtRQUN4RUEsTUFBTUEsQ0FBQ0EsSUFBSUEseUJBQXlCQSxDQUFDQSxNQUFNQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtJQUMxREEsQ0FBQ0E7SUFXREYsS0FBS0E7UUFDSEcsSUFBSUEsRUFBRUEsTUFBTUEsRUFBRUEsSUFBSUEsRUFBRUEsR0FBR0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsS0FBS0EsRUFBRUEsQ0FBQ0E7UUFDM0NBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLEVBQUVBLE1BQU1BLEVBQUVBLElBQUlBLENBQUNBLENBQUNBO0lBQ25EQSxDQUFDQTtBQUNISCxDQUFDQTtBQUVELHdCQUF3QixLQUFLLEVBQUUsS0FBSztJQUNsQ0ksR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsR0FBR0EsS0FBS0EsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsRUFBRUEsQ0FBQ0E7UUFDN0NBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLEtBQUtBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO0lBQ3hCQSxDQUFDQTtBQUNIQSxDQUFDQSJ9