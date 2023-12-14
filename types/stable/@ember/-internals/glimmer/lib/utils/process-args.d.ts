declare module '@ember/-internals/glimmer/lib/utils/process-args' {
  import type { CapturedNamedArguments } from '@glimmer/interfaces';
  export function processComponentArgs(namedArgs: CapturedNamedArguments): any;
}
