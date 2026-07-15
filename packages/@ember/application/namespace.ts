/**
@module @ember/application/namespace
*/

import {
  NAMESPACES,
  NAMESPACES_BY_ID,
  addNamespace,
  findNamespace,
  findNamespaces,
  processNamespace,
  processAllNamespaces,
  removeNamespace,
  type Namespace as MetalNamespace,
} from '@ember/-internals/metal/lib/namespace_search'; // Preloaded into namespaces
import { get } from '@ember/-internals/metal/lib/property_get';
import { getName, setName } from '@ember/-internals/utils/lib/name';
import { guidFor } from '@ember/-internals/utils/lib/guid';
import { assert } from '@ember/debug';
import { FrameworkObject } from '@ember/object/-internals';

/**
  A Namespace is an object usually used to contain other objects or methods
  such as an application or framework. Create a namespace anytime you want
  to define one of these new containers.

  ## Example Usage

  ```javascript
  import Namespace from '@ember/application/namespace';
  MyFramework = Namespace.create({
    VERSION: '1.0.0'
  });
  ```

  @class Namespace
  @extends EmberObject
  @public
*/
class Namespace extends FrameworkObject {
  static NAMESPACES: MetalNamespace[] = NAMESPACES;
  static NAMESPACES_BY_ID: { [name: string]: MetalNamespace } = NAMESPACES_BY_ID;
  static processAll = processAllNamespaces;
  static byName = findNamespace;

  declare isNamespace: true;

  init(properties: object | undefined) {
    super.init(properties);
    addNamespace(this);
  }

  toString(): string {
    let existing_name = get(this, 'name') || get(this, 'modulePrefix');
    if (existing_name) {
      assert("name wasn't a string", typeof existing_name === 'string');
      return existing_name;
    }
    findNamespaces();
    let name = getName(this);
    if (name === undefined) {
      name = guidFor(this);
      setName(this, name);
    }
    return name;
  }

  nameClasses() {
    processNamespace(this);
  }

  destroy() {
    removeNamespace(this);
    return super.destroy();
  }
}

// Declare on the prototype to have a single shared value.
Namespace.prototype.isNamespace = true;

export default Namespace;
