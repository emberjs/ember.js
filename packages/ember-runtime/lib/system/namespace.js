require('ember-runtime/system/object');

/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get, indexOf = Ember.ArrayPolyfills.indexOf;

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
*/
var Namespace = Ember.Namespace = Ember.Object.extend({
  isNamespace: true,

  init: function() {
    Ember.Namespace.NAMESPACES.push(this);
    Ember.Namespace.PROCESSED = false;
  },

  toString: function() {
    var name = get(this, 'name');
    if (name) { return name; }

    findNamespaces();
    return this[Ember.GUID_KEY+'_name'];
  },

  nameClasses: function() {
    processNamespace([this.toString()], this, {});
  },

  destroy: function() {
    var namespaces = Ember.Namespace.NAMESPACES;
    Ember.lookup[this.toString()] = undefined;
    namespaces.splice(indexOf.call(namespaces, this), 1);
    this._super();
  }
});

Namespace.reopenClass({
  NAMESPACES: [Ember],
  NAMESPACES_BY_ID: {},
  PROCESSED: false,
  processAll: processAllNamespaces,
  byName: function(name) {
    if (!Ember.BOOTED) {
      processAllNamespaces();
    }

    return NAMESPACES_BY_ID[name];
  }
});

var NAMESPACES_BY_ID = Namespace.NAMESPACES_BY_ID;

var hasOwnProp = ({}).hasOwnProperty,
    guidFor = Ember.guidFor;

function processNamespace(paths, root, seen) {
  var idx = paths.length;

  NAMESPACES_BY_ID[paths.join('.')] = root;

  // Loop over all of the keys in the namespace, looking for classes
  for(var key in root) {
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

function findNamespaces() {
  var Namespace = Ember.Namespace, lookup = Ember.lookup, obj, isNamespace;

  if (Namespace.PROCESSED) { return; }

  for (var prop in lookup) {
    // These don't raise exceptions but can cause warnings
    if (prop === "parent" || prop === "top" || prop === "frameElement" || prop === "webkitStorageInfo") { continue; }

    //  get(window.globalStorage, 'isNamespace') would try to read the storage for domain isNamespace and cause exception in Firefox.
    // globalStorage is a storage obsoleted by the WhatWG storage specification. See https://developer.mozilla.org/en/DOM/Storage#globalStorage
    if (prop === "globalStorage" && lookup.StorageList && lookup.globalStorage instanceof lookup.StorageList) { continue; }
    // Unfortunately, some versions of IE don't support window.hasOwnProperty
    if (lookup.hasOwnProperty && !lookup.hasOwnProperty(prop)) { continue; }

    // At times we are not allowed to access certain properties for security reasons.
    // There are also times where even if we can access them, we are not allowed to access their properties.
    try {
      obj = Ember.lookup[prop];
      isNamespace = obj && obj.isNamespace;
    } catch (e) {
      continue;
    }

    if (isNamespace) {
      Ember.deprecate("Namespaces should not begin with lowercase.", /^[A-Z]/.test(prop));
      obj[NAME_KEY] = prop;
    }
  }
}

var NAME_KEY = Ember.NAME_KEY = Ember.GUID_KEY + '_name';

function superClassString(mixin) {
  var superclass = mixin.superclass;
  if (superclass) {
    if (superclass[NAME_KEY]) { return superclass[NAME_KEY]; }
    else { return superClassString(superclass); }
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
  } else {
    var str = superClassString(this);
    if (str) {
      ret = "(subclass of " + str + ")";
    } else {
      ret = "(unknown mixin)";
    }
    this.toString = makeToString(ret);
  }

  return ret;
}

function processAllNamespaces() {
  var unprocessedNamespaces = !Namespace.PROCESSED,
      unprocessedMixins = Ember.anyUnprocessedMixins;

  if (unprocessedNamespaces) {
    findNamespaces();
    Namespace.PROCESSED = true;
  }

  if (unprocessedNamespaces || unprocessedMixins) {
    var namespaces = Namespace.NAMESPACES, namespace;
    for (var i=0, l=namespaces.length; i<l; i++) {
      namespace = namespaces[i];
      processNamespace([namespace.toString()], namespace, {});
    }

    Ember.anyUnprocessedMixins = false;
  }
}

function makeToString(ret) {
  return function() { return ret; };
}

Ember.Mixin.prototype.toString = classToString;
