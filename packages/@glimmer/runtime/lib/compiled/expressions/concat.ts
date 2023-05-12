import type { Dict, Maybe } from "@glimmer/interfaces";
import { createComputeRef, type Reference, valueForRef } from '@glimmer/reference';
import { enumerate } from '@glimmer/util';

export function createConcatRef(partsRefs: Reference[]) {
  return createComputeRef(() => {
    let parts = new Array<string>();

    for (const [i, ref] of enumerate(partsRefs)) {
      let value = valueForRef(ref) as Maybe<Dict>;

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
