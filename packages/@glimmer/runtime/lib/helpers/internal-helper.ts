import { type Helper, type HelperDefinitionState } from '@glimmer/interfaces';
import { setInternalHelperManager } from '@glimmer/manager';

export function internalHelper(helper: Helper): HelperDefinitionState {
  return setInternalHelperManager(helper, {});
}
