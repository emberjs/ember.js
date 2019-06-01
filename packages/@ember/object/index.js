import { EMBER_NATIVE_DECORATOR_SUPPORT } from '@ember/canary-features';
import { assert } from '@ember/debug';
import { assign } from '@ember/polyfills';
import { isElementDescriptor, setClassicDecorator } from '@ember/-internals/metal';

/**
  Decorator that turns the target function into an Action which can be accessed
  directly by reference.

  ```js
  import Component from '@ember/component';
  import { action, set } from '@ember/object';

  export default class Tooltip extends Component {
    &#64;action
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

    &#64;action
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
