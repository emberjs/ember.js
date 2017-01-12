/**
@module ember
@submodule ember-runtime
*/
import { guidFor } from 'ember-utils';
import Ember, {
  get,
  Mixin,
  hasUnprocessedMixins,
  clearUnprocessedMixins,
} from 'ember-metal'; // Preloaded into namespaces
import { context } from 'ember-environment';
import { NAME_KEY } from 'ember-utils';
import EmberObject from './object';

let searchDisabled = false;

export function isSearchDisabled() {
  return searchDisabled;
}

export function setSearchDisabled(flag) {
  searchDisabled = !!flag;
}

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
  @extends Ember.Object
  @public
*/
const Namespace = EmberObject.extend({
  isNamespace: true,

  init() {
    Namespace.NAMESPACES.push(this);
    Namespace.PROCESSED = false;
  },

  toString() {
    let name = get(this, 'name') || get(this, 'modulePrefix');
    if (name) { return name; }

    findNamespaces();
    return this[NAME_KEY];
  },

  nameClasses() {
    processNamespace([this.toString()], this, {});
  },

  destroy() {
    let namespaces = Namespace.NAMESPACES;
    let toString = this.toString();

    if (toString) {
      context.lookup[toString] = undefined;
      delete Namespace.NAMESPACES_BY_ID[toString];
    }
    namespaces.splice(namespaces.indexOf(this), 1);
    this._super(...arguments);
  }
});

Namespace.reopenClass({
  NAMESPACES: [Ember],
  NAMESPACES_BY_ID: {
    Ember
  },
  PROCESSED: false,
  processAll: processAllNamespaces,
  byName(name) {
    if (!searchDisabled) {
      processAllNamespaces();
    }

    return NAMESPACES_BY_ID[name];
  }
});

let NAMESPACES_BY_ID = Namespace.NAMESPACES_BY_ID;

let hasOwnProp = ({}).hasOwnProperty;

function processNamespace(paths, root, seen) {
  let idx = paths.length;

  NAMESPACES_BY_ID[paths.join('.')] = root;

  // Loop over all of the keys in the namespace, looking for classes
  for (let key in root) {
    if (!hasOwnProp.call(root, key)) { continue; }
    let obj = root[key];

    // If we are processing the `Ember` namespace, for example, the
    // `paths` will start with `["Ember"]`. Every iteration through
    // the loop will update the **second** element of this list with
    // the key, so processing `Ember.View` will make the Array
    // `['Ember', 'View']`.
    paths[idx] = key;

    // If we have found an unprocessed class
    if (obj && obj.toString === classToString && !obj[NAME_KEY]) {
      // Replace the class' `toString` with the dot-separated path
      // and set its `NAME_KEY`
      obj[NAME_KEY] = paths.join('.');

    // Support nested namespaces
    } else if (obj && obj.isNamespace) {
      // Skip aliased namespaces
      if (seen[guidFor(obj)]) { continue; }
      seen[guidFor(obj)] = true;

      // Process the child namespace
      processNamespace(paths, obj, seen);
    }
  }

  paths.length = idx; // cut out last item
}

function isUppercase(code) {
  return code >= 65 && // A
         code <= 90;   // Z
}

function tryIsNamespace(lookup, prop) {
  try {
    let obj = lookup[prop];
    return obj && obj.isNamespace && obj;
  } catch (e) {
    // continue
  }
}

function findNamespaces() {
  if (Namespace.PROCESSED) {
    return;
  }
  let lookup = context.lookup;
  let keys = Object.keys(lookup);
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    // Only process entities that start with uppercase A-Z
    if (!isUppercase(key.charCodeAt(0))) {
      continue;
    }
    let obj = tryIsNamespace(lookup, key);
    if (obj) {
      obj[NAME_KEY] = key;
    }
  }
}

function superClassString(mixin) {
  let superclass = mixin.superclass;
  if (superclass) {
    if (superclass[NAME_KEY]) {
      return superclass[NAME_KEY];
    }
    return superClassString(superclass);
  }
}

function calculateToString(target) {
  let str;

  if (!searchDisabled) {
    processAllNamespaces();
    // can also be set by processAllNamespaces
    str = target[NAME_KEY];
    if (str) {
      return str;
    } else {
      str = superClassString(target);
      str = str ? `(subclass of ${str})` : str;
    }
  }
  if (str) {
    return str;
  } else {
    return '(unknown mixin)';
  }
}

function classToString() {
  let name = this[NAME_KEY];
  if (name) { return name; }

  return (this[NAME_KEY] = calculateToString(this));
}

function processAllNamespaces() {
  let unprocessedNamespaces = !Namespace.PROCESSED;
  let unprocessedMixins = hasUnprocessedMixins();

  if (unprocessedNamespaces) {
    findNamespaces();
    Namespace.PROCESSED = true;
  }

  if (unprocessedNamespaces || unprocessedMixins) {
    let namespaces = Namespace.NAMESPACES;
    let namespace;

    for (let i = 0; i < namespaces.length; i++) {
      namespace = namespaces[i];
      processNamespace([namespace.toString()], namespace, {});
    }

    clearUnprocessedMixins();
  }
}

Mixin.prototype.toString = classToString; // ES6TODO: altering imported objects. SBB.

export default Namespace;
