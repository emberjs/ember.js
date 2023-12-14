declare module '@ember/-internals/glimmer/lib/components/textarea' {
  /**
    @module @ember/component
    */
  import { type Opaque } from '@ember/-internals/utility-types';
  import { type OpaqueInternalComponentConstructor } from '@ember/-internals/glimmer/lib/components/internal';
  const Textarea: Textarea;
  interface Textarea extends Opaque<'component:textarea'>, OpaqueInternalComponentConstructor {}
  export default Textarea;
}
