import type { InternalOwner } from '@ember/-internals/owner';
import type { Helper, HelperDefinitionState } from '@glimmer/interfaces';
import { setInternalHelperManager } from '@glimmer/manager/lib/internal/api';

/* @__NO_SIDE_EFFECTS__ */
export function internalHelper(helper: Helper<InternalOwner>): HelperDefinitionState {
  return setInternalHelperManager(helper, {});
}
