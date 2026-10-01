import { meta as metaFor } from '@ember/-internals/meta/lib/meta';
import { isEmberArray } from '@ember/array/-internals';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { consumeTag, untrack } from '@glimmer/validator/lib/tracking';
import { dirtyTagFor, tagFor } from '@glimmer/validator/lib/meta';
import { trackedData } from '@glimmer/validator/lib/tracked-data';
import { trackedValue, type TrackedValue } from '@glimmer/validator/lib/tracked-value';
import type { ElementDescriptor } from '..';
import { CHAIN_PASS_THROUGH } from './chain-tags';
import type { ExtendedMethodDecorator, DecoratorPropertyDescriptor } from './decorator';
import { COMPUTED_SETTERS, isElementDescriptor, setClassicDecorator } from './decorator';
import { SELF_TAG } from './tags';
import {
  type Decorator,
  identifyModernDecoratorArgs,
  isModernDecoratorArgs,
  type StandardAccessorDecorator,
  type StandardFieldDecorator,
} from './decorator-util';

/**
  @decorator
  @private

  Marks a property as tracked.

  By default, a component's properties are expected to be static,
  meaning you are not able to update them and have the template update accordingly.
  Marking a property as tracked means that when that property changes,
  a rerender of the component is scheduled so the template is kept up to date.

  There are two usages for the `@tracked` decorator, shown below.

  @example No dependencies

  If you don't pass an argument to `@tracked`, only changes to that property
  will be tracked:

  ```typescript
  import Component from '@glimmer/component';
  import { tracked } from '@glimmer/tracking';

  export default class MyComponent extends Component {
    @tracked
    remainingApples = 10
  }
  ```

  When something changes the component's `remainingApples` property, the rerender
  will be scheduled.

  @example Dependents

  If you have a computed property that depends on other properties, track both.
  Then a rerender is scheduled when one of the dependents changes.

  In the following example we have two properties,
  `eatenApples`, and `remainingApples`.

  ```typescript
  import Component from '@glimmer/component';
  import { tracked } from '@glimmer/tracking';

  const totalApples = 100;

  export default class MyComponent extends Component {
    @tracked
    eatenApples = 0

    get remainingApples() {
      return totalApples - this.eatenApples;
    }

    increment() {
      this.eatenApples = this.eatenApples + 1;
    }
  }
  ```

  @param dependencies Optional dependents to be tracked.
*/
/**
 * Reactivity options for the standalone `tracked(value, options)` form.
 *
 * - `equals` decides whether writing a value notifies consumers.
 *   It defaults to `Object.is`.
 * - `description` is used in development for debugging.
 *
 * `equals` is a function-typed property, not method syntax, on purpose.
 * This keeps its parameters checked strictly.
 * Passing an `equals` typed for the wrong value type is then a type error,
 * instead of being silently accepted.
 */
interface TrackedValueOptions<Value> {
  equals?: (a: Value, b: Value) => boolean;
  description?: string;
}

/**
 * Options for `tracked` used as a decorator, or as a field on a *classic* class
 * (`EmberObject.extend({ foo: tracked({ value }) })`).
 *
 * All properties are optional because this single shape backs several usages:
 * classic-field defaults (`tracked({ value })` / `tracked({ initializer })`),
 * and options-only native decorators (`@tracked({ equals })`).
 * Runtime assertions, not the type, enforce the mutually exclusive combinations,
 * such as passing both `value` and `initializer`.
 * They also enforce the classic-only restriction on `value`/`initializer`.
 * This matches the runtime `isDecoratorOptions` check,
 * which accepts any object composed of these keys.
 *
 * - `value` / `initializer` supply a default value and are only valid on classic
 *   classes; native classes use class field initializers instead.
 * - `equals` / `description` configure reactivity, mirroring
 *   {@link TrackedValueOptions}.
 */
interface TrackedDecoratorOptions {
  value?: any;
  initializer?: () => any;
  // `equals`/`description` intentionally duplicate `TrackedValueOptions` rather than extending it.
  // This form declares `equals` in *method* syntax, so its parameters are checked loosely.
  // That lets a typed `equals`, such as `(a: number, b: number) => boolean`,
  // still select this decorator overload,
  // instead of falling through to the standalone-value overload.
  // `TrackedValueOptions.equals` is a strict function-typed property on purpose,
  // checked against the value's type.
  equals?(a: any, b: any): boolean;
  description?: string;
}

// `PropertyDecorator` covers the `(target, key)` call that TypeScript emits
// for native class fields with legacy decorators.
// `ExtendedMethodDecorator` covers the classic-class call.
// The standard decorator types cover fields and auto-accessors with standard (stage 3) decorators.
export type TrackedDecorator = ExtendedMethodDecorator &
  PropertyDecorator &
  StandardFieldDecorator &
  StandardAccessorDecorator;

/**
 * `tracked` as a decorator factory: `@tracked({ equals })`, or on classic
 * classes `tracked({ value })` / `tracked({ initializer })`.
 */
export function tracked(propertyDesc: TrackedDecoratorOptions): TrackedDecorator;
/**
 * `tracked` as a bare decorator: `@tracked foo = 1`.
 */
export function tracked(target: object, key: string): void;
export function tracked(
  target: object,
  key: string,
  desc: DecoratorPropertyDescriptor
): DecoratorPropertyDescriptor;
/**
 * `tracked` as a bare standard (stage 3) decorator:
 * `@tracked foo = 1` or `@tracked accessor foo = 1`.
 */
export function tracked(value: undefined, context: ClassFieldDecoratorContext): void;
export function tracked<This, Value>(
  value: ClassAccessorDecoratorTarget<This, Value>,
  context: ClassAccessorDecoratorContext<This, Value>
): void;
/**
 * `tracked` as a standalone reactive value, usable outside of classes:
 * `const count = tracked(0)`.
 */
export function tracked<Value>(
  initialValue: Value,
  options?: TrackedValueOptions<Value>
): TrackedValue<Value>;
export function tracked(
  ...args: any[]
): TrackedDecorator | DecoratorPropertyDescriptor | TrackedValue<any> {
  if (isModernDecoratorArgs(args)) {
    // TODO: the cast is a lie. It avoids changing the public types.
    return tracked2023(args) as unknown as DecoratorPropertyDescriptor;
  }

  assert(
    `@tracked can only be used directly as a native decorator. If you're using tracked in classic classes, add parenthesis to call it like a function: tracked()`,
    !(isElementDescriptor(args.slice(0, 3)) && args.length === 5 && args[4] === true)
  );

  if (isElementDescriptor(args)) {
    /*
      Native-decorator form. The runtime invokes us with `(target, key, desc)`
      and consumes the returned `DecoratorPropertyDescriptor`.
      The public API is the decorated field itself: reading it consumes, assigning it dirties.

      ```js
      class Counter {
        @tracked count = 0;
      }
      ```
    */
    return descriptorForField(args);
  }

  if (args.length === 0 || (args.length === 1 && isDecoratorOptions(args[0]))) {
    /*
      Decorator-factory / classic-field form. Returns an `ExtendedMethodDecorator`.
      The public API is the resulting property on instances (get/set),
      with any default supplied by `value`/`initializer`.

      ```js
      class Counter {
        @tracked({ equals: (a, b) => a === b }) count = 0;
      }

      const Person = EmberObject.extend({
        name: tracked({ value: 'Zoey' }),
      });
      ```
    */
    return makeTrackedDecorator(args[0]);
  }

  let [initialValue, options] = args;

  assert(
    `tracked() may only receive an options object containing 'equals' or 'description' as its second argument, received ${options}`,
    options === undefined || (typeof options === 'object' && options !== null)
  );

  /*
    Standalone-value form. Returns a `TrackedValue` usable outside of classes.

    ```js
    const count = tracked(0);

    count.value;                // read (consumes), `Object.is`-based equality
    count.value = 1;            // write (dirties)
    count.get();                // function shorthand for reading
    count.set(2);               // returns `true` if the value changed
    count.update((n) => n + 1); // write from current, without consuming
    count.freeze();             // prevent further writes
    ```
  */
  return trackedValue(initialValue, options);
}

const DECORATOR_OPTION_KEYS = ['value', 'initializer', 'equals', 'description'];

function isDecoratorOptions(value: unknown): value is TrackedDecoratorOptions {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  let proto = Object.getPrototypeOf(value);

  if (proto !== Object.prototype && proto !== null) {
    return false;
  }

  return Object.keys(value).every((key) => DECORATOR_OPTION_KEYS.includes(key));
}

function makeTrackedDecorator(propertyDesc?: TrackedDecoratorOptions): TrackedDecorator {
  if (DEBUG && propertyDesc) {
    assert(
      `The options object passed to tracked() may only contain a 'value' or an 'initializer' property, not both. Received: [${Object.keys(
        propertyDesc
      )}]`,
      !('value' in propertyDesc && 'initializer' in propertyDesc)
    );

    assert(
      `The initializer passed to tracked must be a function. Received ${propertyDesc.initializer}`,
      !('initializer' in propertyDesc) || typeof propertyDesc.initializer === 'function'
    );

    assert(
      `The 'equals' option passed to tracked must be a function. Received ${propertyDesc.equals}`,
      !('equals' in propertyDesc) || typeof propertyDesc.equals === 'function'
    );

    assert(
      `The 'description' option passed to tracked must be a string. Received ${propertyDesc.description}`,
      !('description' in propertyDesc) || typeof propertyDesc.description === 'string'
    );
  }

  let initializer = propertyDesc ? propertyDesc.initializer : undefined;
  let value = propertyDesc ? propertyDesc.value : undefined;
  let hasInitialValue =
    propertyDesc !== undefined && ('value' in propertyDesc || 'initializer' in propertyDesc);
  let options = { equals: propertyDesc?.equals, description: propertyDesc?.description };

  let decorator = function (
    target: object,
    key: string,
    desc?: DecoratorPropertyDescriptor,
    _meta?: any,
    isClassicDecorator?: boolean
  ): DecoratorPropertyDescriptor {
    let decoratorArgs = Array.from(arguments);
    if (isModernDecoratorArgs(decoratorArgs)) {
      assert(
        `You attempted to set a default value for ${decoratorArgs[1].name?.toString()} with the @tracked({ value: 'default' }) syntax. You can only use this syntax with classic classes. For native classes, you can use class initializers: @tracked field = 'default';`,
        !hasInitialValue
      );
      // TODO: the cast is a lie. It avoids changing the public types.
      return tracked2023(decoratorArgs, options) as unknown as DecoratorPropertyDescriptor;
    }

    assert(
      `You attempted to set a default value for ${key} with the @tracked({ value: 'default' }) syntax. You can only use this syntax with classic classes. For native classes, you can use class initializers: @tracked field = 'default';`,
      isClassicDecorator || !hasInitialValue
    );

    let fieldDesc = isClassicDecorator ? { initializer: initializer || (() => value) } : desc;

    return descriptorForField([target, key, fieldDesc], options);
  };

  setClassicDecorator(decorator);

  return decorator as TrackedDecorator;
}

if (DEBUG) {
  // Normally this isn't a classic decorator, but we want to throw a helpful
  // error in development so we need it to treat it like one
  setClassicDecorator(tracked);
}

function descriptorForField(
  [target, key, desc]: ElementDescriptor,
  options?: { equals?: (a: any, b: any) => boolean; description?: string }
): DecoratorPropertyDescriptor {
  assert(
    `You attempted to use @tracked on ${key}, but that element is not a class field. @tracked is only usable on class fields. Native getters and setters will autotrack add any tracked fields they encounter, so there is no need mark getters and setters with @tracked.`,
    !desc || (!desc.value && !desc.get && !desc.set)
  );

  let { getter, setter } = trackedData<any, any>(key, desc ? desc.initializer : undefined);
  let equals = options?.equals;

  function get(this: object): unknown {
    let value = getter(this);

    // Add the tag of the returned value if it is an array, since arrays
    // should always cause updates if they are consumed and then changed
    if (Array.isArray(value) || isEmberArray(value)) {
      consumeTag(tagFor(value, '[]'));
    }

    return value;
  }

  function set(this: object, newValue: unknown): void {
    if (
      equals !== undefined &&
      equals(
        untrack(() => getter(this)),
        newValue
      )
    ) {
      return;
    }

    setter(this, newValue);
    dirtyTagFor(this, SELF_TAG);
  }

  let newDesc = {
    enumerable: true,
    configurable: true,
    isTracked: true,

    get,
    set,
  };

  COMPUTED_SETTERS.add(set);

  metaFor(target).writeDescriptors(key, new TrackedDescriptor(get, set));

  return newDesc;
}

export class TrackedDescriptor {
  constructor(
    private _get: () => unknown,
    private _set: (value: unknown) => void
  ) {
    CHAIN_PASS_THROUGH.add(this);
  }

  get(obj: object): unknown {
    return this._get.call(obj);
  }

  set(obj: object, _key: string, value: unknown): void {
    this._set.call(obj, value);
  }
}

function tracked2023(
  args: Parameters<Decorator>,
  options?: { equals?: (a: any, b: any) => boolean; description?: string }
) {
  const dec = identifyModernDecoratorArgs(args);
  switch (dec.kind) {
    case 'field':
      dec.context.addInitializer(function (this: any) {
        let initial = this[dec.context.name];
        Object.defineProperty(
          this,
          dec.context.name,
          descriptorForField(
            [this, dec.context.name as string, { initializer: () => initial }],
            options
          ) as any
        );
      });
      return;
    case 'accessor': {
      let equals = options?.equals;
      return {
        get(this: object) {
          consumeTag(tagFor(this, dec.context.name));
          let value = dec.value.get.call(this);
          if (Array.isArray(value) || isEmberArray(value)) {
            consumeTag(tagFor(value, '[]'));
          }
          return value;
        },
        set(this: object, value: unknown) {
          if (
            equals !== undefined &&
            equals(
              untrack(() => dec.value.get.call(this)),
              value
            )
          ) {
            return;
          }
          dirtyTagFor(this, dec.context.name);
          dirtyTagFor(this, SELF_TAG);
          return dec.value.set.call(this, value);
        },
      };
    }
    default:
      throw new Error(`unimplemented: tracked on ${dec.kind} ${dec.context.name?.toString()}`);
  }
}
