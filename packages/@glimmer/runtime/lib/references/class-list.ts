import { createComputeRef, type Reference, valueForRef } from '@glimmer/reference';

import { normalizeStringValue } from '../dom/normalize';

export default function createClassListRef(list: Reference[]) {
  return createComputeRef(() => {
    let ret: string[] = [];

    for (const ref of list) {
      let value = normalizeStringValue(typeof ref === 'string' ? ref : valueForRef(ref));
      if (value) ret.push(value);
    }

    return ret.length === 0 ? null : ret.join(' ');
  });
}
