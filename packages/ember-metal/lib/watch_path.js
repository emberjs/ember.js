import {
  meta as metaFor
} from 'ember-metal/utils';
import { ChainNode } from 'ember-metal/chains';

// get the chains for the current object. If the current object has
// chains inherited from the proto they will be cloned and reconfigured for
// the current object.
function chainsFor(obj, meta) {
  return (meta || metaFor(obj)).getOrCreateChains(makeChainNode);
}

function makeChainNode(obj) {
  return new ChainNode(null, null, obj);
}

export function watchPath(obj, keyPath, meta) {
  // can't watch length on Array - it is special...
  if (keyPath === 'length' && Array.isArray(obj)) { return; }

  var m = meta || metaFor(obj);
  var watching = m.getOrCreateWatching();

  if (!watching[keyPath]) { // activate watching first time
    watching[keyPath] = 1;
    chainsFor(obj, m).add(keyPath);
  } else {
    watching[keyPath] = (watching[keyPath] || 0) + 1;
  }
}

export function unwatchPath(obj, keyPath, meta) {
  var m = meta || metaFor(obj);
  var watching = m.getOrCreateWatching();

  if (watching[keyPath] === 1) {
    watching[keyPath] = 0;
    chainsFor(obj, m).remove(keyPath);
  } else if (watching[keyPath] > 1) {
    watching[keyPath]--;
  }
}
