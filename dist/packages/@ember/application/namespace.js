/**
@module @ember/application/namespace
*/
import { NAMESPACES, NAMESPACES_BY_ID, addNamespace, findNamespace, findNamespaces, processNamespace, processAllNamespaces, removeNamespace } from '@ember/-internals/metal'; // Preloaded into namespaces
import { get } from '@ember/object';
import { getName, guidFor, setName } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import EmberObject from '@ember/object';
/**
  A Namespace is an object usually used to contain other objects or methods
  such as an application or framework. Create a namespace anytime you want
  to define one of these new containers.

  # Example Usage

  ```javascript
  MyFramework = Ember.Namespace.create({
    VERSION: '1.0.0'
  });
  ```

  @class Namespace
  @extends EmberObject
  @public
*/
class Namespace extends EmberObject {
  init(properties) {
    super.init(properties);
    addNamespace(this);
  }
  toString() {
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
Namespace.NAMESPACES = NAMESPACES;
Namespace.NAMESPACES_BY_ID = NAMESPACES_BY_ID;
Namespace.processAll = processAllNamespaces;
Namespace.byName = findNamespace;
// Declare on the prototype to have a single shared value.
Namespace.prototype.isNamespace = true;
export default Namespace;