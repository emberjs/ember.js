import { Helper, HelperDefinitionState } from '@glimmer/interfaces';
import { setInternalHelperManager } from '@glimmer/manager';

export function internalHelper(helper: Helper): HelperDefinitionState {
  return setInternalHelperManager(() => helper, {});
}
