declare module '@ember/modifier' {
  import type { Opaque } from '@ember/-internals/utility-types';
  import type Owner from '@ember/owner';
  import type { ModifierManager } from '@glimmer/interfaces';
  export interface OnModifier extends Opaque<'modifier:on'> {}
  export const on: OnModifier;
  export const setModifierManager: <T extends object>(
    factory: (owner: Owner) => ModifierManager<unknown>,
    modifier: T
  ) => T;
  export type { ModifierManager };
  export type { ModifierCapabilities } from '@glimmer/interfaces';
  export { modifierCapabilities as capabilities } from '@ember/-internals/glimmer';
}
