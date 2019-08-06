import { isEmberArray } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { combine, CONSTANT_TAG, Tag } from '@glimmer/reference';
import { Decorator, DecoratorPropertyDescriptor, isElementDescriptor } from './decorator';
import { setClassicDecorator } from './descriptor_map';
import { markObjectAsDirty, tagForProperty, update } from './tags';

type Option<T> = T | null;

/**
  An object that that tracks @tracked properties that were consumed.

  @private
*/
export class Tracker {
  private tags = new Set<Tag>();
  private last: Option<Tag> = null;

  add(tag: Tag): void {
    this.tags.add(tag);
    this.last = tag;
  }

  get size(): number {
    return this.tags.size;
  }

  combine(): Tag {
    if (this.tags.size === 0) {
      return CONSTANT_TAG;
    } else if (this.tags.size === 1) {
      return this.last as Tag;
    } else {
      let tags: Tag[] = [];
      this.tags.forEach(tag => tags.push(tag));
      return combine(tags);
    }
  }
}

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
  import Component, { tracked } from '@glimmer/component';

  export default class MyComponent extends Component {
    @tracked
    remainingApples = 10
  }
  ```

  When something changes the component's `remainingApples` property, the rerender
  will be scheduled.

  @example Dependents

  In the case that you have a computed property that depends other
  properties, you want to track both so that when one of the
  dependents change, a rerender is scheduled.

  In the following example we have two properties,
  `eatenApples`, and `remainingApples`.

  ```typescript
  import Component, { tracked } from '@glimmer/component';

  const totalApples = 100;

  export default class MyComponent extends Component {
    @tracked
    eatenApples = 0

    @tracked('eatenApples')
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
export function tracked(propertyDesc: { value: any; initializer: () => any }): Decorator;
export function tracked(
  target: object,
  key: string,
  desc: DecoratorPropertyDescriptor
): DecoratorPropertyDescriptor;
export function tracked(...args: any[]): Decorator | DecoratorPropertyDescriptor {
  assert(
    `@tracked can only be used directly as a native decorator. If you're using tracked in classic classes, add parenthesis to call it like a function: tracked()`,
    !(isElementDescriptor(args.slice(0, 3)) && args.length === 5 && args[4] === true)
  );

  if (!isElementDescriptor(args)) {
    let propertyDesc = args[0];

    assert(
      `tracked() may only receive an options object containing 'value' or 'initializer', received ${propertyDesc}`,
      args.length === 0 || (typeof propertyDesc === 'object' && propertyDesc !== null)
    );

    if (DEBUG && propertyDesc) {
      let keys = Object.keys(propertyDesc);

      assert(
        `The options object passed to tracked() may only contain a 'value' or 'initializer' property, not both. Received: [${keys}]`,
        keys.length <= 1 &&
          (keys[0] === undefined || keys[0] === 'value' || keys[0] === 'initializer')
      );

      assert(
        `The initializer passed to tracked must be a function. Received ${propertyDesc.initializer}`,
        !('initializer' in propertyDesc) || typeof propertyDesc.initializer === 'function'
      );
    }

    let initializer = propertyDesc ? propertyDesc.initializer : undefined;
    let value = propertyDesc ? propertyDesc.value : undefined;

    let decorator = function(
      target: object,
      key: string,
      _desc: DecoratorPropertyDescriptor,
      _meta?: any,
      isClassicDecorator?: boolean
    ): DecoratorPropertyDescriptor {
      assert(
        `You attempted to set a default value for ${key} with the @tracked({ value: 'default' }) syntax. You can only use this syntax with classic classes. For native classes, you can use class initializers: @tracked field = 'default';`,
        isClassicDecorator
      );

      let fieldDesc = {
        initializer: initializer || (() => value),
      };

      return descriptorForField([target, key, fieldDesc]);
    };

    setClassicDecorator(decorator);

    return decorator;
  }

  return descriptorForField(args);
}

if (DEBUG) {
  // Normally this isn't a classic decorator, but we want to throw a helpful
  // error in development so we need it to treat it like one
  setClassicDecorator(tracked);
}

function descriptorForField([_target, key, desc]: [
  object,
  string,
  DecoratorPropertyDescriptor
]): DecoratorPropertyDescriptor {
  assert(
    `You attempted to use @tracked on ${key}, but that element is not a class field. @tracked is only usable on class fields. Native getters and setters will autotrack add any tracked fields they encounter, so there is no need mark getters and setters with @tracked.`,
    !desc || (!desc.value && !desc.get && !desc.set)
  );

  let initializer = desc ? desc.initializer : undefined;
  let values = new WeakMap();
  let hasInitializer = typeof initializer === 'function';

  return {
    enumerable: true,
    configurable: true,

    get(): any {
      let propertyTag = tagForProperty(this, key);

      if (CURRENT_TRACKER) CURRENT_TRACKER.add(propertyTag);

      let value;

      // If the field has never been initialized, we should initialize it
      if (hasInitializer && !values.has(this)) {
        value = initializer.call(this);

        values.set(this, value);
      } else {
        value = values.get(this);
      }

      // Add the tag of the returned value if it is an array, since arrays
      // should always cause updates if they are consumed and then changed
      if (Array.isArray(value) || isEmberArray(value)) {
        update(propertyTag, tagForProperty(value, '[]'));
      }

      return value;
    },

    set(newValue: any): void {
      markObjectAsDirty(this, key);

      values.set(this, newValue);

      if (propertyDidChange !== null) {
        propertyDidChange();
      }
    },
  };
}

/**
  @private

  Whenever a tracked computed property is entered, the current tracker is
  saved off and a new tracker is replaced.

  Any tracked properties consumed are added to the current tracker.

  When a tracked computed property is exited, the tracker's tags are
  combined and added to the parent tracker.

  The consequence is that each tracked computed property has a tag
  that corresponds to the tracked properties consumed inside of
  itself, including child tracked computed properties.
*/
let CURRENT_TRACKER: Option<Tracker> = null;

export function track(callback: () => void) {
  let parent = CURRENT_TRACKER;
  let current = new Tracker();

  CURRENT_TRACKER = current;

  try {
    callback();
  } finally {
    CURRENT_TRACKER = parent;
  }

  return current.combine();
}

export function consume(tag: Tag) {
  if (CURRENT_TRACKER !== null) {
    CURRENT_TRACKER.add(tag);
  }
}

export function isTracking() {
  return CURRENT_TRACKER !== null;
}

export type Key = string;

export interface Interceptors {
  [key: string]: boolean;
}

let propertyDidChange: (() => void) | null = null;

export function setPropertyDidChange(cb: () => void): void {
  propertyDidChange = cb;
}

export class UntrackedPropertyError extends Error {
  static for(obj: any, key: string): UntrackedPropertyError {
    return new UntrackedPropertyError(
      obj,
      key,
      `The property '${key}' on ${obj} was changed after being rendered. If you want to change a property used in a template after the component has rendered, mark the property as a tracked property with the @tracked decorator.`
    );
  }

  constructor(public target: any, public key: string, message: string) {
    super(message);
  }
}

/**
 * Function that can be used in development mode to generate more meaningful
 * error messages.
 */
export interface UntrackedPropertyErrorThrower {
  (obj: any, key: string): void;
}
