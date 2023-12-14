import { assert } from '@ember/debug';
import { ENV } from '@ember/-internals/environment';
import { isElementDescriptor, expandProperties, setClassicDecorator } from '@ember/-internals/metal';
import { getFactoryFor } from '@ember/-internals/container';
import { setObservers } from '@ember/-internals/utils';
import CoreObject from '@ember/object/core';
import Observable from '@ember/object/observable';
export { notifyPropertyChange, defineProperty, get, set, getProperties, setProperties, computed, trySet } from '@ember/-internals/metal';
class EmberObject extends CoreObject.extend(Observable) {
  get _debugContainerKey() {
    let factory = getFactoryFor(this);
    return factory !== undefined && factory.fullName;
  }
}
export default EmberObject;
/**
  Decorator that turns the target function into an Action which can be accessed
  directly by reference.

  ```js
  import Component from '@ember/component';
  import { action, set } from '@ember/object';

  export default class Tooltip extends Component {
    @action
    toggleShowing() {
      set(this, 'isShowing', !this.isShowing);
    }
  }
  ```
  ```hbs
  <!-- template.hbs -->
  <button {{action this.toggleShowing}}>Show tooltip</button>

  {{#if isShowing}}
    <div class="tooltip">
      I'm a tooltip!
    </div>
  {{/if}}
  ```

  Decorated actions also interop with the string style template actions:

  ```hbs
  <!-- template.hbs -->
  <button {{action "toggleShowing"}}>Show tooltip</button>

  {{#if isShowing}}
    <div class="tooltip">
      I'm a tooltip!
    </div>
  {{/if}}
  ```

  It also binds the function directly to the instance, so it can be used in any
  context and will correctly refer to the class it came from:

  ```hbs
  <!-- template.hbs -->
  <button
    {{did-insert this.toggleShowing}}
    {{on "click" this.toggleShowing}}
  >
    Show tooltip
  </button>

  {{#if isShowing}}
    <div class="tooltip">
      I'm a tooltip!
    </div>
  {{/if}}
  ```

  This can also be used in JavaScript code directly:

  ```js
  import Component from '@ember/component';
  import { action, set } from '@ember/object';

  export default class Tooltip extends Component {
    constructor() {
      super(...arguments);

      // this.toggleShowing is still bound correctly when added to
      // the event listener
      document.addEventListener('click', this.toggleShowing);
    }

    @action
    toggleShowing() {
      set(this, 'isShowing', !this.isShowing);
    }
  }
  ```

  This is considered best practice, since it means that methods will be bound
  correctly no matter where they are used. By contrast, the `{{action}}` helper
  and modifier can also be used to bind context, but it will be required for
  every usage of the method:

  ```hbs
  <!-- template.hbs -->
  <button
    {{did-insert (action this.toggleShowing)}}
    {{on "click" (action this.toggleShowing)}}
  >
    Show tooltip
  </button>

  {{#if isShowing}}
    <div class="tooltip">
      I'm a tooltip!
    </div>
  {{/if}}
  ```

  They also do not have equivalents in JavaScript directly, so they cannot be
  used for other situations where binding would be useful.

  @public
  @method action
  @for @ember/object
  @static
  @param {Function|undefined} callback The function to turn into an action,
                                       when used in classic classes
  @return {PropertyDecorator} property decorator instance
*/
const BINDINGS_MAP = new WeakMap();
function hasProto(obj) {
  return obj != null && obj.constructor !== undefined && typeof obj.constructor.proto === 'function';
}
function setupAction(target, key, actionFn) {
  if (hasProto(target)) {
    target.constructor.proto();
  }
  if (!Object.prototype.hasOwnProperty.call(target, 'actions')) {
    let parentActions = target.actions;
    // we need to assign because of the way mixins copy actions down when inheriting
    target.actions = parentActions ? Object.assign({}, parentActions) : {};
  }
  assert("[BUG] Somehow the target doesn't have actions!", target.actions != null);
  target.actions[key] = actionFn;
  return {
    get() {
      let bindings = BINDINGS_MAP.get(this);
      if (bindings === undefined) {
        bindings = new Map();
        BINDINGS_MAP.set(this, bindings);
      }
      let fn = bindings.get(actionFn);
      if (fn === undefined) {
        fn = actionFn.bind(this);
        bindings.set(actionFn, fn);
      }
      return fn;
    }
  };
}
export function action(...args) {
  let actionFn;
  if (!isElementDescriptor(args)) {
    actionFn = args[0];
    let decorator = function (target, key, _desc, _meta, isClassicDecorator) {
      assert('The @action decorator may only be passed a method when used in classic classes. You should decorate methods directly in native classes', isClassicDecorator);
      assert('The action() decorator must be passed a method when used in classic classes', typeof actionFn === 'function');
      return setupAction(target, key, actionFn);
    };
    setClassicDecorator(decorator);
    return decorator;
  }
  let [target, key, desc] = args;
  actionFn = desc?.value;
  assert('The @action decorator must be applied to methods when used in native classes', typeof actionFn === 'function');
  // SAFETY: TS types are weird with decorators. This should work.
  return setupAction(target, key, actionFn);
}
// SAFETY: TS types are weird with decorators. This should work.
setClassicDecorator(action);
/**
  Specify a method that observes property changes.

  ```javascript
  import EmberObject from '@ember/object';
  import { observer } from '@ember/object';

  export default EmberObject.extend({
    valueObserver: observer('value', function() {
      // Executes whenever the "value" property changes
    })
  });
  ```

  Also available as `Function.prototype.observes` if prototype extensions are
  enabled.

  @method observer
  @for @ember/object
  @param {String} propertyNames*
  @param {Function} func
  @return func
  @public
  @static
*/
export function observer(...args) {
  let funcOrDef = args.pop();
  assert('observer must be provided a function or an observer definition', typeof funcOrDef === 'function' || typeof funcOrDef === 'object' && funcOrDef !== null);
  let func;
  let dependentKeys;
  let sync;
  if (typeof funcOrDef === 'function') {
    func = funcOrDef;
    dependentKeys = args;
    sync = !ENV._DEFAULT_ASYNC_OBSERVERS;
  } else {
    func = funcOrDef.fn;
    dependentKeys = funcOrDef.dependentKeys;
    sync = funcOrDef.sync;
  }
  assert('observer called without a function', typeof func === 'function');
  assert('observer called without valid path', Array.isArray(dependentKeys) && dependentKeys.length > 0 && dependentKeys.every(p => typeof p === 'string' && Boolean(p.length)));
  assert('observer called without sync', typeof sync === 'boolean');
  let paths = [];
  for (let dependentKey of dependentKeys) {
    expandProperties(dependentKey, path => paths.push(path));
  }
  setObservers(func, {
    paths,
    sync
  });
  return func;
}