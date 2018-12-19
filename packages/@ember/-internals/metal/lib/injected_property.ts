import { descriptorFor } from '@ember/-internals/meta';
import { getOwner } from '@ember/-internals/owner';
import { EMBER_MODULE_UNIFICATION } from '@ember/canary-features';
import { assert } from '@ember/debug';
import { ComputedProperty } from './computed';

export interface InjectedPropertyOptions {
  source: string;
}

/**
 @module ember
 @private
 */

/**
  Read-only property that returns the result of a container lookup.

  @class InjectedProperty
  @namespace Ember
  @constructor
  @param {String} type The container type the property will lookup
  @param {String} name (optional) The name the property will lookup, defaults
         to the property's name
  @private
*/
export default class InjectedProperty extends ComputedProperty {
  readonly type: string;
  readonly name: string;
  readonly source: string | undefined;
  readonly namespace: string | undefined;

  constructor(type: string, name: string, options?: InjectedPropertyOptions) {
    super(injectedPropertyGet);

    this.type = type;
    this.name = name;

    if (EMBER_MODULE_UNIFICATION) {
      this.source = options ? options.source : undefined;
      this.namespace = undefined;

      if (name) {
        let namespaceDelimiterOffset = name.indexOf('::');
        if (namespaceDelimiterOffset === -1) {
          this.name = name;
          this.namespace = undefined;
        } else {
          this.name = name.slice(namespaceDelimiterOffset + 2);
          this.namespace = name.slice(0, namespaceDelimiterOffset);
        }
      }
    }
  }
}

function injectedPropertyGet(this: any, keyName: string): any {
  let desc = descriptorFor(this, keyName);
  let owner = getOwner(this) || this.container; // fallback to `container` for backwards compat

  assert(
    `InjectedProperties should be defined with the inject computed property macros.`,
    desc && desc.type
  );
  assert(
    `Attempting to lookup an injected property on an object without a container, ensure that the object was instantiated via a container.`,
    Boolean(owner)
  );

  let specifier = `${desc.type}:${desc.name || keyName}`;
  return owner.lookup(specifier, {
    source: desc.source,
    namespace: desc.namespace,
  });
}
