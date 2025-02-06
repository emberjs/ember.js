import { setModifierManager as glimmerSetModifierManager } from '@glimmer/ember/manager';

import type Owner from '@ember/owner';
import type { ModifierManager } from '@glimmer/ember/interfaces';

export { on, type OnModifier } from './on';

// NOTE: this uses assignment to *require* that the `glimmerSetModifierManager`
// is legally assignable to this type, i.e. that variance is properly upheld.
export const setModifierManager: <T extends object>(
  factory: (owner: Owner) => ModifierManager<unknown>,
  modifier: T
) => T = glimmerSetModifierManager;

export type { ModifierManager };

export type { ModifierCapabilities } from '@glimmer/ember/interfaces';
export { modifierCapabilities as capabilities } from '@ember/-internals/glimmer';
