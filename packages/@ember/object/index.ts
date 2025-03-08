import { assert } from '@ember/debug';
import { ENV } from '@ember/-internals/environment';
import type { ElementDescriptor, ExtendedMethodDecorator } from '@ember/-internals/metal';
import {
  isElementDescriptor,
  expandProperties,
  setClassicDecorator,
} from '@ember/-internals/metal';
import { getFactoryFor } from '@ember/-internals/container';
import { setObservers } from '@ember/-internals/utils';
import type { AnyFn } from '@ember/-internals/utility-types';
import CoreObject from '@ember/object/core';
import Observable from '@ember/object/observable';
import {
  type Decorator,
  identifyModernDecoratorArgs,
  isModernDecoratorArgs,
} from '@ember/-internals/metal/lib/decorator-util';

export {
  notifyPropertyChange,
  defineProperty,
  get,
  set,
  getProperties,
  setProperties,
  computed,
  trySet,
} from '@ember/-internals/metal';

/**
@module @ember/object
*/

/**
  `EmberObject` is the main base class for all Ember objects. It is a subclass
  of `CoreObject` with the `Observable` mixin applied. For details,
  see the documentation for each of these.

  @class EmberObject
  @extends CoreObject
  @uses Observable
  @public
*/
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface EmberObject extends Observable {}
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
  import { tracked } from '@glimmer/tracking';
  import { action } from '@ember/object';

  export default class Tooltip extends Component {
    @tracked isShowing = false;

    @action
    toggleShowing() {
      this.isShowing = !this.isShowing;
    }
  }
  ```
  ```hbs
  <!-- template.hbs -->
  <button {{on "click" this.toggleShowing}}>Show tooltip</button>

  {{#if isShowing}}
    <div class="tooltip">
      I'm a tooltip!
    </div>
  {{/if}}
  ```

  It also binds the function directly to the instance, so it can be used in any
  context and will correctly refer to the class it came from:

  ```js
  import Component from '@ember/component';
  import { tracked } from '@glimmer/tracking';
  import { action } from '@ember/object';

  export default class Tooltip extends Component {
    constructor() {
      super(...arguments);

      // this.toggleShowing is still bound correctly when added to
      // the event listener
      document.addEventListener('click', this.toggleShowing);
    }

    @tracked isShowing = false;

    @action
    toggleShowing() {
      this.isShowing = !this.isShowing;
    }
  }
  ```

  @public
  @method action
  @for @ember/object
  @static
  @param {Function|undefined} callback The function to turn into an action,
                                       when used in classic classes
  @return {PropertyDecorator} property decorator instance
*/

const BINDINGS_MAP = new WeakMap();

interface HasProto {
  constructor: {
    proto(): void;
  };
}

function hasProto(obj: unknown): obj is HasProto {
  return (
    obj != null &&
    (obj as any).constructor !== undefined &&
    typeof ((obj as any).constructor as any).proto === 'function'
  );
}

interface HasActions {
  actions: Record<string | symbol, unknown>;
}

function setupAction(
  target: Partial<HasActions>,
  key: string | symbol,
  actionFn: Function
): TypedPropertyDescriptor<unknown> {
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
    },
  };
}

export function action(
  target: ElementDescriptor[0],
  key: ElementDescriptor[1],
  desc: ElementDescriptor[2]
): PropertyDescriptor;
export function action(desc: PropertyDescriptor): ExtendedMethodDecorator;
export function action(
  ...args: ElementDescriptor | [PropertyDescriptor]
): PropertyDescriptor | ExtendedMethodDecorator {
  if (isModernDecoratorArgs(args)) {
    return action2023(args) as unknown as PropertyDescriptor;
  }

  let actionFn: object | Function;

  if (!isElementDescriptor(args)) {
    actionFn = args[0];

    let decorator: ExtendedMethodDecorator = function (
      target,
      key,
      _desc,
      _meta,
      isClassicDecorator
    ) {
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

  let [target, key, desc] = args;

  actionFn = desc?.value;

  assert(
    'The @action decorator must be applied to methods when used in native classes',
    typeof actionFn === 'function'
  );

  // SAFETY: TS types are weird with decorators. This should work.
  return setupAction(target, key, actionFn);
}

// SAFETY: TS types are weird with decorators. This should work.
setClassicDecorator(action as ExtendedMethodDecorator);

// ..........................................................
// OBSERVER HELPER
//

type ObserverDefinition<T extends AnyFn> = {
  dependentKeys: string[];
  fn: T;
  sync: boolean;
};

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
export function observer<T extends AnyFn>(
  ...args:
    | [propertyName: string, ...additionalPropertyNames: string[], func: T]
    | [ObserverDefinition<T>]
): T {
  let funcOrDef = args.pop();

  assert(
    'observer must be provided a function or an observer definition',
    typeof funcOrDef === 'function' || (typeof funcOrDef === 'object' && funcOrDef !== null)
  );

  let func: T;
  let dependentKeys: string[];
  let sync: boolean;

  if (typeof funcOrDef === 'function') {
    func = funcOrDef;
    dependentKeys = args as string[];
    sync = !ENV._DEFAULT_ASYNC_OBSERVERS;
  } else {
    func = funcOrDef.fn;
    dependentKeys = funcOrDef.dependentKeys;
    sync = funcOrDef.sync;
  }

  assert('observer called without a function', typeof func === 'function');
  assert(
    'observer called without valid path',
    Array.isArray(dependentKeys) &&
      dependentKeys.length > 0 &&
      dependentKeys.every((p) => typeof p === 'string' && Boolean(p.length))
  );
  assert('observer called without sync', typeof sync === 'boolean');

  let paths: string[] = [];

  for (let dependentKey of dependentKeys) {
    expandProperties(dependentKey, (path: string) => paths.push(path));
  }

  setObservers(func as Function, {
    paths,
    sync,
  });
  return func;
}

function action2023(args: Parameters<Decorator>) {
  const dec = identifyModernDecoratorArgs(args);
  switch (dec.kind) {
    case 'method':
      dec.context.addInitializer(function (this: any) {
        Object.defineProperty(
          this,
          dec.context.name,
          setupAction(this, dec.context.name, dec.value)
        );
      });
      break;
    default:
      throw new Error(`unimplemented: action on ${dec.kind} ${dec.context.name?.toString()}`);
  }
}
