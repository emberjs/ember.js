import type { Reference } from '@glimmer/reference';
import { createComputeRef, valueForRef } from '@glimmer/reference';

export function createConcatRef(partsRefs: Reference[]) {
  return createComputeRef(() => {
    const parts: string[] = [];

    for (const ref of partsRefs) {
      const value = valueForRef(ref);

      if (value !== null && value !== undefined) {
        parts.push(castToString(value));
      }
    }

    if (parts.length > 0) {
      return parts.join('');
    }

    return null;
  });
}

function castToString(value: string | object) {
  if (typeof value === 'string') {
    return value;
  } else if (typeof value.toString !== 'function') {
    return '';
  }

  return String(value);
}
