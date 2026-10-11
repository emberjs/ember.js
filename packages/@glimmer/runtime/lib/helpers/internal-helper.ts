import type { Helper, HelperDefinitionState } from '@glimmer/interfaces';
import { setInternalHelperManager } from '@glimmer/manager/lib/internal/api';

const INTERNAL_HELPERS = new WeakSet<object>();

export function internalHelper(helper: Helper): HelperDefinitionState {
  INTERNAL_HELPERS.add(helper);
  return setInternalHelperManager(helper, {});
}

/**
 * VM-internal helpers (`fn`, `hash`, `array`, …) are implementation details
 * of the templating language rather than user-observable invocations, so
 * debug tooling (e.g. the debug render tree) leaves them out.
 */
export function isInternalHelper(helper: object): boolean {
  return INTERNAL_HELPERS.has(helper);
}
