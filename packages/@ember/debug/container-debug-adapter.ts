import { classify, dasherize } from '@ember/-internals/string';
import EmberObject from '@ember/object/lib/ember-object';
import { PLAIN_FRAMEWORK_CLASS } from '@ember/-internals/container/lib/container';
import { isDestroyed, isDestroying } from '@glimmer/destroyable';
import { assert } from '@ember/debug';
import CoreObject from '@ember/object/lib/core-object';
import type Owner from '@ember/owner';
import { getOwner, setOwner } from '@ember/-internals/owner';
import type { Resolver } from '@ember/-internals/owner';
import { NAMESPACES } from '@ember/-internals/metal/lib/namespace_search';

/**
@module @ember/debug/container-debug-adapter
*/

/**
  The base class of `ContainerDebugAdapter` when the `EMBER_DROP_CLASSIC_FEATURES` build
  flag is set. It extends no other class.

  When the owner is destroyed, the container calls `willDestroy`, then
  destroys the instance with `@ember/destroyable`.
*/
class PlainContainerDebugAdapterBase {
  static [PLAIN_FRAMEWORK_CLASS] = true;

  /** The container creates instances only through `create`. */
  static create<T extends PlainContainerDebugAdapterBase>(
    this: new (owner: Owner) => T,
    props: object
  ): T {
    let owner = getOwner(props);
    assert('ContainerDebugAdapter must be created by its owner', owner);

    return new this(owner);
  }

  constructor(owner: Owner) {
    setOwner(this, owner);
  }

  get isDestroying(): boolean {
    return isDestroying(this);
  }

  get isDestroyed(): boolean {
    return isDestroyed(this);
  }

  /** Empty, so that `super.willDestroy()` works in subclasses. */
  willDestroy(): void {}
}

const ContainerDebugAdapterBase = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? PlainContainerDebugAdapterBase : EmberObject
) as typeof EmberObject;

/**
  The `ContainerDebugAdapter` helps the container and resolver interface
  with tools that debug Ember such as the
  [Ember Inspector](https://github.com/emberjs/ember-inspector)
  for Chrome and Firefox.

  This class can be extended by a custom resolver implementer
  to override some of the methods with library-specific code.

  The methods likely to be overridden are:

  * `canCatalogEntriesByType`
  * `catalogEntriesByType`

  The adapter will need to be registered
  in the application's container as `container-debug-adapter:main`.

  Example:

  ```javascript
  Application.initializer({
    name: "containerDebugAdapter",

    initialize(application) {
      application.register('container-debug-adapter:main', require('app/container-debug-adapter'));
    }
  });
  ```

  @class ContainerDebugAdapter
  @extends EmberObject
  @since 1.5.0
  @public
*/
export default class ContainerDebugAdapter extends ContainerDebugAdapterBase {
  constructor(owner: Owner) {
    super(owner);

    this.resolver = getOwner(this)!.lookup('resolver-for-debugging:main') as Resolver;
  }

  /**
    The resolver instance of the application
    being debugged. This property will be injected
    on creation.

    @property resolver
    @public
  */
  resolver: Resolver;

  /**
    Returns true if it is possible to catalog a list of available
    classes in the resolver for a given type.

    @method canCatalogEntriesByType
    @param {String} type The type. e.g. "model", "controller", "route".
    @return {boolean} whether a list is available for this type.
    @public
  */
  canCatalogEntriesByType(type: string) {
    if (type === 'model' || type === 'template') {
      return false;
    }

    return true;
  }

  /**
    Returns the available classes a given type.

    @method catalogEntriesByType
    @param {String} type The type. e.g. "model", "controller", "route".
    @return {Array} An array of strings.
    @public
  */
  catalogEntriesByType(type: string): string[] {
    let namespaces = NAMESPACES;
    let types: string[] = [];
    let typeSuffixRegex = new RegExp(`${classify(type)}$`);

    namespaces.forEach((namespace) => {
      for (let key in namespace) {
        if (!Object.prototype.hasOwnProperty.call(namespace, key)) {
          continue;
        }
        if (typeSuffixRegex.test(key)) {
          let klass = (namespace as any)[key];
          let isClass = import.meta.env?.EMBER_DROP_CLASSIC_FEATURES
            ? typeof klass === 'function'
            : CoreObject.detect(klass);

          if (isClass) {
            types.push(dasherize(key.replace(typeSuffixRegex, '')));
          }
        }
      }
    });
    return types;
  }
}
