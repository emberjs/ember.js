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
import { getName } from 'ember-utils';
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
const Namespace = EmberObject.extend({
  isNamespace: true,

  init() {
    addNamespace(this);
  },

  toString() {
    let name = get(this, 'name') || get(this, 'modulePrefix');
    if (name) {
      return name;
    }

    findNamespaces();
    return getName(this);
  },

  nameClasses() {
    processNamespace(this);
  },

  destroy() {
    removeNamespace(this);
    this._super(...arguments);
  },
});

Namespace.reopenClass({
  NAMESPACES,
  NAMESPACES_BY_ID,
  processAll: processAllNamespaces,
  byName: findNamespace,
});

export default Namespace;
