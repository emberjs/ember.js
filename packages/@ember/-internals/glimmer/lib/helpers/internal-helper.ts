import type { InternalOwner } from '@ember/-internals/owner';
import type { Helper, HelperDefinitionState } from '@glimmer/interfaces';
// import { setInternalHelperManager } from '@glimmer/manager';

export function internalHelper(helper: Helper<InternalOwner>): HelperDefinitionState {
  return function () {
    console.log('internal helper', this, [...arguments]);
    return helper(...arguments);
  }
}
