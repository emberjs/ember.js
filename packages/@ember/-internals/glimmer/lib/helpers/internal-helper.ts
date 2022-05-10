import type { Owner } from '@ember/-internals/owner';
import type { Helper, HelperDefinitionState } from '@glimmer/interfaces';
import { setInternalHelperManager } from '@glimmer/manager';

export function internalHelper(helper: Helper<Owner>): HelperDefinitionState {
  return setInternalHelperManager(helper, {});
}
