import {
  meta as metaFor
} from 'ember-metal/meta';
import { ChainNode } from 'ember-metal/chains';

// get the chains for the current object. If the current object has
// chains inherited from the proto they will be cloned and reconfigured for
// the current object.
function chainsFor(obj, meta) {
  return (meta || metaFor(obj)).writableChains(makeChainNode);
}

function makeChainNode(obj) {
  return new ChainNode(null, null, obj);
}

export function watchPath(obj, keyPath, meta) {
  // can't watch length on Array - it is special...
  if (keyPath === 'length' && Array.isArray(obj)) { return; }

  var m = meta || metaFor(obj);
  let counter = m.peekWatching(keyPath) || 0;
  if (!counter) { // activate watching first time
    m.writeWatching(keyPath, 1);
    chainsFor(obj, m).add(keyPath);
  } else {
    m.writeWatching(keyPath, counter + 1);
  }
}

export function unwatchPath(obj, keyPath, meta) {
  var m = meta || metaFor(obj);
  let counter = m.peekWatching(keyPath) || 0;

  if (counter === 1) {
    m.writeWatching(keyPath, 0);
    chainsFor(obj, m).remove(keyPath);
  } else if (counter > 1) {
    m.writeWatching(keyPath, counter - 1);
  }
}
