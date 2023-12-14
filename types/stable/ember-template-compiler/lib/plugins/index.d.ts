declare module 'ember-template-compiler/lib/plugins' {
  import AssertReservedNamedArguments from 'ember-template-compiler/lib/plugins/assert-reserved-named-arguments';
  export const RESOLUTION_MODE_TRANSFORMS: readonly (typeof AssertReservedNamedArguments)[];
  export const STRICT_MODE_TRANSFORMS: readonly (typeof AssertReservedNamedArguments)[];
}
