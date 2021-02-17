import { Owner } from '@ember/-internals/owner';
import { Helper, HelperDefinitionState } from '@glimmer/interfaces';
import { setInternalHelperManager } from '@glimmer/manager';

export function internalHelper(helper: Helper<Owner>): HelperDefinitionState {
  return setInternalHelperManager(helper, {});
}
