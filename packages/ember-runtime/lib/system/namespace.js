/**
@module ember
@submodule ember-runtime
*/

// Ember.lookup, Ember.BOOTED, Ember.NAME_KEY, Ember.anyUnprocessedMixins
import Ember from 'ember-metal/core';
import { get } from 'ember-metal/property_get';
import {
  GUID_KEY,
  guidFor
} from 'ember-metal/utils';
import { Mixin } from 'ember-metal/mixin';

import EmberObject from 'ember-runtime/system/object';

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
var Namespace = EmberObject.extend({
  isNamespace: true,

  init() {
    Namespace.NAMESPACES.push(this);
    Namespace.PROCESSED = false;
  },

  toString() {
    var name = get(this, 'name') || get(this, 'modulePrefix');
    if (name) { return name; }

    findNamespaces();
    return this[NAME_KEY];
  },

  nameClasses() {
    processNamespace([this.toString()], this, {});
  },

  destroy() {
    var namespaces = Namespace.NAMESPACES;
    var toString = this.toString();

    if (toString) {
      Ember.lookup[toString] = undefined;
      delete Namespace.NAMESPACES_BY_ID[toString];
    }
    namespaces.splice(namespaces.indexOf(this), 1);
    this._super(...arguments);
  }
});

Namespace.reopenClass({
  NAMESPACES: [Ember],
  NAMESPACES_BY_ID: {},
  PROCESSED: false,
  processAll: processAllNamespaces,
  byName(name) {
    if (!Ember.BOOTED) {
      processAllNamespaces();
    }

    return NAMESPACES_BY_ID[name];
  }
});

var NAMESPACES_BY_ID = Namespace.NAMESPACES_BY_ID;

var hasOwnProp = ({}).hasOwnProperty;

function processNamespace(paths, root, seen) {
  var idx = paths.length;

  NAMESPACES_BY_ID[paths.join('.')] = root;

  // Loop over all of the keys in the namespace, looking for classes
  for (var key in root) {
    if (!hasOwnProp.call(root, key)) { continue; }
    var obj = root[key];

    // If we are processing the `Ember` namespace, for example, the
    // `paths` will start with `["Ember"]`. Every iteration through
    // the loop will update the **second** element of this list with
    // the key, so processing `Ember.View` will make the Array
    // `['Ember', 'View']`.
    paths[idx] = key;

    // If we have found an unprocessed class
    if (obj && obj.toString === classToString) {
      // Replace the class' `toString` with the dot-separated path
      // and set its `NAME_KEY`
      obj.toString = makeToString(paths.join('.'));
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

var STARTS_WITH_UPPERCASE = /^[A-Z]/;

function tryIsNamespace(lookup, prop) {
  try {
    var obj = lookup[prop];
    return obj && obj.isNamespace && obj;
  } catch (e) {
    // continue
  }
}

function findNamespaces() {
  var lookup = Ember.lookup;
  var obj;

  if (Namespace.PROCESSED) { return; }

  for (var prop in lookup) {
    // Only process entities that start with uppercase A-Z
    if (!STARTS_WITH_UPPERCASE.test(prop)) { continue; }

    // Unfortunately, some versions of IE don't support window.hasOwnProperty
    if (lookup.hasOwnProperty && !lookup.hasOwnProperty(prop)) { continue; }

    // At times we are not allowed to access certain properties for security reasons.
    // There are also times where even if we can access them, we are not allowed to access their properties.
    obj = tryIsNamespace(lookup, prop);
    if (obj) {
      obj[NAME_KEY] = prop;
    }
  }
}

var NAME_KEY = Ember.NAME_KEY = GUID_KEY + '_name';

function superClassString(mixin) {
  var superclass = mixin.superclass;
  if (superclass) {
    if (superclass[NAME_KEY]) {
      return superclass[NAME_KEY];
    } else {
      return superClassString(superclass);
    }
  } else {
    return;
  }
}

function classToString() {
  if (!Ember.BOOTED && !this[NAME_KEY]) {
    processAllNamespaces();
  }

  var ret;

  if (this[NAME_KEY]) {
    ret = this[NAME_KEY];
  } else if (this._toString) {
    ret = this._toString;
  } else {
    var str = superClassString(this);
    if (str) {
      ret = '(subclass of ' + str + ')';
    } else {
      ret = '(unknown mixin)';
    }
    this.toString = makeToString(ret);
  }

  return ret;
}

function processAllNamespaces() {
  var unprocessedNamespaces = !Namespace.PROCESSED;
  var unprocessedMixins = Ember.anyUnprocessedMixins;

  if (unprocessedNamespaces) {
    findNamespaces();
    Namespace.PROCESSED = true;
  }

  if (unprocessedNamespaces || unprocessedMixins) {
    var namespaces = Namespace.NAMESPACES;
    var namespace;

    for (var i = 0, l = namespaces.length; i < l; i++) {
      namespace = namespaces[i];
      processNamespace([namespace.toString()], namespace, {});
    }

    Ember.anyUnprocessedMixins = false;
  }
}

function makeToString(ret) {
  return function() { return ret; };
}

Mixin.prototype.toString = classToString; // ES6TODO: altering imported objects. SBB.

export default Namespace;
