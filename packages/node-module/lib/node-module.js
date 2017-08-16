enifed('node-module', ['exports'], function(_exports) {
  var IS_NODE = typeof module === 'object' && typeof module.require === 'function';
  if (IS_NODE) {
    _exports.require = module.require;
    _exports.module = module;
    _exports.IS_NODE = IS_NODE
  } else {
    _exports.require = null;
    _exports.module = null;
    _exports.IS_NODE = IS_NODE
  }
});
