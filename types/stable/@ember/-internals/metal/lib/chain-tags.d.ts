declare module '@ember/-internals/metal/lib/chain-tags' {
  import type { Meta } from '@ember/-internals/meta';
  import type { Tag, TagMeta } from '@glimmer/validator';
  export const CHAIN_PASS_THROUGH: WeakSet<object>;
  export function finishLazyChains(meta: Meta, key: string, value: any): void;
  export function getChainTagsForKeys(
    obj: object,
    keys: string[],
    tagMeta: TagMeta,
    meta: Meta | null
  ): Tag;
  export function getChainTagsForKey(
    obj: object,
    key: string,
    tagMeta: TagMeta,
    meta: Meta | null
  ): Tag;
}
