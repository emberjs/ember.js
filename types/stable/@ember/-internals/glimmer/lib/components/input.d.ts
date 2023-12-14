declare module '@ember/-internals/glimmer/lib/components/input' {
  import { type Opaque } from '@ember/-internals/utility-types';
  import { type OpaqueInternalComponentConstructor } from '@ember/-internals/glimmer/lib/components/internal';
  const Input: Input;
  interface Input extends Opaque<'component:input'>, OpaqueInternalComponentConstructor {}
  export default Input;
}
