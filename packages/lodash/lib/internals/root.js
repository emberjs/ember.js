/**
 * Lo-Dash 3.0.0-pre (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize exports="es6" -o ./compat/`
 * Copyright 2012-2014 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.6.0 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */

/** Used to determine if values are of the language type `Object` */
var objectTypes = {
  'function': true,
  'object': true
};

/** Used as a reference to the global object */
var root = (objectTypes[typeof window] && window) || this;

/** Detect free variable `exports` */
var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;

/** Detect free variable `module` */
var freeModule = objectTypes[typeof module] && module && !module.nodeType && module;

/** Detect free variable `global` from Node.js or Browserified code and use it as `root` */
var freeGlobal = freeExports && freeModule && typeof global == 'object' && global;
if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal || freeGlobal.self === freeGlobal)) {
  root = freeGlobal;
}

export default root;
