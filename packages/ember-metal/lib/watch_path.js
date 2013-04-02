require('ember-metal/utils');
require('ember-metal/chains');

var metaFor = Ember.meta,
    typeOf = Ember.typeOf, // FIXME: defined in runtime
    ChainNode = Ember._ChainNode; // chains.js

// get the chains for the current object. If the current object has
// chains inherited from the proto they will be cloned and reconfigured for
// the current object.
function chainsFor(obj) {
  var m = metaFor(obj), ret = m.chains;
  if (!ret) {
    ret = m.chains = new ChainNode(null, null, obj);
  } else if (ret.value() !== obj) {
    ret = m.chains = ret.copy(obj);
  }
  return ret;
}

Ember.watchPath = function(obj, keyPath) {
  // can't watch length on Array - it is special...
  if (keyPath === 'length' && typeOf(obj) === 'array') { return; }

  var m = metaFor(obj), watching = m.watching;

  if (!watching[keyPath]) { // activate watching first time
    watching[keyPath] = 1;
    chainsFor(obj).add(keyPath);
  } else {
    watching[keyPath] = (watching[keyPath] || 0) + 1;
  }
};

Ember.unwatchPath = function(obj, keyPath) {
  var m = metaFor(obj), watching = m.watching, desc;

  if (watching[keyPath] === 1) {
    watching[keyPath] = 0;
    chainsFor(obj).remove(keyPath);
  } else if (watching[keyPath] > 1) {
    watching[keyPath]--;
  }
};