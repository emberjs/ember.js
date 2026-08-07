import type { CapturedArguments } from '@glimmer/interfaces';
import { getPath, setPath } from '@glimmer/global-context';
import {
  createComputeRef,
  UNDEFINED_REFERENCE,
  valueForRef,
} from '@glimmer/reference/lib/reference';
import { isDict } from '@glimmer/util/lib/collections';

import { internalHelper } from './internal-helper';

export const get = internalHelper(({ positional }: CapturedArguments) => {
  let sourceRef = positional[0] ?? UNDEFINED_REFERENCE;
  let pathRef = positional[1] ?? UNDEFINED_REFERENCE;

  return createComputeRef(
    () => {
      let source = valueForRef(sourceRef);

      if (isDict(source)) {
        return getPath(source, String(valueForRef(pathRef)));
      }
    },
    (value) => {
      let source = valueForRef(sourceRef);

      if (isDict(source)) {
        return setPath(source, String(valueForRef(pathRef)), value);
      }
    },
    'get'
  );
});
