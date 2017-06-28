import {
  meta as metaFor,
  peekMeta
} from './meta';
import { ChainNode } from './chains';

// get the chains for the current object. If the current object has
// chains inherited from the proto they will be cloned and reconfigured for
// the current object.
function chainsFor(obj, meta) {
  return (meta || metaFor(obj)).writableChains(makeChainNode);
}

export function makeChainNode(obj) {
  return new ChainNode(null, null, obj);
}

export function watchPath(obj, keyPath, meta) {
  if (typeof obj !== 'object' || obj === null) { return; }
  let m = meta || metaFor(obj);
  let counter = m.peekWatching(keyPath) || 0;

  m.writeWatching(keyPath, counter + 1);
  if (counter === 0) { // activate watching first time
    chainsFor(obj, m).add(keyPath);
  }
}

export function unwatchPath(obj, keyPath, meta) {
  if (typeof obj !== 'object' || obj === null) { return; }
  let m = meta || peekMeta(obj);
  if (m === undefined) { return; }
  let counter = m.peekWatching(keyPath) || 0;

  if (counter === 1) {
    m.writeWatching(keyPath, 0);
    chainsFor(obj, m).remove(keyPath);
  } else if (counter > 1) {
    m.writeWatching(keyPath, counter - 1);
  }
}
