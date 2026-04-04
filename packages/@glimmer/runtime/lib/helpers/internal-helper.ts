import type { Helper, HelperDefinitionState } from '@glimmer/interfaces';
import { setInternalHelperManager } from '@glimmer/manager/lib/internal/api';

export function internalHelper(helper: Helper): HelperDefinitionState {
  return setInternalHelperManager(helper, {});
}
