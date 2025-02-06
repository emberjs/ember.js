import type { InternalOwner } from '@ember/-internals/owner';
import type { Helper, HelperDefinitionState } from '@glimmer/ember/interfaces';
import { setInternalHelperManager } from '@glimmer/ember/manager';

export function internalHelper(helper: Helper<InternalOwner>): HelperDefinitionState {
  return setInternalHelperManager(helper, {});
}
