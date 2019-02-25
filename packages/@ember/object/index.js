import { EMBER_NATIVE_DECORATOR_SUPPORT } from '@ember/canary-features';
import { assert } from '@ember/debug';
import { assign } from '@ember/polyfills';

/**
  Decorator that turns the target function into an Action
  Adds an `actions` object to the target object and creates a passthrough
  function that calls the original. This means the function still exists
  on the original object, and can be used directly.

  ```js
  export default class ActionDemoComponent extends Component {
    @action
    foo() {
      // do something
    }
  }
  ```
  ```hbs
  <!-- template.hbs -->
  <button onclick={{action "foo"}}>Execute foo action</button>
  ```

  It also binds the function directly to the instance, so it can be used in any
  context:

  ```hbs
  <!-- template.hbs -->
  <button onclick={{this.foo}}>Execute foo action</button>
  ```
  @method computed
  @for @ember/object
  @static
  @param {ElementDescriptor} elementDesc the descriptor of the element to decorate
  @return {ElementDescriptor} the decorated descriptor
  @private
*/
export let action;

if (EMBER_NATIVE_DECORATOR_SUPPORT) {
  let BINDINGS_MAP = new WeakMap();

  action = function action(elementDesc) {
    assert(
      'The @action decorator must be applied to methods',
      elementDesc &&
        elementDesc.kind === 'method' &&
        elementDesc.descriptor &&
        typeof elementDesc.descriptor.value === 'function'
    );

    let actionFn = elementDesc.descriptor.value;

    elementDesc.descriptor = {
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
      },
    };

    elementDesc.finisher = target => {
      let { key } = elementDesc;
      let { prototype } = target;

      if (typeof target.proto === 'function') {
        target.proto();
      }

      if (!prototype.hasOwnProperty('actions')) {
        let parentActions = prototype.actions;
        // we need to assign because of the way mixins copy actions down when inheriting
        prototype.actions = parentActions ? assign({}, parentActions) : {};
      }

      prototype.actions[key] = actionFn;

      return target;
    };

    return elementDesc;
  };
}
