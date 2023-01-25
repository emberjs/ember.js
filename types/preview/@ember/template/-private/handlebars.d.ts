declare module '@ember/template/-private/handlebars' {
  import { SafeString } from '@glimmer/runtime';
  import { Opaque } from 'ember/-private/type-utils';

  class _TrustedString implements SafeString {
    constructor(str: string);
    private toString(): string;
    toHTML(): string;
  }

  export interface TrustedString extends _TrustedString, Opaque<'@ember/template:SafeString'> {}
}
