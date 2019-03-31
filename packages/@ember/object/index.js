import { EMBER_NATIVE_DECORATOR_SUPPORT } from '@ember/canary-features';
import { assert } from '@ember/debug';
import { assign } from '@ember/polyfills';
import { isElementDescriptor, setClassicDecorator } from '@ember/-internals/metal';

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
  @method action
  @category EMBER_NATIVE_DECORATOR_SUPPORT
  @for @ember/object
  @static
  @param {} elementDesc the descriptor of the element to decorate
  @return {ElementDescriptor} the decorated descriptor
  @private
*/
export let action;

if (EMBER_NATIVE_DECORATOR_SUPPORT) {
  let BINDINGS_MAP = new WeakMap();

  let setupAction = function(target, key, actionFn) {
    if (target.constructor !== undefined && typeof target.constructor.proto === 'function') {
      target.constructor.proto();
    }

    if (!target.hasOwnProperty('actions')) {
      let parentActions = target.actions;
      // we need to assign because of the way mixins copy actions down when inheriting
      target.actions = parentActions ? assign({}, parentActions) : {};
    }

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
      },
    };
  };

  action = function action(target, key, desc) {
    let actionFn;

    if (!isElementDescriptor([target, key, desc])) {
      actionFn = target;

      let decorator = function(target, key, desc, meta, isClassicDecorator) {
        assert(
          'The @action decorator may only be passed a method when used in classic classes. You should decorate methods directly in native classes',
          isClassicDecorator
        );

        assert(
          'The action() decorator must be passed a method when used in classic classes',
          typeof actionFn === 'function'
        );

        return setupAction(target, key, actionFn);
      };

      setClassicDecorator(decorator);

      return decorator;
    }

    actionFn = desc.value;

    assert(
      'The @action decorator must be applied to methods when used in native classes',
      typeof actionFn === 'function'
    );

    return setupAction(target, key, actionFn);
  };

  setClassicDecorator(action);
}
