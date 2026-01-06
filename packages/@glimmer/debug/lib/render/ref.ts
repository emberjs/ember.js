import type { Reference } from '@glimmer/interfaces';
import { valueForRef } from '@glimmer/reference';

import type { Fragment } from './fragment';

import { join, value } from './basic';
import { as, frag } from './fragment';

export function describeRef(ref: Reference): Fragment {
  const debug = ref.debugLabel;

  const label = as.type(debug || '');
  const result = valueForRef(ref);

  return frag`<${as.kw('ref')} ${join([label, value(result)], ' ')}>`;
}
