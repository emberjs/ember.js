declare module '@ember/-internals/utils/lib/mandatory-setter' {
  import type { Tag } from '@glimmer/validator';
  export let setupMandatorySetter:
    | ((tag: Tag, obj: object, keyName: string | symbol) => void)
    | undefined;
  export let teardownMandatorySetter: ((obj: object, keyName: string | symbol) => void) | undefined;
  export let setWithMandatorySetter:
    | ((obj: object, keyName: string, value: any) => void)
    | undefined;
}
