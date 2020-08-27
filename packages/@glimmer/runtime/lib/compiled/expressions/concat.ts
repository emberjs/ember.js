import { Dict, Maybe } from '@glimmer/interfaces';
import { Reference, valueForRef, createComputeRef } from '@glimmer/reference';

export function createConcatRef(partsRefs: Reference[]) {
  return createComputeRef(() => {
    let parts = new Array<string>();

    for (let i = 0; i < partsRefs.length; i++) {
      let value = valueForRef(partsRefs[i]) as Maybe<Dict>;

      if (value !== null && value !== undefined) {
        parts[i] = castToString(value);
      }
    }

    if (parts.length > 0) {
      return parts.join('');
    }

    return null;
  });
}

function castToString(value: Dict) {
  if (typeof value.toString !== 'function') {
    return '';
  }

  return String(value);
}
