/**
@module ember
*/
import {
  NAMESPACES,
  NAMESPACES_BY_ID,
  addNamespace,
  findNamespace,
  findNamespaces,
  get,
  processNamespace,
  processAllNamespaces,
  removeNamespace,
} from 'ember-metal'; // Preloaded into namespaces
import { getName, guidFor, setName } from 'ember-utils';
import EmberObject from './object';

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
  @namespace Ember
  @extends EmberObject
  @public
*/
export default class Namespace extends EmberObject {
  init() {
    addNamespace(this);
  }

  toString() {
    let name = get(this, 'name') || get(this, 'modulePrefix');
    if (name) {
      return name;
    }
    findNamespaces();
    name = getName(this);
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
    super.destroy();
  }
}

Namespace.prototype.isNamespace = true;
Namespace.NAMESPACES = NAMESPACES;
Namespace.NAMESPACES_BY_ID = NAMESPACES_BY_ID;
Namespace.processAll = processAllNamespaces;
Namespace.byName = findNamespace;
