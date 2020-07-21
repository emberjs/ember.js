import { Reference, createComputeRef, valueForRef } from '@glimmer/reference';

import { normalizeStringValue } from '../dom/normalize';

export default function createClassListRef(list: Reference[]) {
  return createComputeRef(() => {
    let ret: string[] = [];

    for (let i = 0; i < list.length; i++) {
      let ref = list[i];
      let value = normalizeStringValue(typeof ref === 'string' ? ref : valueForRef(list[i]));
      if (value) ret.push(value);
    }

    return ret.length === 0 ? null : ret.join(' ');
  });
}
