declare module '@ember/-internals/metal/lib/tags' {
  import type { Tag, TagMeta } from '@glimmer/validator';
  export const SELF_TAG: string | symbol;
  export function tagForProperty(
    obj: object,
    propertyKey: string | symbol,
    addMandatorySetter?: boolean,
    meta?: TagMeta
  ): Tag;
  export function tagForObject(obj: unknown | null): Tag;
  export function markObjectAsDirty(obj: object, propertyKey: string): void;
}
