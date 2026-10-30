import { assert } from '@ember/debug';
import { ENV } from '@ember/-internals/environment/lib/env';
import expandProperties from '@ember/-internals/metal/lib/expand_properties';
import { setObservers } from '@ember/-internals/utils/lib/super';
import type { AnyFn } from '@ember/-internals/utility-types';

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

  While observers are still supported, there are [plans to deprecate them](https://github.com/emberjs/rfcs/pull/1115)
  See the [in-progress deprecation guide](https://github.com/ember-learn/deprecation-app/pull/1407) 
  for guidance on how to avoid using observers.
 
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
