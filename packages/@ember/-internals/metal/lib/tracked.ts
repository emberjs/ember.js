import { combine, CONSTANT_TAG, Tag } from '@glimmer/reference';
import { dirty, tagFor, tagForProperty, update } from './tags';

type Option<T> = T | null;
type unusable = null | undefined | void | {};

/**
  An object that that tracks @tracked properties that were consumed.

  @private
 */
class Tracker {
  private tags = new Set<Tag>();
  private last: Option<Tag> = null;

  add(tag: Tag) {
    this.tags.add(tag);
    this.last = tag;
  }

  get size() {
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
export function tracked(...dependencies: string[]): MethodDecorator;
export function tracked(target: unknown, key: PropertyKey): any;
export function tracked(
  target: unknown,
  key: PropertyKey,
  descriptor: PropertyDescriptor
): PropertyDescriptor;
export function tracked(...dependencies: any[]): any {
  let [, key, descriptor] = dependencies;

  if (descriptor === undefined || 'initializer' in descriptor) {
    return descriptorForDataProperty(key, descriptor);
  } else {
    return descriptorForAccessor(key, descriptor);
  }
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

export function getCurrentTracker(): Option<Tracker> {
  return CURRENT_TRACKER;
}

export function setCurrentTracker(tracker: Tracker = new Tracker()): Tracker {
  return (CURRENT_TRACKER = tracker);
}

function descriptorForAccessor(
  key: string | symbol,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  let get = descriptor.get as Function;
  let set = descriptor.set as Function;

  function getter(this: any) {
    // Swap the parent tracker for a new tracker
    let old = CURRENT_TRACKER;
    let tracker = (CURRENT_TRACKER = new Tracker());

    // Call the getter
    let ret = get.call(this);

    // Swap back the parent tracker
    CURRENT_TRACKER = old;

    // Combine the tags in the new tracker and add them to the parent tracker
    let tag = tracker.combine();
    if (CURRENT_TRACKER) CURRENT_TRACKER.add(tag);

    // Update the UpdatableTag for this property with the tag for all of the
    // consumed dependencies.
    update(tagForProperty(this, key), tag);

    return ret;
  }

  function setter(this: unusable) {
    dirty(tagForProperty(this, key));
    set.apply(this, arguments);
  }

  return {
    enumerable: true,
    configurable: false,
    get: get && getter,
    set: set && setter,
  };
}

export type Key = string;

/**
  @private

  A getter/setter for change tracking for a particular key. The accessor
  acts just like a normal property, but it triggers the `propertyDidChange`
  hook when written to.

  Values are saved on the object using a "shadow key," or a symbol based on the
  tracked property name. Sets write the value to the shadow key, and gets read
  from it.
 */

function descriptorForDataProperty(key: string, descriptor: PropertyDescriptor) {
  let shadowKey = Symbol(key);

  return {
    enumerable: true,
    configurable: true,

    get() {
      if (CURRENT_TRACKER) CURRENT_TRACKER.add(tagForProperty(this, key));

      if (!(shadowKey in this)) {
        this[shadowKey] = descriptor.value;
      }

      return this[shadowKey];
    },

    set(newValue: any) {
      tagFor(this).inner!['dirty']();
      dirty(tagForProperty(this, key));
      this[shadowKey] = newValue;
      propertyDidChange();
    },
  };
}

export interface Interceptors {
  [key: string]: boolean;
}

let propertyDidChange = function() {};

export function setPropertyDidChange(cb: () => void) {
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
